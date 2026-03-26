# HISTORY

История разработки SyncNest.

Формат записей:

- Дата: `YYYY-MM-DD`
- Версия: `SemVer` (`MAJOR.MINOR.PATCH`)
- Блоки:
  - Сделано
  - Решения
  - Баги
  - Ошибки
  - Коммиты
  - Планы

---

## 2026-03-26 — v0.1.0

### Сделано

- Зафиксированы требования и границы MVP.
- Подтверждены целевые платформы: desktop first (`macOS`, `Windows`), mobile second (`iOS`, `Android`).
- Добавлен базовый пакет репозиторной документации.
- Добавлен стартовый каркас `server/` (`Node.js + TypeScript + SQLite`) с health-check API.
- Добавлен базовый модуль `auth`:
  - запрос кода регистрации (`/auth/register/request-code`);
  - подтверждение регистрации (`/auth/register/confirm`);
  - логин (`/auth/login`);
  - получение текущего пользователя по токену (`/auth/me`).
- Добавлены модули `networks` и `devices`:
  - создание/список сетей (`/networks`);
  - подключение/отключение/список устройств (`/devices`).
- Подключен серверный audit log для событий:
  - `network.created`;
  - `device.connected`;
  - `device.disconnected`.
- Папка `MacOS App Design/` удалена из отслеживания git и добавлена в `.gitignore` (локальный референс).
- Добавлен endpoint чтения логов: `GET /audit-logs` (пагинация + фильтры `eventType` и `status`).
- Добавлены endpoints управления сессиями:
  - `POST /auth/logout` — завершение текущей сессии;
  - `POST /auth/logout-all` — завершение всех сессий пользователя.
- Внедрена refresh-token стратегия:
  - access token (`15 минут`) хранится в `access_tokens`;
  - refresh token (`30 дней`) хранится в `sessions`;
  - добавлен endpoint `POST /auth/refresh`.
- Добавлен встроенный rate-limit для auth endpoints:
  - `POST /auth/register/request-code`
  - `POST /auth/login`
  - `POST /auth/refresh`
- Добавлен core storage API-каркас:
  - папки (`list/create/update/delete/restore`)
  - файлы (`list/create/update/delete/restore`)
  - корзина (`GET /storage/trash`)
- Добавлен `file-lock` API:
  - `POST /file-locks/lock` — блокировка файла на редактирование
  - `POST /file-locks/unlock` — снятие блокировки владельцем
  - `GET /file-locks/status` — проверка текущего состояния lock
- Добавлены TTL + heartbeat для lock:
  - истечение lock по `FILE_LOCK_TTL_SECONDS` (по умолчанию 120 сек)
  - endpoint `POST /file-locks/heartbeat` для продления lock
- Добавлен background cleanup job:
  - очистка просроченных `email_verification_codes`
  - автоосвобождение протухших `file_locks`
  - ревокация истекших `access_tokens`
- Добавлен endpoint `GET /metrics` с базовыми счетчиками:
  - auth requests/errors
  - storage+file-lock requests/errors
  - cleanup runs/changes
  - uptime
- Добавлены интеграционные API-тесты (`vitest + supertest`):
  - auth flow
  - network + storage + file-lock flow

### Решения

- Название проекта: `SyncNest`.
- Файловое хранилище: на пользовательском хосте (один хост на сеть).
- Центральный сервер: учетные записи, координация, метаданные и логи.
- Backend: `Node.js + TypeScript`.
- БД MVP: `SQLite`.
- Коммиты: `Conventional Commits`, английский язык.
- Лицензия: `MIT`.
- Структура сервера: модульный каркас (`config`, `db`, `routes`, `app`, `index`) с инициализацией БД при старте.
- Сессии хранятся в SQLite как хэш токена (`sha256`) с TTL 30 дней.
- Код подтверждения регистрации действует 15 минут.
- Доступ к `devices` ограничен владельцем сети (проверка `owner_user_id`).

### Баги

- Нет.

### Ошибки

- Нет.

### Коммиты

- `b66ef39` — `docs: bootstrap SyncNest repository documentation`
- `100590a` — `docs: update history with initial commit hash`
- `0964fa3` — `feat(server): bootstrap TypeScript API and SQLite init`
- `00acb25` — `feat(server): add authentication module and session flow`
- `ed1e65a` — `feat(server): add networks and devices APIs with audit events`
- `29b8d67` — `chore(repo): untrack local design reference folder`
- `24b3526` — `feat(server): add audit logs listing endpoint`
- `1464c6c` — `feat(auth): add logout and logout-all session revocation`
- `13f7ff4` — `feat(auth): introduce refresh-token based session model`
- `bdeebe7` — `feat(auth): add brute-force rate limiting for auth endpoints`
- `7a173fe` — `feat(storage): add folders and files metadata APIs with trash`
- `d6f8753` — `feat(storage): add file lock API for edit ownership`
- `764feb0` — `feat(storage): add file-lock heartbeat and TTL expiration`
- `710f17a` — `feat(server): add background cleanup job for stale records`
- `7a168aa` — `feat(server): add prometheus-style metrics endpoint and counters`
- `TBD` — integration tests commit (будет добавлен после фиксации).

### Планы

- Расширить API сервера модулями auth/devices/networks.
- Подключить реальную отправку email-кода подтверждения (вместо текущего dev-ответа).
- Добавить постоянное (distributed) rate-limit хранилище для multi-instance деплоя.
- Добавить детализацию метрик по endpoint labels (low-cardinality).
- Расширить интеграционные тесты кейсами ошибок и конфликтов lock.
- Подготовить стартовую структуру desktop-клиентов (`macOS Swift`, `Windows C#`).
