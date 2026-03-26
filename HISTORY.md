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

### Решения

- Название проекта: `SyncNest`.
- Файловое хранилище: на пользовательском хосте (один хост на сеть).
- Центральный сервер: учетные записи, координация, метаданные и логи.
- Backend: `Node.js + TypeScript`.
- БД MVP: `SQLite`.
- Коммиты: `Conventional Commits`, английский язык.
- Лицензия: `MIT`.
- Структура сервера: модульный каркас (`config`, `db`, `routes`, `app`, `index`) с инициализацией БД при старте.

### Баги

- Нет.

### Ошибки

- Нет.

### Коммиты

- `b66ef39` — `docs: bootstrap SyncNest repository documentation`
- `100590a` — `docs: update history with initial commit hash`
- `TBD` — серверный bootstrap commit (будет добавлен после фиксации).

### Планы

- Расширить API сервера модулями auth/devices/networks.
- Подготовить стартовую структуру desktop-клиентов (`macOS Swift`, `Windows C#`).
