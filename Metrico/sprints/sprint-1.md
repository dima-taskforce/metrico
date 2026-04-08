# Sprint 1 — Каркас

Цель: работающий скелет приложения — монорепо, Docker, БД, авторизация, CRUD проектов/комнат, пустой визард с навигацией.

Пайплайн: `docs/agent-pipeline.md`

---

## S1-01. Инициализация монорепо

**Агент:** devops

**Описание:**
Создать структуру монорепо с двумя проектами: `client/` (React + Vite + TypeScript) и `server/` (NestJS + TypeScript). Корневой `package.json` с npm workspaces. ESLint + Prettier конфиг (общий). `.gitignore`, `.editorconfig`.

Настроить npm-скрипты в корневом `package.json`:
- `npm run lint` — запуск ESLint на обоих проектах.
- `npm run typecheck` — проверка типов TypeScript.
- `npm run test` — запуск Jest (server) и Vitest (client).
- `npm run build` — сборка обоих проектов.
- `npm run dev` — запуск dev-серверов (concurrently).

**Результат:**
- Все 5 npm-скриптов работают из корня.
- TypeScript strict mode включён.
- ESLint + Prettier конфиг единый.

**Зависимости:** нет.

---

## S1-02. Docker Compose + Nginx

**Агент:** devops

**Описание:**
Настроить Docker Compose v2 с двумя сервисами: `app` (NestJS, Dockerfile с multi-stage build) и `nginx` (reverse proxy). Nginx проксирует `/api` → app:3000, раздаёт статику из `client/dist/`. Volume для данных: `./data:/app/data`.

Nginx location-блоки:
- `/` → статика фронтенда (client/dist/).
- `/api` → proxy_pass http://app:3000.
- `/uploads` → alias /app/data/uploads/ (раздача фото напрямую, без прохода через NestJS).

**Результат:**
- `docker compose up` поднимает оба сервиса.
- `http://localhost` показывает фронтенд.
- `http://localhost/api` проксируется в NestJS.
- `http://localhost/uploads/...` раздаёт фото.

**Зависимости:** S1-01.

---

## S1-03. Prisma-схема и миграции

**Агент:** nestjs-expert

**Описание:**
Создать `prisma/schema.prisma` с полной моделью данных из `technical-requirements.md` (раздел 4). Все сущности: User, Project, Room, Wall, WallAdjacency, WindowOpening, DoorOpening, RoomElement, RoomPhoto, Angle, FloorPlanLayout, **RefreshToken**, **PasswordResetToken**. Все enum-ы, все связи с `onDelete: Cascade`. Провайдер: SQLite.

**Обязательные дополнительные модели (без них S1-04 и S3-07 не скомпилируются):**

- **RefreshToken** (нужна S1-04 AuthModule — stateful JWT): `userId → User (onDelete: Cascade)`, `tokenHash String @unique` (SHA-256 хэш от оригинального токена), `expiresAt DateTime`, `revokedAt DateTime?`, `createdAt DateTime @default(now())`. Индекс: `@@index([userId])`.
- **PasswordResetToken** (нужна S3-07 PasswordResetModule): `userId → User (onDelete: Cascade)`, `tokenHash String @unique` (bcrypt-хэш от SHA-256 токена), `expiresAt DateTime`, `usedAt DateTime?`, `createdAt DateTime @default(now())`.

Новые модели в связи с переизучением потока обмера (углы = буквы, стены = пары углов, новая сегментация):

- **WallSegment** (упорядоченные сегменты периметра): wallId, sortOrder, segmentType (enum: PLAIN, WINDOW, DOOR, PROTRUSION, NICHE, PARTITION), length, depth?, windowOpeningId?, doorOpeningId?.
- **WallElevation** (развёртка стены): wallId (unique), svgData?.
- **Wall**: добавить поля `cornerFrom` (id угла A) и `cornerTo` (id угла B), заменить `label: String` примерами "A-B". Заменить связи: вместо `windows WindowOpening[]` и `doors DoorOpening[]` — `segments WallSegment[]` и `elevation WallElevation?`.
- **WindowOpening**: удалить pierWidthLeft, pierWidthRight.
- **DoorOpening**: удалить pierWidthLeft, pierWidthRight.
- **RoomElement**: добавить positionX (Float?, позиция на развёртке от начала стены) и cornerLabel (String?, буква угла, если элемент углов: "A", "B" и т.д.).
- **Angle**: добавить cornerLabel (String, буква угла: "A", "B", "C", "D"...).

Запустить первую миграцию: `npx prisma migrate dev --name init`.

Создать `PrismaModule` (глобальный) и `PrismaService`.

**Результат:**
- `prisma/schema.prisma` полностью соответствует техтребованиям и новой архитектуре.
- Миграция применена, `metrico.db` создан.
- `PrismaService` доступен во всех модулях.

**Зависимости:** S1-01.

---

## S1-04. Модуль авторизации (AuthModule)

**Агент:** nestjs-expert

**Описание:**
Реализовать:
- `POST /api/auth/register` — регистрация (email + пароль). Хэширование через bcrypt (cost ≥ 12). Устанавливает authProvider = LOCAL.
- `POST /api/auth/login` — вход. Возвращает access token (JWT, 15 мин) + httpOnly refresh cookie (30 дней). **Создаёт запись RefreshToken** (tokenHash = SHA-256 от оригинального токена, expiresAt = +30 дней).
- `POST /api/auth/refresh` — обновление access token по refresh cookie. **Ищет RefreshToken по tokenHash, проверяет revokedAt и expiresAt**. При успехе — аннулирует старый токен (revokedAt = now()), создаёт новый (rotation).
- `POST /api/auth/logout` — аннулирование текущего refresh токена (revokedAt = now()). Очищает httpOnly cookie.
- `JwtAuthGuard` — guard для защиты эндпоинтов.
- `@CurrentUser()` — кастомный декоратор для получения текущего пользователя.

DTO: `RegisterDto`, `LoginDto` с class-validator.

**RefreshToken — stateful JWT (CRIT-02):** refresh токены хранятся в таблице `RefreshToken` для поддержки инвалидации при logout и смене пароля (S3-07). Оригинальный токен хранится только в httpOnly cookie, в БД — SHA-256 хэш.

**Тесты:**
- Регистрация: успех, дубликат email, невалидный email.
- Логин: успех, неверный пароль, несуществующий пользователь, создаётся RefreshToken.
- Refresh: успех (rotation), невалидный токен, revoked токен, истёкший токен.
- Logout: токен помечается revoked, повторный refresh возвращает 401.
- Guard: отклонение без токена, с истёкшим токеном.

**Результат:**
- Авторизация работает через stateful JWT.
- Все эндпоинты покрыты тестами.

**Зависимости:** S1-03.

---

## S1-05. CRUD проектов (ProjectsModule)

**Агент:** nestjs-expert

**Описание:**
Реализовать:
- `GET /api/projects` — список проектов текущего пользователя.
- `POST /api/projects` — создать проект. Body: `CreateProjectDto { name, address?, objectType, defaultCeilingHeight? }`.
- `GET /api/projects/:id` — получить проект (с проверкой владельца).
- `PUT /api/projects/:id` — обновить.
- `DELETE /api/projects/:id` — удалить (каскадно).
- `POST /api/projects/:id/duplicate` — глубокая копия.
- `POST /api/projects/:id/blueprint` — загрузка фото планировки от застройщика (multipart/form-data). Сохраняет файл через `FileStorageService`, записывает путь в `Project.blueprintPhotoPath`.

**FileStorageService (базовая версия):** в рамках этой задачи создать `PhotosModule` с базовым `FileStorageService`, который реализует:
- `saveFile(userId, projectId, file): Promise<string>` — сохранение файла на диск в `uploads/{userId}/{projectId}/`, возврат относительного пути.
- `deleteFile(filePath): Promise<void>` — удаление файла с диска.
- `deleteProjectFiles(projectId): Promise<void>` — удаление всех файлов проекта (для каскадного удаления).

Полный конвейер обработки фото (EXIF-очистка, thumbnail через sharp, валидация MIME/размера) реализуется в **S2-05**, где `FileStorageService` будет расширен.

Все эндпоинты защищены `JwtAuthGuard`. Проверка владельца проекта в каждом запросе.

Также настроить глобальные middleware безопасности в `main.ts`:
- **Helmet** — заголовки безопасности (X-Frame-Options, CSP и т.д.).
- **@nestjs/throttler** — rate limiting (по умолчанию 60 запросов/мин).
- **CORS** — разрешённые домены из .env.

**Тесты:**
- CRUD: создание, чтение, обновление, удаление.
- Безопасность: чужой проект недоступен.
- Дублирование: проверка глубокой копии.
- Rate limiting: 61-й запрос → 429.

**Зависимости:** S1-04.

---

## S1-06. CRUD комнат (RoomsModule)

**Агент:** nestjs-expert

**Описание:**
Реализовать:
- `POST /api/projects/:projectId/rooms` — добавить комнату. Body: `CreateRoomDto { name, type, shape }`.
- `PUT /api/rooms/:id` — обновить.
- `DELETE /api/rooms/:id` — удалить (каскадно).
- `PUT /api/projects/:projectId/rooms/reorder` — изменить порядок. Body: `{ roomIds: string[] }`.

Проверка: пользователь — владелец проекта.

**Тесты:**
- CRUD комнат.
- Reorder: проверка нового порядка.
- Каскадное удаление: удаление комнаты удаляет стены.

**Зависимости:** S1-05.

---

## S1-07. Скелет фронтенда (роутинг + визард)

**Агент:** react-expert

**Описание:**
Настроить:
- React Router v6: `/login`, `/register`, `/projects`, `/projects/:id/wizard`, `/projects/:id/plan`.
- Layout: шапка (логотип + пользователь + выход), контент.
- Страницы-заглушки для всех роутов.
- Zustand store: `useAuthStore` (token, user, login/logout/register).
- API-клиент (`api.ts`): fetch-обёртка с JWT, refresh-логикой.
- Компонент визарда: `WizardLayout` с шагами (1–5), навигация «Назад»/«Далее», прогресс-бар.
- Tailwind CSS: настройка, базовая тема, mobile-first breakpoints.

**Тесты:**
- Роутинг: переходы, защита от неавторизованного доступа.
- Auth store: логин, логаут, refresh.
- WizardLayout: навигация по шагам.

**Зависимости:** S1-02, S1-04.

---

## S1-08. Страницы авторизации (Login / Register)

**Агент:** react-expert

**Описание:**
Реализовать:
- Страница логина: email + пароль, кнопка «Войти», ссылка на регистрацию.
- Страница регистрации: email + пароль + подтверждение пароля, кнопка «Создать аккаунт».
- React Hook Form + Zod-схемы валидации.
- Интеграция с `useAuthStore` и API.
- Редирект в `/projects` после успешного входа.

**Тесты:**
- Валидация форм: пустые поля, невалидный email, несовпадение паролей.
- Успешный вход и регистрация (mock API).

**Зависимости:** S1-07.

---

## S1-09. Страница «Мои проекты»

**Агент:** react-expert

**Описание:**
Реализовать:
- Список проектов (карточки): название, дата, статус (черновик/завершён).
- Кнопка «Новый проект» → модальное окно (название, тип объекта).
- Удаление проекта (с подтверждением).
- Клик по карточке → переход в визард.
- Zustand store: `useProjectsStore` — методы: `fetchProjects()`, `createProject(dto)`, `deleteProject(id)`, `duplicateProject(id)`, `selectProject(id)`. Состояние: `projects[]`, `currentProject`, `isLoading`.
- Пустое состояние: «У вас ещё нет проектов. Создайте первый!».

**Тесты:**
- Рендеринг списка проектов.
- Создание проекта.
- Удаление проекта.
- Пустое состояние.

**Зависимости:** S1-07, S1-05.

---

## S1-10. GitHub Actions (CI)

**Агент:** devops

**Описание:**
Настроить:
- Workflow на PR: установка зависимостей → lint → typecheck → test → build.
- Workflow на push в main: lint → test → build → сборка Docker-образа → push в container registry (GitHub Container Registry).
- Кэширование node_modules.

**Результат:**
- PR не мержится, если CI красный.
- Образ собирается и пушится при мерже в main.

**Зависимости:** S1-01, S1-02.

---

## S1-11. Шаг 1 визарда — общая информация о квартире

**Агент:** react-expert

**Описание:**
Реализовать UI для шага 1 визарда (UC-03, шаг 1):
- Форма: тип объекта (выпадающий список: квартира, студия, апартаменты, дом), адрес (текстовое поле, опционально), высота потолков по умолчанию (числовое поле, мм).
- Возможность загрузить фото планировки от застройщика (Project.blueprintPhotoPath) — как референс для пользователя. Загрузка через `POST /api/projects/:id/blueprint` (multipart/form-data).
- React Hook Form + Zod. Данные сохраняются через `PUT /api/projects/:id`.
- Кнопка «Далее» → шаг 2.

**Тесты:**
- Валидация формы. Загрузка фото. Сохранение данных.

**Зависимости:** S1-07, S1-05.
