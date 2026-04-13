# Code Review — 2026-04-13

**Ревьюер:** Claude Code  
**Охват:** полный (server/ + client/)  
**Дата:** 2026-04-13

---

## Резюме

Кодовая база в целом качественная: строгий TypeScript, нет `any`, тесты покрывают 220 сценариев, архитектура модульная. Ниже перечислены конкретные проблемы в порядке приоритета.

---

## Критические (P0)

### CR-01 — Prod-сервер запускается с dev-конфигом

**Файл:** `docker-compose.yml` (работает на venus вместо `docker-compose.prod.yml`)  
**Проблема:**
- `NODE_ENV=development` → cookie без флага `Secure` → токены утекают по HTTP
- `CORS_ORIGINS=http://localhost:5173` → браузер блокирует API-запросы с `https://metrico360.ru`
- `JWT_REFRESH_SECRET` не задан из `.env.production`

**Исправление:**
```bash
cd /opt/metrico
docker compose down
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

> Требует явного одобрения владельца перед выполнением на сервере.

---

## Высокий приоритет (P1)

### CR-02 — `forgotPassword` не отправляет email

**Файл:** `server/src/auth/auth.service.ts:129`  
**Проблема:** Метод генерирует и сохраняет токен сброса пароля, но email **не отправляется** — есть TODO-комментарий:
```typescript
// TODO: Send email with reset link (requires MailerService)
```
Пользователи нажимают «Забыл пароль» и ничего не получают.  
**Исправление:** Подключить `@nestjs-modules/mailer` или `nodemailer` + настроить SMTP.

### CR-03 — JWT refresh rotation реализован, но не защищает от race condition

**Файл:** `server/src/auth/auth.service.ts:57`  
**Проблема:** Refresh token ротируется в транзакции, но `$transaction` здесь — последовательный (Prisma/SQLite). Если два запроса придут одновременно с одним refresh token, второй получит 401. В большинстве случаев это нормально, но SPA делает параллельные запросы при начальной загрузке — возможен race.  
**Исправление:** Рассмотреть «grace period» (30–60 сек) перед аннулированием старого токена.

### CR-04 — `COOKIE_OPTIONS` evaluated at module load time

**Файл:** `server/src/auth/auth.controller.ts:23`  
```typescript
const COOKIE_OPTIONS = {
  secure: process.env['NODE_ENV'] === 'production',
  ...
};
```
**Проблема:** Значение вычисляется **один раз при загрузке модуля**. Если `NODE_ENV` изменится в runtime (маловероятно, но возможно при тестировании), кэшированное значение останется.  
**Исправление:** Перенести в метод `setTokenCookies`.

### CR-05 — Yandex Strategy игнорирует `YANDEX_CALLBACK_URL` в production

**Файл:** `server/src/auth/strategies/yandex.strategy.ts:12`  
**Проблема:** Если `YANDEX_CLIENT_ID` не задан, стратегия инициализируется с `callbackURL: '/api/auth/yandex/callback'` — что корректно. Но в `.env.production` нет записей `YANDEX_CLIENT_ID`/`YANDEX_CLIENT_SECRET`, поэтому Яндекс OAuth **не работает на проде** даже если ключи добавить в `docker-compose.prod.yml`.

---

## Средний приоритет (P2)

### CR-06 — `@types/passport-google-oauth20` в `dependencies`, а не `devDependencies`

**Файл:** `server/package.json:30`  
```json
"@types/passport-google-oauth20": "^2.0.17"
```
Типы должны быть в `devDependencies`. Производственный образ Docker тянет лишние пакеты.

### CR-07 — `react`/`react-dom` в `dependencies` сервера

**Файл:** `server/package.json:39–40`  
```json
"react": "^18.3.1",
"react-dom": "^18.3.1",
```
Эти пакеты нужны только для `@react-pdf/renderer`. Нет смысла иметь их напрямую — `@react-pdf/renderer` сам подтягивает peer deps. Создают путаницу в зависимостях сервера.

### CR-08 — Нет rate limiting на auth endpoints

**Файл:** `server/src/main.ts` — `ThrottlerModule` импортируется в `AppModule`, но не применяется к `auth` endpoints явно.  
**Проблема:** `/auth/login` и `/auth/register` уязвимы для brute force.  
**Исправление:** Добавить `@UseGuards(ThrottlerGuard)` к auth-контроллеру или глобальный throttler с исключениями.

### CR-09 — `POST /auth/me` — семантически некорректный метод

**Файл:** `server/src/auth/auth.controller.ts:88`  
```typescript
@Post('me')
```
`me` — это чтение данных, должен быть `GET`. Исторически использован `POST` чтобы избежать кэширования, но правильнее использовать `Cache-Control: no-store`.

### CR-10 — Prisma `$transaction` в refresh использует избыточную функцию-колбэк

**Файл:** `server/src/auth/auth.service.ts:57–67`  
Интерактивная транзакция (`async (tx) => { ... }`) нужна только для операций, требующих промежуточных результатов. Здесь можно использовать batch-транзакцию `[op1, op2]`.

---

## Низкий приоритет / Технический долг (P3)

### CR-11 — Нет OpenAPI / Swagger документации

**Проблема:** Нет `@nestjs/swagger`. Для командной разработки критично.

### CR-12 — Seed-скрипт не использует `prisma.upsert`

**Файл:** `seed/seed.ts` (если существует)  
**Проблема:** Повторный запуск seed'а, вероятно, упадёт с duplicate key error.

### CR-13 — `UPLOADS_DIR` не задан в dev `.env.example`

**Файл:** `.env.example:20`  
```
UPLOADS_DIR=./uploads
```
Директория не создаётся автоматически при первом запуске — NestJS упадёт с ENOENT.

### CR-14 — `WallSegment.offsetFromPrev` — nullable Float без дефолта

**Файл:** `server/prisma/schema.prisma:225`  
Семантически 0 и null — разные значения (0 = вплотную, null = не задано). Документация отсутствует.

---

## Положительные аспекты

- Строгий TypeScript, нет `any`
- Refresh token ротация с хэшированием (SHA-256)
- `forbidNonWhitelisted + whitelist` на ValidationPipe — защита от mass assignment
- Helmet подключен
- 220 тестов, все проходят
- Docker Compose с health checks и rollback в CI/CD
- Нет секретов в коде — все через env vars

---

## Задачи для трекинга

| ID | Приоритет | Задача |
|----|-----------|--------|
| CR-01 | P0 | Переключить prod на `docker-compose.prod.yml` |
| CR-02 | P1 | Реализовать отправку email для сброса пароля |
| CR-03 | P1 | Изучить grace period для refresh token |
| CR-04 | P1 | Перенести `COOKIE_OPTIONS` в метод |
| CR-05 | P1 | Добавить Yandex/VK секреты в `.env.production` на сервере |
| CR-06 | P2 | Переместить `@types/...` в devDependencies |
| CR-07 | P2 | Убрать react/react-dom из server dependencies |
| CR-08 | P2 | Добавить rate limiting на auth endpoints |
| CR-09 | P2 | Заменить `POST /auth/me` на `GET` |
| CR-11 | P3 | Добавить Swagger/OpenAPI |
| CR-13 | P3 | Автосоздание `UPLOADS_DIR` при старте |
