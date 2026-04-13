# Статус проекта Metrico — 2026-04-13

## Обзор

**Metrico** — SPA для измерения квартир с фотофиксацией и генерацией PDF-отчётов.

| Параметр | Значение |
|----------|---------|
| Версия | Sprint 5 (in progress) |
| Прод-сервер | venus (ssh venus), `metrico360.ru` |
| Стек | NestJS + React 18 + Vite + SQLite/Prisma |
| CI/CD | GitHub Actions → GHCR → Docker Compose |
| Тесты | 220 / 220 ✅ |

---

## Статус функциональности

### Авторизация

| Функция | Статус | Примечание |
|---------|--------|-----------|
| Регистрация email/пароль | ✅ Реализовано | |
| Вход email/пароль | ✅ Реализовано | |
| JWT refresh rotation | ✅ Реализовано | |
| Logout | ✅ Реализовано | |
| Google OAuth | ✅ Реализовано | Нужны ключи в .env.production |
| Яндекс OAuth | ✅ Реализовано | Нужны ключи в .env.production |
| VK OAuth | ✅ Реализовано | 2026-04-13, нужны ключи VK App |
| Сброс пароля (email) | ⚠️ Частично | Генерация токена есть, email не отправляется |

### Проекты

| Функция | Статус |
|---------|--------|
| CRUD проектов | ✅ |
| Типы объектов (квартира, студия, дом) | ✅ |
| Статусы (черновик / завершён) | ✅ |

### Комнаты и измерения

| Функция | Статус |
|---------|--------|
| CRUD комнат | ✅ |
| Типы комнат (кухня, спальня и т.д.) | ✅ |
| Формы комнат (прямоугольник, Г-форма и т.д.) | ✅ |
| Стены и сегменты | ✅ |
| Углы (прямые/непрямые) | ✅ |
| Элементы комнаты (колонны, ниши и т.д.) | ✅ |
| Wizard пошагового измерения | ✅ |
| Corner Label step | ✅ |

### Фотографии

| Функция | Статус |
|---------|--------|
| Загрузка фото комнат | ✅ |
| Типы фото (до/после/деталь) | ✅ |
| Thumbnail генерация | ✅ (sharp) |

### План/Схема

| Функция | Статус |
|---------|--------|
| Floor Plan Layout (JSON) | ✅ |
| Floor Plan Sketch (SVG-схема) | ✅ |
| Wall Elevations | ✅ |

### PDF

| Функция | Статус |
|---------|--------|
| Генерация PDF отчёта | ✅ (@react-pdf/renderer) |

---

## Prod-окружение — Критические проблемы

### 🔴 P0: Сервер запускает dev-конфиг

Prod-сервер (`venus`) работает с `docker-compose.yml` (dev) вместо `docker-compose.prod.yml`.

**Следствия:**
- Cookies без флага `Secure` (NODE_ENV=development)
- CORS заблокирован для `metrico360.ru`  
- JWT_REFRESH_SECRET может отличаться

**Команда исправления (требует одобрения):**
```bash
cd /opt/metrico
git pull
docker compose down
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### 🟡 OAuth-провайдеры не настроены на проде

В `.env.production` на сервере отсутствуют:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `YANDEX_CLIENT_ID` / `YANDEX_CLIENT_SECRET`  
- `VK_CLIENT_ID` / `VK_CLIENT_SECRET` (новые)

Кнопки OAuth на login-странице ведут на `/api/auth/google` и т.д., но стратегии инициализированы с `disabled` плейсхолдерами.

---

## Технический долг (топ-5)

1. **Отправка email** — forgotPassword генерирует токен, но не отправляет письмо (CR-02)
2. **Rate limiting** — нет throttling на auth endpoints (CR-08)
3. **Undo в редакторе** — случайные действия необратимы (UI-D-08)
4. **Empty state** — новые пользователи видят пустую страницу (UI-D-02)
5. **POST /auth/me** — должен быть GET (CR-09)

---

## CI/CD

| Шаг | Статус |
|-----|--------|
| `ci-pr.yml` — typecheck + test на PR | ✅ |
| `ci-main.yml` — build + push GHCR на push в main | ✅ |
| `deploy.yml` — автодеплой на venus | ✅ |
| Health check + автоотрат | ✅ |
| Telegram-уведомление о деплое | ✅ |

> ⚠️ `deploy.yml` деплоит с `docker-compose.yml` (dev). Нужно переключить на `docker-compose.prod.yml`.

---

## Зависимости — известные уязвимости

```
npm audit: vulnerabilities обнаружены в dev-зависимостях
```
Требует: `npm audit fix` (без `--force` для безопасности).

---

## Следующие шаги (Sprint 6 предложения)

1. Переключить prod на `docker-compose.prod.yml` + добавить OAuth ключи
2. Реализовать email (MailerService + SMTP)
3. Кнопка «Назад» в wizard
4. Empty state и skeleton loading
5. Toast уведомления
6. Rate limiting на auth
