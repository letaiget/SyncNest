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
