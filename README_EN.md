# SyncNest (EN)

Desktop/mobile application for working with shared folders and files across local networks and internet-connected devices with realtime synchronization.

## Language

- English version: `README_EN.md` (this file)
- Русская версия: [README_RU.md](./README_RU.md)

## Project status

Current phase: architecture and repository documentation bootstrap.

Initial version: `v0.1.0`

## MVP scope (Desktop first)

- Platforms: `macOS (Swift)` and `Windows (C#)`
- Unified user account across devices
- Connect/disconnect devices from the app
- Create and manage shared project folders
- File/folder operations (including rename/move)
- Realtime synchronization
- Automatic file edit lock:
  - first device gets edit access;
  - other devices are read-only for that file.

## MVP decisions

- Access: authorized users only (no guest links yet)
- Sign-up: username + password + email + email confirmation code
- Sign-in: username + password
- Online-only mode in MVP (no offline sync)
- Manual network configuration via UI
- Operation queue: `FIFO`
- Operations: start + cancel (no pause/resume yet)
- In-app notifications only
- Trash bin with 30-day auto-cleanup
- No file version history in MVP
- Server-side audit logs per shared network, no auto-deletion yet
- TLS for sync transport; no at-rest encryption in MVP
- File storage on user host servers (single host per network)
- Central server for coordination, accounts, metadata, and logs
- MVP database: `SQLite`
- Backend stack: `Node.js + TypeScript`

## Repository workflow

- Main branch at startup: `main`
- Commit messages: English, `Conventional Commits`
- License: `MIT`
- Primary progress log: [HISTORY.md](./HISTORY.md)

## Documentation map

- [README.md](./README.md) — language entry point
- `README_RU.md` — Russian overview
- `README_EN.md` — English overview
- [HISTORY.md](./HISTORY.md) — timeline + versions
- [CONTRIBUTING.md](./CONTRIBUTING.md) — contribution rules
- [SECURITY.md](./SECURITY.md) — security policy
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — code of conduct
- [LICENSE](./LICENSE) — MIT license

## Current code layout

- `server/` — central server bootstrap (`Node.js + TypeScript + SQLite`)

### Implemented server endpoints

- `GET /health` — server health check
- `POST /auth/register/request-code` — create sign-up verification code
- `POST /auth/register/confirm` — complete registration via email code
- `POST /auth/login` — sign in with username/password
- `POST /auth/refresh` — rotate access token using refresh token
- `GET /auth/me` — resolve current user from Bearer token
- `POST /auth/logout` — terminate current session
- `POST /auth/logout-all` — terminate all user sessions
- Brute-force protection: built-in rate limiting for `request-code`, `login`, and `refresh`
- `GET /networks` — list current user networks
- `POST /networks` — create network
- `GET /devices?networkId=...` — list devices in network
- `POST /devices/connect` — connect device to network
- `POST /devices/:deviceId/disconnect` — disconnect device from network
- `GET /audit-logs?networkId=...&page=...&pageSize=...` — read network audit logs with pagination and filters
- `GET /storage/folders` / `POST /storage/folders` / `PATCH /storage/folders/:folderId` — manage folders
- `DELETE /storage/folders/:folderId` / `POST /storage/folders/:folderId/restore` — folder trash/restore
- `GET /storage/files` / `POST /storage/files` / `PATCH /storage/files/:fileId` — manage file metadata
- `DELETE /storage/files/:fileId` / `POST /storage/files/:fileId/restore` — file trash/restore
- `GET /storage/trash?networkId=...` — list network trash items
- `GET /file-locks/status?networkId=...&fileId=...` — check file lock status
- `POST /file-locks/lock` / `POST /file-locks/unlock` — acquire/release edit lock
- `POST /file-locks/heartbeat` — renew lock heartbeat (lock expires by TTL without it)
- Background cleanup job:
  - removes expired email verification codes
  - releases stale file locks
  - revokes expired access tokens
