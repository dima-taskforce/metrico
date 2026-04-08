# Sprint 5 — Полировка

Цель: OAuth, PWA, мобильная адаптация, визуальные подсказки, SSL, финальный CI/CD, e2e-тесты. Продукт готов к первым пользователям.

Пайплайн: `docs/agent-pipeline.md`

---

## S5-01. OAuth (Google + Яндекс)

**Агент:** nestjs-expert

**Описание:**
Реализовать OAuth через @nestjs/passport:
- Google: `GET /api/auth/google` → redirect → `GET /api/auth/google/callback`. Стратегия: passport-google-oauth20.
- Яндекс: `GET /api/auth/yandex` → redirect → `GET /api/auth/yandex/callback`. Стратегия: passport-yandex (или custom).
- При первом входе — создаётся User с authProvider = GOOGLE / YANDEX.
- При повторном входе — находится существующий User по email.
- После callback — выдача JWT (access + refresh), редирект на фронтенд с токеном.

Фронтенд: кнопки «Войти через Google» / «Войти через Яндекс» на страницах логина и регистрации.

**Обработка конфликтов провайдеров (acceptance-критерий):**
- При OAuth входе с email, уже зарегистрированным через LOCAL, возвращать HTTP 409: `{ code: 'EMAIL_PROVIDER_CONFLICT', provider: 'local', message: 'Аккаунт зарегистрирован через email/пароль.' }`.
- При OAuth входе через Google с email, зарегистрированным через Yandex (и наоборот), возвращать HTTP 409: `{ code: 'EMAIL_PROVIDER_CONFLICT', provider: 'yandex'|'google' }`.
- Реализовать проверку в `AuthService.validateOAuthUser()`.
- Фронтенд: показывать понятное сообщение с кнопкой «Войти через {провайдер}».

**Тесты:**
- Mock OAuth flow: callback с корректным профилем → создание пользователя / вход.
- Повторный вход: не создаёт дубликат.
- Конфликт провайдеров: LOCAL email + Google OAuth → HTTP 409. Google email + Yandex OAuth → HTTP 409.

**Зависимости:** Sprint 4 завершён.

---

## S5-02. PWA (Progressive Web App)

**Агент:** react-expert

**Описание:**
Настроить PWA:
- `manifest.json`: название, иконки, тема, orientation portrait.
- Service Worker (Workbox через vite-plugin-pwa): кэширование shell (HTML, CSS, JS), офлайн-заглушка.
- Офлайн-страница: «Нет интернета. Ваши данные сохранятся при подключении.»
- Баннер «Добавить на главный экран» (beforeinstallprompt).

Не кэшировать API-ответы и фото (только shell).

**Тесты:**
- manifest.json валиден. Service Worker регистрируется. Офлайн-страница отображается.

**Зависимости:** S5-01 (или параллельно).

---

## S5-03. Визуальные подсказки (контент)

**Агент:** react-expert

**Описание:**
Заполнить контент подсказок для всех подшагов обмера (компонент `MeasurementHint` из S3-08):
- Тексты на простом русском языке, без жаргона.
- Placeholder-иллюстрации (SVG-схемы): как мерить стену, где мерить кривизну, как выглядит откос, как сфотографировать комнату.
- Глоссарий (всплывающие подсказки при наведении на термин): стяжка, откос, простенок, ригель и т.д.

Данные: `client/src/data/hints.ts` — обновить тексты и добавить SVG.

**Тесты:**
- Все подшаги имеют подсказку. Глоссарий отображается.

**Зависимости:** S3-08.

---

## S5-04. Мобильная адаптация (финальная)

**Агент:** react-expert

**Описание:**
Пройтись по всем экранам и убедиться:
- Все формы: одна колонка, min 44px touch target, нет горизонтального скролла.
- Визард: один подшаг на экране, «Назад»/«Далее» зафиксированы внизу (sticky).
- План (шаг 4): pinch-to-zoom и drag работают плавно на мобильных.
- Дашборд: план сверху, детали снизу (свайп).
- Фото: `<input capture="environment">` открывает камеру.
- Модальные окна: полноэкранные на мобильных.
- Таблицы: горизонтальный скролл внутри таблицы (не страницы).

Тестирование: Chrome DevTools (responsive), реальные устройства (iOS Safari, Android Chrome).

**Тесты:**
- Responsive snapshot-тесты для ключевых экранов (320px, 375px, 768px).

**Зависимости:** Sprint 4.

---

## S5-05. SSL + деплой (Certbot + Docker)

**Агент:** devops

**Описание:**
Настроить:
- Certbot в Docker Compose: автоматическое получение Let's Encrypt сертификата.
- Nginx: HTTPS-конфиг, редирект HTTP → HTTPS, HSTS.
- `.env.production`: переменные окружения (JWT_SECRET, GOOGLE_CLIENT_ID и т.д.).
- Docker Compose production-конфиг: restart policy, healthcheck, лимиты ресурсов.

**Результат:**
- `docker compose -f docker-compose.prod.yml up` поднимает приложение с HTTPS.
- Сертификат обновляется автоматически.

**Зависимости:** S1-02.

---

## S5-06. CI/CD до прода (GitHub Actions)

**Агент:** devops

**Описание:**
Доработать GitHub Actions workflow:
- На push в main: lint → test → build → Docker build → push в GHCR → SSH на VPS → `docker compose pull && docker compose up -d`.
- Секреты: SSH_KEY, VPS_HOST, JWT_SECRET, GOOGLE_CLIENT_ID/SECRET, YANDEX_CLIENT_ID/SECRET.
- Rollback: если healthcheck не проходит — откат к предыдущему образу.
- Уведомление в Telegram (опционально).

**Тесты:**
- Dry-run CI pipeline (без деплоя).

**Зависимости:** S5-05, S1-10.

---

## S5-07. E2E-тесты (полный сценарий)

**Агент:** qa

**Описание:**
Написать e2e-тесты, покрывающие основной пользовательский путь:
1. Регистрация нового пользователя.
2. Создание проекта.
3. Добавление 3 комнат.
4. Обмер каждой комнаты (стены, окна, двери, элементы — данные из seed).
5. Загрузка фото (тестовое изображение).
6. Создание связей (adjacency).
7. Сборка плана.
8. Проверка вычисляемых полей (площади, периметры).
9. Генерация PDF (проверка: файл создан, размер > 0).
10. Дублирование проекта.
11. Удаление проекта (каскадное, включая фото на диске).

Инструмент: Supertest (API-уровень) или Playwright (browser-уровень, опционально).

**Тесты:**
- Все 11 шагов проходят последовательно без ошибок.

**Зависимости:** Sprint 4, S2-06 (seed).

---

## S5-08. Бэкап и мониторинг

**Агент:** devops

**Описание:**
Настроить:
- Cron-задача: ежедневный бэкап `metrico.db` + `uploads/` → внешнее хранилище (rsync на второй сервер или S3).
- Docker healthcheck для NestJS (GET /api/health).
- Простой endpoint `GET /api/health` — статус БД, место на диске.
- Логирование: NestJS Logger → stdout → Docker logs.

**Зависимости:** S5-05.

---

~~S5-09. Сброс пароля — перенесён в Sprint 2 (S2-10).~~
