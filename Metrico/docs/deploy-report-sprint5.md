# Post-Deploy Report — metrico Sprint 5
**Дата:** 2026-04-09  
**Сервер:** venus (95.181.174.207)  
**Домен:** https://metrico.n1tr0.space  
**Ветка:** main (commit `db2d23b`)

---

## Результат

Деплой **успешен**. Приложение доступно по HTTPS, все сервисы запущены, БД работает.

```json
GET https://metrico.n1tr0.space/api/health →
{
  "status": "ok",
  "uptime": 495,
  "db": { "status": "ok" },
  "disk": { "freeGb": 19.73 }
}
```

---

## Инфраструктура

| Компонент | Детали |
|-----------|--------|
| ОС | Ubuntu 24.04 LTS |
| Docker | 29.4.0 |
| VPS | 2 vCPU / 4 GB RAM / 30 GB SSD |
| Диск | 18 GB свободно / 30 GB (39% использовано) |

### Запущенные контейнеры

| Контейнер | Образ | Статус |
|-----------|-------|--------|
| `metrico-app-1` | `ghcr.io/metrico/server:latest` | Up (healthy) |
| `metrico-nginx-1` | `nginx:1.27-alpine` | Up |
| `metrico-certbot-1` | `certbot/certbot:latest` | Up (autorenewal) |

### Docker Volumes

| Volume | Назначение |
|--------|-----------|
| `metrico_data` | SQLite DB + uploads |
| `metrico_client_dist` | Vite SPA build |
| `metrico_certbot_conf` | Let's Encrypt сертификаты |
| `metrico_certbot_www` | ACME webroot |

---

## TLS / SSL

| Параметр | Значение |
|----------|---------|
| Эмитент | Let's Encrypt (E8) |
| Протокол | TLSv1.3 / CHACHA20-POLY1305 |
| Истекает | 2026-07-07 |
| Автообновление | certbot-контейнер (каждые 12 ч) |
| Статус | `Verify return code: 0 (ok)` |

---

## Архитектура

```
Internet :80/:443
  │
nginx:1.27-alpine (reverse proxy + static)
  ├─ /          → client_dist volume (Vite SPA)
  ├─ /api/*     → app:3000
  ├─ /uploads/* → data volume
  └─ /.well-known/ → certbot_www
          │
    NestJS API :3000 (node:20-alpine)
          │
    SQLite /app/data/metrico.db (Prisma)
```

---

## Проблемы при деплое и решения

Потребовалось 6 итерационных фиксов.

### Dockerfile — Builder stage

**#1 `can't create ./client/package.json: nonexistent directory`**  
Причина: директория не создавалась перед COPY  
Фикс: `RUN mkdir -p ./client` (commit `19828de`)

**#2 49 TypeScript ошибок — `Module '"@prisma/client"' has no exported member 'Wall'`**  
Причина: Prisma client не генерировался до компиляции TS  
Фикс: `RUN npx prisma generate` перед `RUN npx nest build` (commit `4185e54`)

**#3 `TS2307: Cannot find module 'passport-google-oauth20'`**  
Причина: `npm ci --workspace=server` не поднимает passport-* в root node_modules  
Фикс: `COPY client/package.json ./client/` + `RUN npm ci` (полная установка) (commit `7b8fb98`)

### Dockerfile — Production stage

**#4 `TypeError: Cannot convert undefined or null to object` at `IsEnum.js:18`**  
Причина: `@prisma/client` установлен, но Prisma client code не сгенерирован — enums = undefined  
Фикс: `RUN npx prisma generate` в production stage + `prisma migrate deploy` в CMD (commit `6d930c9`)

### OAuth

**#5 `OAuth2Strategy requires a clientID option`**  
Причина: `GOOGLE_CLIENT_ID=` — пустая строка; `passport-oauth2` бросает при empty string  
Фикс: Placeholder-значения в `.env.production`. OAuth не работает до добавления реальных credentials.

### client-builder service

**#6a `can't create server/package.json: nonexistent directory`**  
Фикс: `mkdir -p server &&` в command (commit `f8a1be2`)

**#6b `ENOENT: mkdir '/build/client/node_modules'` (npm)**  
Причина: `./client:/build/client:ro` — npm не пишет в read-only mount  
Фикс: убрали `:ro` (commit `db2d23b`)

### Bootstrap SSL

Двухфазная инициализация:
1. Временный `nginx-bootstrap` контейнер (HTTP:80) + certbot → получен сертификат
2. Удалили bootstrap → запустили полный стек с HTTPS

### fail2ban

При многократных SSH-пересоединениях во время долгих build'ов fail2ban блокировал на 1 ч.  
Решение: tmux + `tail -f /tmp/build.log` — мониторинг без переподключений.

---

## Автоматизация

### Бэкап (crontab на venus)

```cron
0 3 * * * DEPLOY_DIR=/opt/metrico /opt/metrico/scripts/backup.sh >> /var/log/metrico-backup.log 2>&1
```

Копирует `metrico.db` + `uploads/` через Alpine-контейнер, хранит 7 дней.

### Certbot автообновление

Certbot-контейнер с `restart: no` работает как бесконечный loop (sleep 12h).  
Сертификат истекает 2026-07-07 → автообновление ~2026-06-08.

---

## Эндпоинты

| URL | Описание |
|-----|---------|
| `https://metrico.n1tr0.space/` | React SPA |
| `https://metrico.n1tr0.space/api/health` | Health (DB + disk) |
| `https://metrico.n1tr0.space/api/auth/login` | JWT авторизация |
| `https://metrico.n1tr0.space/api/auth/google` | OAuth Google *(нужны credentials)* |
| `https://metrico.n1tr0.space/api/auth/yandex` | OAuth Yandex *(нужны credentials)* |

---

## Pending

| Задача | Приоритет |
|--------|-----------|
| Реальные Google/Yandex OAuth credentials в `.env.production` | Средний |
| Внешний rsync-бэкап (`BACKUP_REMOTE=...`) | Низкий |
| Мониторинг / uptime alerting | Низкий |
| Git tag `v20260409-sprint5` | Низкий |

---

## Sprint 5 Summary

| Задача | Статус |
|--------|--------|
| S5-01..S5-06: Wizard UI + API | ✓ |
| S5-07: E2E тесты (31/31 green) | ✓ |
| S5-08: Health endpoint + backup script | ✓ |
| S5-09: Deploy → metrico.n1tr0.space | ✓ |

---

## Пост-деплой: фикс ввода дробных размеров

**Дата:** 2026-04-09  
**Проблема:** Пользователь не мог ввести дробные значения вида `1.125` (1 м 12.5 см) в ряде полей wizard.

### Root cause

HTML5 атрибут `step` на `<input type="number">` блокирует ввод значений, не кратных шагу, **на уровне браузера** — до любой JS/Zod валидации.  
Backend (Prisma `Float`, `@IsNumber()`, `z.coerce.number()`) всегда принимал дробные числа корректно.

### Затронутые компоненты

| Файл | Поле | Было | Стало |
|------|------|------|-------|
| `OpeningsStep.tsx` — `WindowCard` | Высота, мм | `step="1"` | `step="0.1"` |
| `OpeningsStep.tsx` — `WindowCard` | Высота подоконника, мм | `step="1"` | `step="0.1"` |
| `OpeningsStep.tsx` — `WindowCard` | Откос слева/справа, мм | `step="1"` | `step="0.1"` |
| `OpeningsStep.tsx` — `DoorCard` | Высота от стяжки, мм | `step="1"` | `step="0.1"` |
| `OpeningsStep.tsx` — `DoorCard` | Откос слева/справа, мм | `step="1"` | `step="0.1"` |
| `WallElevationStep.tsx` — `ElementForm` | Позиция от нач. стены, м | `step="0.01"` | `step="0.001"` |
| `WallElevationStep.tsx` — `ElementForm` | Высота от пола, м | `step="0.01"` | `step="0.001"` |
| `WallElevationStep.tsx` — `ElementForm` | Ширина, м | `step="0.01"` | `step="0.001"` |

### Проверенные компоненты (изменений не требовалось)

| Файл | Поле | Step | Статус |
|------|------|------|--------|
| `WallDimensionsStep.tsx` | Длина стены, м | `step="0.001"` | ✓ |
| `CeilingHeightStep.tsx` | Высота потолка, м | `step="0.001"` | ✓ |
| `PerimeterWalkStep.tsx` | Длина прогона, м | `step="0.001"` | ✓ |
| `WallElevationStep.tsx` | Кривизна (мм) | `step="0.1"` | ✓ |

### Тесты

Добавлено **9 новых тестов** в существующие spec-файлы:

- `OpeningsStep.spec.tsx`: 7 тестов — проверка `step="0.1"` на всех полях, сохранение с `1125.5` мм, сохранение двери с `2100.5` мм
- `WallElevationStep.spec.tsx`: 4 теста — проверка `step="0.001"` на positionX/offsetFromFloor/width, сохранение с `1.125` м → `1125` мм

Результат: **289 тестов, все прошли** (`npm test --run`)
