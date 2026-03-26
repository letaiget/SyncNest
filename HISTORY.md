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
- Расширены негативные интеграционные тесты:
  - unauthorized (`401`)
  - forbidden cross-user access (`403`)
  - invalid refresh token (`401`)
  - lock conflict/ownership cases
- Добавлены тесты жизненного цикла lock:
  - TTL-истечение lock при `status` запросе
  - автоосвобождение lock через `cleanup` pass
  - heartbeat продлевает lock и не дает ему протухнуть
- Добавлены метрики жизненного цикла lock:
  - `syncnest_lock_ttl_expirations_total`
  - `syncnest_lock_heartbeat_renewed_total`
  - `syncnest_lock_heartbeat_rejected_total`
- Добавлен интеграционный тест проверки lock-метрик через `GET /metrics`.
- Добавлены low-cardinality метрики по группам endpoint:
  - `syncnest_endpoint_requests_total{group="auth|storage|file_lock"}`
  - `syncnest_endpoint_errors_total{group="auth|storage|file_lock"}`
- Добавлен интеграционный тест на рост labeled-метрик endpoint групп.
- Добавлены helper-функции `metrics snapshot/reset` для изоляции in-memory метрик в тестах.
- Обновлены metric-тесты на детерминированные проверки дельт (без накопительного эффекта между тестами).
- Добавлена retention-очистка `audit_logs` в cleanup job:
  - env `AUDIT_LOG_RETENTION_DAYS` (`0` = выключено, `>0` = удаление старых логов)
  - метрика `syncnest_audit_logs_retention_deletions_total`
- Добавлен интеграционный тест cleanup-удаления устаревших audit-логов.
- Добавлен endpoint `GET /system/config` (runtime-config snapshot):
  - `fileLockTtlSeconds`
  - `cleanupIntervalSeconds`
  - `auditLogRetentionDays`
  - `auditLogRetentionEnabled`
- Добавлен интеграционный тест `GET /system/config`.
- Добавлен endpoint `GET /system/config/cleanup-dry-run`:
  - оценивает кандидатов на cleanup без изменения данных в БД
  - считает `expiredVerificationCodes`, `expiredFileLocks`, `expiredAccessTokens`, `auditLogsForDeletion`
- Добавлен интеграционный тест `GET /system/config/cleanup-dry-run`.
- Добавлен endpoint `POST /system/config/cleanup/run` (manual trigger):
  - требует авторизацию (`Bearer`)
  - запускает cleanup pass и возвращает агрегированную статистику изменений
  - пишет audit event `system.cleanup.manual.run` в сети пользователя
- Добавлены метрики ручного запуска cleanup:
  - `syncnest_cleanup_manual_runs_total`
  - `syncnest_cleanup_manual_errors_total`
- Добавлен интеграционный тест для manual cleanup trigger (`401` без токена + успешный запуск + audit + metrics).
- Введена owner-scope политика для system endpoints:
  - `GET /system/config`, `GET /system/config/cleanup-dry-run`, `POST /system/config/cleanup/run`
    доступны только авторизованным пользователям, владеющим хотя бы одной сетью
  - добавлены интеграционные проверки на `401` и `403` для system endpoints.

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
- `1d92b6e` — `test(server): add integration tests for core API flows`
- `7e73bdb` — `test(server): cover lock ownership conflicts and auth negatives`
- `82a6b77` — `test(server): add lock TTL and cleanup integration coverage`
- `7e11b50` — `test(server): add negative integration scenarios for auth and access`
- `e03d226` — `test(server): add heartbeat lock renewal integration test`
- `839dc90` — `feat(metrics): add lock lifecycle counters and coverage`
- `0dbf1e3` — `feat(metrics): add endpoint-group labeled counters`
- `a174be5` — `test(metrics): isolate in-memory counters with snapshot reset`
- `c20ce95` — `feat(server): add audit log retention cleanup policy`
- `3401582` — `feat(server): add runtime system config endpoint`
- `d5106a7` — `feat(server): add cleanup dry-run system endpoint`
- `f07f4b1` — `feat(server): add manual cleanup trigger endpoint`
- `89a6864` — `feat(server): enforce owner-scope access for system endpoints`

### Планы

- Расширить API сервера модулями auth/devices/networks.
- Подключить реальную отправку email-кода подтверждения (вместо текущего dev-ответа).
- Добавить постоянное (distributed) rate-limit хранилище для multi-instance деплоя.
- Добавить детализацию метрик по endpoint labels (low-cardinality).
- Добавить low-cardinality labels для метрик endpoint групп (auth/storage/file-lock).
- Добавить reset/isolated snapshot helper для in-memory metrics в тестах.
- Добавить endpoint/инструмент просмотра retention-конфига и dry-run cleanup статистики.
- Добавить ручной trigger endpoint для cleanup pass (admin-only, с audit event).
- Добавить роль/политику доступа для system endpoints (owner/admin scope).
- Добавить централизованный RBAC middleware для ролей (`owner`, `admin`) с переиспользованием в роутерах.
- Подготовить стартовую структуру desktop-клиентов (`macOS Swift`, `Windows C#`).
