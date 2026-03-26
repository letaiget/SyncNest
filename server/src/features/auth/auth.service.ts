import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { db } from "../../db/sqlite.js";

type UserRow = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  email_verified: number;
  created_at: string;
};

type RegistrationCodeRow = {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function addMinutesIso(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

const ACCESS_TOKEN_TTL_MINUTES = 15;
const REFRESH_TOKEN_TTL_DAYS = 30;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, savedHex] = storedHash.split(":");
  if (!salt || !savedHex) {
    return false;
  }
  const derived = scryptSync(password, salt, 64);
  const saved = Buffer.from(savedHex, "hex");
  if (derived.length !== saved.length) {
    return false;
  }
  return timingSafeEqual(derived, saved);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

const findUserByUsernameStmt = db.prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
const findUserByEmailStmt = db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
const deletePendingCodesByEmailStmt = db.prepare(
  "DELETE FROM email_verification_codes WHERE email = ? AND used_at IS NULL"
);
const insertVerificationCodeStmt = db.prepare(`
  INSERT INTO email_verification_codes (id, email, username, password_hash, code, expires_at, used_at, created_at)
  VALUES (@id, @email, @username, @password_hash, @code, @expires_at, NULL, @created_at)
`);
const findValidCodeStmt = db.prepare(`
  SELECT * FROM email_verification_codes
  WHERE email = ? AND code = ? AND used_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
`);
const markCodeUsedStmt = db.prepare(
  "UPDATE email_verification_codes SET used_at = ? WHERE id = ?"
);
const insertUserStmt = db.prepare(`
  INSERT INTO users (id, username, email, password_hash, email_verified, created_at)
  VALUES (@id, @username, @email, @password_hash, @email_verified, @created_at)
`);
const insertSessionStmt = db.prepare(`
  INSERT INTO sessions (id, user_id, token_hash, expires_at, revoked_at, created_at)
  VALUES (@id, @user_id, @token_hash, @expires_at, NULL, @created_at)
`);
const insertAccessTokenStmt = db.prepare(`
  INSERT INTO access_tokens (id, session_id, user_id, token_hash, expires_at, revoked_at, created_at)
  VALUES (@id, @session_id, @user_id, @token_hash, @expires_at, NULL, @created_at)
`);
const findSessionByRefreshTokenStmt = db.prepare(`
  SELECT s.id as session_id, s.user_id, s.expires_at, s.revoked_at
  FROM sessions s
  WHERE s.token_hash = ?
  LIMIT 1
`);
const findUserByIdStmt = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
const findByAccessTokenStmt = db.prepare(`
  SELECT at.id as access_token_id, at.session_id, at.expires_at as access_expires_at, at.revoked_at as access_revoked_at,
         s.expires_at as session_expires_at, s.revoked_at as session_revoked_at,
         u.id, u.username, u.email, u.email_verified
  FROM access_tokens at
  JOIN sessions s ON s.id = at.session_id
  JOIN users u ON u.id = s.user_id
  WHERE at.token_hash = ?
  LIMIT 1
`);
const revokeSessionByIdStmt = db.prepare(`
  UPDATE sessions
  SET revoked_at = @revoked_at
  WHERE id = @id AND revoked_at IS NULL
`);
const revokeAccessTokenByTokenStmt = db.prepare(`
  UPDATE access_tokens
  SET revoked_at = @revoked_at
  WHERE token_hash = @token_hash AND revoked_at IS NULL
`);
const revokeAccessTokensBySessionStmt = db.prepare(`
  UPDATE access_tokens
  SET revoked_at = @revoked_at
  WHERE session_id = @session_id AND revoked_at IS NULL
`);
const revokeAllSessionsByUserStmt = db.prepare(`
  UPDATE sessions
  SET revoked_at = @revoked_at
  WHERE user_id = @user_id AND revoked_at IS NULL
`);
const revokeAllAccessTokensByUserStmt = db.prepare(`
  UPDATE access_tokens
  SET revoked_at = @revoked_at
  WHERE user_id = @user_id AND revoked_at IS NULL
`);

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export function requestRegistrationCode(input: {
  username: string;
  email: string;
  password: string;
}): { expiresAt: string; verificationCode: string } {
  const existingByUsername = findUserByUsernameStmt.get(input.username) as UserRow | undefined;
  if (existingByUsername) {
    throw new AuthError("Username is already taken", 409);
  }

  const existingByEmail = findUserByEmailStmt.get(input.email) as UserRow | undefined;
  if (existingByEmail) {
    throw new AuthError("Email is already registered", 409);
  }

  const verificationCode = generateCode();
  const createdAt = nowIso();
  const expiresAt = addMinutesIso(15);

  const passwordHash = hashPassword(input.password);

  const transaction = db.transaction(() => {
    deletePendingCodesByEmailStmt.run(input.email);
    insertVerificationCodeStmt.run({
      id: randomUUID(),
      email: input.email,
      username: input.username,
      password_hash: passwordHash,
      code: verificationCode,
      expires_at: expiresAt,
      created_at: createdAt,
    });
  });

  transaction();

  return {
    expiresAt,
    verificationCode,
  };
}

export function confirmRegistration(input: {
  email: string;
  code: string;
}): { userId: string; username: string; email: string } {
  const verification = findValidCodeStmt.get(input.email, input.code) as RegistrationCodeRow | undefined;

  if (!verification) {
    throw new AuthError("Invalid verification code", 400);
  }

  if (new Date(verification.expires_at).getTime() < Date.now()) {
    throw new AuthError("Verification code expired", 400);
  }

  const usernameConflict = findUserByUsernameStmt.get(verification.username) as UserRow | undefined;
  if (usernameConflict) {
    throw new AuthError("Username is already taken", 409);
  }

  const emailConflict = findUserByEmailStmt.get(verification.email) as UserRow | undefined;
  if (emailConflict) {
    throw new AuthError("Email is already registered", 409);
  }

  const userId = randomUUID();
  const createdAt = nowIso();

  const transaction = db.transaction(() => {
    insertUserStmt.run({
      id: userId,
      username: verification.username,
      email: verification.email,
      password_hash: verification.password_hash,
      email_verified: 1,
      created_at: createdAt,
    });
    markCodeUsedStmt.run(createdAt, verification.id);
  });

  transaction();

  return {
    userId,
    username: verification.username,
    email: verification.email,
  };
}

export function login(input: {
  username: string;
  password: string;
}): {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: { id: string; username: string; email: string };
} {
  const user = findUserByUsernameStmt.get(input.username) as UserRow | undefined;
  if (!user) {
    throw new AuthError("Invalid username or password", 401);
  }

  const validPassword = verifyPassword(input.password, user.password_hash);
  if (!validPassword) {
    throw new AuthError("Invalid username or password", 401);
  }

  const sessionId = randomUUID();
  const refreshToken = randomBytes(48).toString("hex");
  const refreshTokenExpiresAt = addDaysIso(REFRESH_TOKEN_TTL_DAYS);
  const accessToken = randomBytes(32).toString("hex");
  const accessTokenExpiresAt = addMinutesIso(ACCESS_TOKEN_TTL_MINUTES);
  const createdAt = nowIso();

  const transaction = db.transaction(() => {
    insertSessionStmt.run({
      id: sessionId,
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: refreshTokenExpiresAt,
      created_at: createdAt,
    });
    insertAccessTokenStmt.run({
      id: randomUUID(),
      session_id: sessionId,
      user_id: user.id,
      token_hash: hashToken(accessToken),
      expires_at: accessTokenExpiresAt,
      created_at: createdAt,
    });
  });
  transaction();

  return {
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenExpiresAt,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  };
}

export function getCurrentUserFromToken(token: string): {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
} {
  const auth = findByAccessTokenStmt.get(hashToken(token)) as
    | {
        access_token_id: string;
        session_id: string;
        access_expires_at: string;
        access_revoked_at: string | null;
        session_expires_at: string;
        session_revoked_at: string | null;
        id: string;
        username: string;
        email: string;
        email_verified: number;
      }
    | undefined;

  if (!auth) {
    throw new AuthError("Invalid access token", 401);
  }

  if (auth.access_revoked_at || auth.session_revoked_at) {
    throw new AuthError("Session was revoked", 401);
  }

  if (new Date(auth.access_expires_at).getTime() < Date.now()) {
    throw new AuthError("Access token expired", 401);
  }

  if (new Date(auth.session_expires_at).getTime() < Date.now()) {
    throw new AuthError("Session expired", 401);
  }

  return {
    id: auth.id,
    username: auth.username,
    email: auth.email,
    emailVerified: auth.email_verified === 1,
  };
}

export function refreshAccessToken(input: {
  refreshToken: string;
}): { accessToken: string; accessTokenExpiresAt: string } {
  const session = findSessionByRefreshTokenStmt.get(hashToken(input.refreshToken)) as
    | {
        session_id: string;
        user_id: string;
        expires_at: string;
        revoked_at: string | null;
      }
    | undefined;

  if (!session) {
    throw new AuthError("Invalid refresh token", 401);
  }

  if (session.revoked_at) {
    throw new AuthError("Session was revoked", 401);
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    throw new AuthError("Refresh token expired", 401);
  }

  const user = findUserByIdStmt.get(session.user_id) as UserRow | undefined;
  if (!user) {
    throw new AuthError("User not found for session", 401);
  }

  const accessToken = randomBytes(32).toString("hex");
  const accessTokenExpiresAt = addMinutesIso(ACCESS_TOKEN_TTL_MINUTES);

  insertAccessTokenStmt.run({
    id: randomUUID(),
    session_id: session.session_id,
    user_id: user.id,
    token_hash: hashToken(accessToken),
    expires_at: accessTokenExpiresAt,
    created_at: nowIso(),
  });

  return {
    accessToken,
    accessTokenExpiresAt,
  };
}

export function logoutByAccessToken(token: string): void {
  const auth = findByAccessTokenStmt.get(hashToken(token)) as
    | {
        session_id: string;
        access_revoked_at: string | null;
        session_revoked_at: string | null;
      }
    | undefined;

  if (!auth) {
    throw new AuthError("Invalid access token", 401);
  }

  const revokedAt = nowIso();

  const transaction = db.transaction(() => {
    revokeAccessTokenByTokenStmt.run({
      revoked_at: revokedAt,
      token_hash: hashToken(token),
    });
    revokeSessionByIdStmt.run({
      revoked_at: revokedAt,
      id: auth.session_id,
    });
    revokeAccessTokensBySessionStmt.run({
      revoked_at: revokedAt,
      session_id: auth.session_id,
    });
  });
  transaction();
}

export function logoutAllByUser(userId: string): { revokedSessions: number } {
  const revokedAt = nowIso();
  let revokedSessions = 0;

  const transaction = db.transaction(() => {
    const sessionResult = revokeAllSessionsByUserStmt.run({
      revoked_at: revokedAt,
      user_id: userId,
    });
    revokedSessions = sessionResult.changes;
    revokeAllAccessTokensByUserStmt.run({
      revoked_at: revokedAt,
      user_id: userId,
    });
  });
  transaction();

  return {
    revokedSessions,
  };
}
