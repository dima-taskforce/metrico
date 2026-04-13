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
| Деплой | ✅ prod (2026-04-13) |

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

## Prod-окружение — Статус (2026-04-13)

### ✅ ИСПРАВЛЕНО: Сервер переведён на prod-конфиг

- `NODE_ENV=production` ✅
- `CORS_ORIGINS=https://metrico360.ru` ✅  
- `DATABASE_URL=file:/app/data/metrico.db` ✅
- App публикует порт `127.0.0.1:3000` для host nginx ✅
- SPA обновлён из Docker volume в `/var/www/metrico` ✅
- CI/CD обновлён: deploy.yml копирует SPA на хост вместо попытки запустить Docker nginx ✅

### 🟡 OAuth-провайдеры — частично настроены

В `.env.production` на сервере:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — ✅ есть
- `YANDEX_CLIENT_ID` / `YANDEX_CLIENT_SECRET` — ✅ есть  
- `VK_CLIENT_ID` / `VK_CLIENT_SECRET` — ❌ отсутствуют (нужно создать VK App)

VK OAuth: стратегия инициализируется с `disabled` плейсхолдером и не активна.

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

> ✅ `deploy.yml` деплоит через `docker-compose.prod.yml`, копирует SPA в `/var/www/metrico`.

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
