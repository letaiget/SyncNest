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

### Планы

- Расширить API сервера модулями auth/devices/networks.
- Подключить реальную отправку email-кода подтверждения (вместо текущего dev-ответа).
- Добавить endpoint revoke/logout для сессий пользователя.
- Подготовить стартовую структуру desktop-клиентов (`macOS Swift`, `Windows C#`).
