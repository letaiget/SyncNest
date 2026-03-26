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

### Баги

- Нет.

### Ошибки

- Нет.

### Коммиты

- `b66ef39` — `docs: bootstrap SyncNest repository documentation`
- `100590a` — `docs: update history with initial commit hash`
- `0964fa3` — `feat(server): bootstrap TypeScript API and SQLite init`
- `00acb25` — `feat(server): add authentication module and session flow`

### Планы

- Расширить API сервера модулями auth/devices/networks.
- Подключить реальную отправку email-кода подтверждения (вместо текущего dev-ответа).
- Подготовить стартовую структуру desktop-клиентов (`macOS Swift`, `Windows C#`).
