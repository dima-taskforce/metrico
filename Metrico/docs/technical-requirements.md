# Metrico — Технические требования

Связанные документы: [Бизнес-требования](business-requirements.md) | [Use Cases](use-cases.md)

---

## 1. Архитектура

Клиент-серверное приложение. Фронтенд — SPA (Single Page Application), бэкенд — NestJS с модульной архитектурой. Взаимодействие через REST API. Фото загружаются на сервер через отдельный эндпоинт с мультипарт-загрузкой. Вся инфраструктура запускается через Docker Compose.

```
┌─────────────┐       REST API        ┌──────────────┐
│  React SPA  │ ◄──────────────────► │   NestJS     │
│  (Vite)     │       JSON + Files    │   (Prisma)   │
└─────────────┘                       └──────┬───────┘
                                             │
                                    ┌────────┴────────┐
                                    │   SQLite (DB)   │
                                    │   + файловое    │
                                    │   хранилище     │
                                    └─────────────────┘

Оркестрация: Docker Compose v2
Reverse proxy: Nginx + Certbot (SSL)
CI/CD: GitHub Actions
```

---

## 2. Технологический стек

### 2.1. Фронтенд

| Технология | Назначение |
|---|---|
| React 18 + TypeScript | UI, типизация |
| Vite | Сборка и dev-сервер |
| React Router v6 | Клиентский роутинг |
| Konva.js / React-Konva | 2D-план квартиры (Canvas/SVG), drag & drop комнат |
| Zustand | Управление состоянием визарда |
| Tailwind CSS | Стилизация, mobile-first |
| React Hook Form + Zod | Формы и валидация |
| PWA | Офлайн-заглушка, добавление на домашний экран |

### 2.2. Бэкенд

| Технология | Назначение |
|---|---|
| NestJS + TypeScript | API, модульная архитектура, DI, Guards, Pipes |
| Prisma | ORM, миграции, типизированный доступ к данным |
| SQLite | База данных (MVP) |
| @nestjs/jwt + Guards | Авторизация (JWT, httpOnly cookie) |
| @nestjs/passport | OAuth (Google, Яндекс) |
| multer (@nestjs/platform-express) | Загрузка файлов (фото) |
| sharp | Ресайз фото, генерация превью, очистка EXIF |
| @react-pdf/renderer | Генерация PDF обмерного плана |

### 2.3. Инфраструктура

| Технология | Назначение |
|---|---|
| Docker Compose v2 | Оркестрация сервисов (app, nginx) |
| Nginx | Reverse proxy, раздача статики фронтенда, SSL termination |
| Certbot | Автоматическое получение и обновление SSL-сертификатов (Let's Encrypt) |
| GitHub Actions | CI/CD: линтинг, тесты, сборка Docker-образов, деплой |

### 2.4. База данных

**SQLite** (один файл) через **Prisma ORM**. Prisma обеспечивает типизированные запросы, автогенерацию миграций и удобную работу со схемой. При росте нагрузки — миграция на PostgreSQL через смену провайдера в `prisma/schema.prisma` без переписывания логики.

### 2.5. Хранение файлов (фото)

Файлы хранятся на диске сервера в структурированных директориях: `uploads/{userId}/{projectId}/{roomId}/`. При загрузке автоматически создаётся превью (thumbnail). В базе хранятся только пути к файлам.

При масштабировании — переход на S3-совместимое хранилище (абстракция через NestJS-провайдер `FileStorageService`).

---

## 3. Глоссарий терминов (замеры)

| Термин | Определение |
|---|---|
| **Стяжка** | Черновой выравнивающий слой пола. Все высоты «от стяжки» измеряются от уровня черновой стяжки (до укладки чистового покрытия). |
| **Чистовой пол** | Финишное покрытие пола (ламинат, плитка и т.д.). Если стяжка ещё не сделана, замеры идут от плиты перекрытия. |
| **Простенок** | Участок стены между двумя проёмами (окна, двери) или между проёмом и углом комнаты. |
| **Кривизна стены** | Отклонение поверхности стены от вертикали, измеряется в 3 точках (низ, середина, верх) в миллиметрах. |
| **Откос** | Боковая внутренняя часть оконного или дверного проёма. |
| **Обмерный план** | Итоговый документ: 2D-схема квартиры со всеми размерами, фото, таблицами. |
| **Дашборд** | Интерактивная веб-версия обмерного плана (клик на комнату → детали). |

В модели данных и API используется единообразная терминология: все вертикальные размеры окон и дверей измеряются **от стяжки** (`fromScreed`), размеры радиаторов и щитков — **от пола** (`fromFloor`), что соответствует строительной практике (радиаторы устанавливаются после чистового пола).

---

## 4. Модель данных (Prisma-схема)

Все связи имеют явное каскадное удаление: удаление Project удаляет все Room, Wall, Opening, Element, Photo и FloorPlanLayout. Удаление Room каскадно удаляет все дочерние сущности.

**Важно:** каскадное удаление в Prisma удаляет только записи в БД. Файлы фото на диске удаляются отдельно — через `FileStorageService.deleteProjectFiles(projectId)` перед удалением записи в БД (реализуется в ProjectsService и RoomsService).

**Prisma-специфика (SQLite):**
- UUID хранится как String (SQLite не имеет нативного UUID-типа).
- Json поля хранятся как TEXT (Prisma SQLite driver).
- Все внешние ключи должны иметь `@@index` для производительности.
- Связи на одну и ту же модель (например, Angle → Wall дважды) требуют явного `@relation("имя")`.

### User
- id (String, @id @default(uuid()))
- email (String, @unique)
- passwordHash (String?)
- name (String)
- authProvider (enum: LOCAL / GOOGLE / YANDEX)
- projects → Project[] (onDelete: Cascade)
- passwordResetTokens → PasswordResetToken[] (onDelete: Cascade)
- createdAt, updatedAt (DateTime)

### PasswordResetToken
- id (String, @id @default(cuid()))
- userId → User (onDelete: Cascade)
- token (String, @unique) — bcrypt-хэш от SHA-256 оригинального токена
- expiresAt (DateTime) — TTL 1 час от момента создания
- usedAt (DateTime?) — null, если токен не использован; заполняется при успешном сбросе
- createdAt (DateTime, @default(now()))
- @@index([userId])

### Project
- id (String, @id @default(uuid()))
- userId → User (onDelete: Cascade)
- name (String)
- address (String?)
- objectType (enum: APARTMENT / STUDIO / APARTMENTS / HOUSE)
- defaultCeilingHeight (Float?)
- status (enum: DRAFT / COMPLETED)
- blueprintPhotoPath (String?)
- rooms → Room[] (onDelete: Cascade)
- floorPlanLayout → FloorPlanLayout? (onDelete: Cascade)
- createdAt, updatedAt

### Room
- id (String, @id @default(uuid()))
- projectId → Project (onDelete: Cascade)
- name (String)
- type (enum: KITCHEN / BEDROOM / BATHROOM / CORRIDOR / BALCONY / STORAGE / LIVING / OTHER)
- shape (enum: RECTANGLE / L_SHAPE / U_SHAPE / CUSTOM)
- ceilingHeight1, ceilingHeight2 (Float?)
- sortOrder (Int)
- isMeasured (Boolean, @default(false))
- walls → Wall[] (onDelete: Cascade)
- elements → RoomElement[] (onDelete: Cascade)
- photos → RoomPhoto[] (onDelete: Cascade)
- angles → Angle[] (onDelete: Cascade)
- createdAt, updatedAt
- @@index([projectId])

**Вычисляемые значения (не хранятся в БД, считаются на бэкенде при GET-запросах):**
- `computedArea` — площадь помещения.
- `computedPerimeter` — сумма длин всех сегментов (WallSegment.length) по периметру. Альтернативно: сумма Wall.length (должна совпадать с суммой сегментов).
- `computedVolume` — площадь × средняя высота потолка ((h1 + h2) / 2).

**Алгоритм вычисления площади (RoomsCalcService):**
Стены упорядочены по `sortOrder`. Углы между последовательными стенами берутся из сущности Angle (если не задан — считается 90°). Начальная вершина — (0, 0), начальное направление — вправо. Из длин стен и углов восстанавливаются координаты вершин полигона, затем площадь считается по формуле Гаусса (Shoelace formula). Для прямоугольников — упрощённая формула: длина × ширина.

### Wall
- id (String, @id @default(uuid()))
- roomId → Room (onDelete: Cascade)
- label (String, пара углов: «A-B», «B-C», «C-D»...)
- cornerFrom (String, начальный угол: «A», «B», «C»...)
- cornerTo (String, конечный угол: «B», «C», «D»...)
- length (Float)
- material (enum: CONCRETE / DRYWALL / BRICK / OTHER)
- wallType (enum: EXTERNAL / INTERNAL / ADJACENT)
- curvatureBottom, curvatureMiddle, curvatureTop (Float?, в мм)
- sortOrder (Int)
- segments → WallSegment[] (onDelete: Cascade)
- elevation → WallElevation? (onDelete: Cascade)
- @@index([roomId])

**Примечание по кривизне:** `curvatureAvg` вычисляется на лету как среднее трёх точек, не хранится в БД.

### WallSegment (сегмент обхода периметра)
- id (String, @id @default(uuid()))
- wallId → Wall (onDelete: Cascade)
- sortOrder (Int) — порядок сегмента от начального угла стены (cornerFrom)
- segmentType (enum: PLAIN / WINDOW / DOOR / PROTRUSION / NICHE / PARTITION)
- length (Float, мм — горизонтальный размер сегмента)
- depth (Float?, мм — глубина выступа или ниши, null для остальных типов)
- windowOpeningId → WindowOpening? (nullable, onDelete: Cascade) — если segmentType = WINDOW
- doorOpeningId → DoorOpening? (nullable, onDelete: Cascade) — если segmentType = DOOR
- description (String?)
- @@index([wallId])

Сегменты описывают обход периметра стены от cornerFrom к cornerTo. Типичная стена B-C с двумя окнами: [PLAIN(простенок), WINDOW(окно1), PLAIN(простенок), WINDOW(окно2), PLAIN(простенок)]. Сумма длин всех сегментов стены должна равняться Wall.length (автовалидация на бэкенде, допустимое расхождение ≤ 20мм).

Для сегментов типа PROTRUSION/NICHE поле depth обязательно (глубина выступа/ниши). Вертикальные размеры выступов фиксируются на развёртке (WallElevation).

### WallElevation (развёртка стены)
- id (String, @id @default(uuid()))
- wallId → Wall (@unique, onDelete: Cascade)
- svgData (String?) — кэш SVG-развёртки стены (генерируется на бэкенде)
- createdAt, updatedAt

Развёртка — фронтальный вид стены (прямоугольник: длина стены × высота потолка). На развёртке отображаются: проёмы (из WallSegment + WindowOpening/DoorOpening), элементы (RoomElement с positionX и offsetFromFloor), кривизна (Wall.curvatureBottom/Middle/Top). SVG генерируется автоматически из данных обмера; пользователь может инициировать перегенерацию.

### WallAdjacency (связь стен между комнатами — для сборки плана)
- id (String, @id @default(uuid()))
- wallAId → Wall @relation("adjacencyWallA", onDelete: Cascade)
- wallBId → Wall @relation("adjacencyWallB", onDelete: Cascade)
- projectId → Project (onDelete: Cascade)
- hasDoorBetween (Boolean, @default(false))
- doorOpeningId → DoorOpening? (nullable, onDelete: SetNull)
- createdAt
- @@unique([wallAId, wallBId]) — запрет дубликатов связей
- @@index([projectId])

Сущность описывает, что стена A в комнате X и стена B в комнате Y являются одной и той же физической стеной (примыкание). Используется на шаге 4 визарда для автоматической сборки плана.

**Инварианты (проверяются на бэкенде при создании):**
- wallA и wallB принадлежат разным комнатам одного проекта.
- Обратная связь (wallB→wallA) не создаётся как отдельная запись — проверка в обе стороны.
- Если hasDoorBetween = true, doorOpeningId должен быть не null.

### WindowOpening
- id (String, @id @default(uuid()))
- wallId → Wall (onDelete: Cascade)
- width, height (Float)
- sillHeightFromScreed (Float)
- revealWidthLeft, revealWidthRight (Float?)
- isFrenchDoor (Boolean, @default(false))
- photoPath (String?)

### DoorOpening
- id (String, @id @default(uuid()))
- wallId → Wall (onDelete: Cascade)
- width, heightFromScreed (Float)
- photoPath (String?)

**Примечание:** поле `connectsToRoomId` удалено. Информация о том, в какую комнату ведёт дверь, определяется через WallAdjacency (единственный источник правды). Это исключает рассинхронизацию данных.

### RoomElement (колонны, шахты, радиаторы, щитки)
- id (String, @id @default(uuid()))
- roomId → Room (onDelete: Cascade)
- elementType (enum: COLUMN / VENT_SHAFT / RADIATOR / ELECTRICAL_PANEL / LOW_VOLTAGE_PANEL / PIPE)
- width, height, depth (Float?, зависит от типа)
- positionX (Float?, мм — позиция от начала стены cornerFrom, для размещения на развёртке)
- offsetFromWall, offsetFromFloor (Float?)
- wallId → Wall? (к какой стене привязан)
- cornerLabel (String?, например «B» — для угловых элементов, вент-шахта в углу)
- description (String?)
- photoPath (String?)

**Обязательность полей по типу элемента (валидация в CreateElementDto / UpdateElementDto):**

| Поле | COLUMN | VENT_SHAFT | RADIATOR | ELECTRICAL_PANEL | LOW_VOLTAGE_PANEL | PIPE |
|------|--------|------------|----------|------------------|-------------------|------|
| width | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (диаметр) |
| height | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| depth | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (диаметр) |
| positionX | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| wallId | — (может быть null, колонна в центре) | ✓ | ✓ | ✓ | ✓ | — |
| offsetFromWall | — | — | ✓ | — | — | ✓ |
| offsetFromFloor | — | — | ✓ | ✓ | ✓ | — |

Валидация реализуется через conditional Zod-схему или NestJS custom Pipe.

### RoomPhoto
- id (String, @id @default(uuid()))
- roomId → Room (onDelete: Cascade)
- photoType (enum: OVERVIEW_BEFORE / OVERVIEW_AFTER / DETAIL)
- filePath (String)
- createdAt

### Angle (угол в точке)
- id (String, @id @default(uuid()))
- roomId → Room (onDelete: Cascade)
- cornerLabel (String, например «B» — точка угла)
- wallAId → Wall @relation("angleWallA") — стена, входящая в угол (например A-B)
- wallBId → Wall @relation("angleWallB") — стена, выходящая из угла (например B-C)
- isRightAngle (Boolean, @default(true))
- angleDegrees (Float?)
- photoPath (String?)
- @@index([roomId])

### FloorPlanLayout (данные сборки плана)
- id (String, @id @default(uuid()))
- projectId → Project (@unique, onDelete: Cascade)
- layoutJson (Json — позиции и повороты комнат на плане)
- svgData (String?, сгенерированный SVG)

**Структура layoutJson** (Zod-схема для валидации на бэкенде):
```
{
  rooms: [{
    roomId: string,
    x: number,         // позиция центра комнаты по X (мм, реальная система координат)
    y: number,         // позиция центра по Y (мм)
    rotation: number   // угол поворота (0, 90, 180, 270)
  }]
}
```
**Важно:** координаты хранятся в **миллиметрах** (реальная система координат, совпадает с Wall.length). Масштабирование мм→пиксели выполняется на клиенте при рендеринге Konva (коэффициент `scale = canvasWidth / planWidthMm`). Это обеспечивает корректный PDF-масштаб и устройство-независимость.
- createdAt, updatedAt

---

## 5. Модульная архитектура NestJS

### Структура модулей

```
src/
├── app.module.ts              # Корневой модуль
├── auth/                      # AuthModule
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/            # JWT, Google, Yandex стратегии
│   ├── guards/                # JwtAuthGuard, RolesGuard
│   └── dto/                   # RegisterDto, LoginDto
├── projects/                  # ProjectsModule
│   ├── projects.controller.ts
│   ├── projects.service.ts
│   └── dto/                   # CreateProjectDto, UpdateProjectDto
├── rooms/                     # RoomsModule
│   ├── rooms.controller.ts
│   ├── rooms.service.ts
│   ├── rooms-calc.service.ts  # Вычисление площади, периметра, объёма
│   └── dto/
├── walls/                     # WallsModule
│   ├── walls.controller.ts
│   ├── walls.service.ts
│   └── dto/
├── openings/                  # OpeningsModule (окна + двери)
│   ├── openings.controller.ts
│   ├── openings.service.ts
│   └── dto/
├── elements/                  # ElementsModule
│   ├── elements.controller.ts
│   ├── elements.service.ts
│   └── dto/
├── segments/                  # SegmentsModule (сегменты стен)
│   ├── segments.controller.ts
│   ├── segments.service.ts
│   └── dto/
├── elevations/                # ElevationsModule (развёртки стен)
│   ├── elevations.controller.ts
│   ├── elevations.service.ts
│   └── dto/
├── angles/                    # AnglesModule
│   ├── angles.controller.ts
│   ├── angles.service.ts
│   └── dto/
├── photos/                    # PhotosModule
│   ├── photos.controller.ts
│   ├── photos.service.ts
│   └── file-storage.service.ts  # Абстракция хранилища (диск / S3)
├── plan/                      # PlanModule
│   ├── plan.controller.ts
│   ├── plan.service.ts
│   ├── plan-assembler.service.ts  # Алгоритм сборки SVG
│   └── pdf-generator.service.ts   # Генерация PDF
├── adjacency/                 # AdjacencyModule (связи стен)
│   ├── adjacency.controller.ts
│   ├── adjacency.service.ts
│   └── dto/
├── prisma/                    # PrismaModule (общий)
│   ├── prisma.service.ts
│   └── prisma.module.ts
└── common/                    # Общие утилиты
    ├── pipes/                 # FileValidationPipe (MIME, размер)
    ├── interceptors/          # TransformInterceptor
    └── filters/               # HttpExceptionFilter
```

### Зависимости между модулями

```
AppModule
├── AuthModule (standalone)
├── PrismaModule (global)
├── ProjectsModule → PrismaModule
├── RoomsModule → PrismaModule, PhotosModule
├── WallsModule → PrismaModule
├── OpeningsModule → PrismaModule
├── ElementsModule → PrismaModule, PhotosModule
├── SegmentsModule → PrismaModule
├── ElevationsModule → PrismaModule, SegmentsModule, RoomsModule
├── AnglesModule → PrismaModule
├── PhotosModule → PrismaModule (FileStorageService)
├── AdjacencyModule → PrismaModule
└── PlanModule → PrismaModule, AdjacencyModule, RoomsModule
```

Циклических зависимостей нет. PrismaModule регистрируется как `@Global()` и доступен всем модулям. PhotosModule импортируется только теми модулями, которым нужна загрузка файлов.

---

## 6. API (основные эндпоинты)

Все защищённые эндпоинты требуют JWT (через `@UseGuards(JwtAuthGuard)`). Валидация входных данных — через `class-validator` + `ValidationPipe` (глобальный).

### Авторизация (AuthModule)
- `POST /api/auth/register` — регистрация (email + password). Устанавливает authProvider = LOCAL.
- `POST /api/auth/login` — вход, возвращает access token + httpOnly refresh cookie.
- `POST /api/auth/refresh` — обновление JWT по refresh cookie.
- `GET /api/auth/google` — редирект на Google OAuth.
- `GET /api/auth/google/callback` — callback от Google, устанавливает authProvider = GOOGLE.
- `GET /api/auth/yandex` — редирект на Яндекс OAuth.
- `GET /api/auth/yandex/callback` — callback от Яндекса, устанавливает authProvider = YANDEX.
- `POST /api/auth/forgot-password` — генерация одноразового токена (UUID, TTL 1 час), отправка email со ссылкой для сброса пароля.
- `POST /api/auth/reset-password` — проверка токена, установка нового пароля.

**Политика OAuth-провайдеров (один email — один провайдер):**
При регистрации через OAuth фиксируется `authProvider` (GOOGLE или YANDEX). Если пользователь с тем же email пытается войти через другой OAuth-провайдер — вход отклоняется с ошибкой: «Аккаунт с этим email уже зарегистрирован через {провайдер}. Войдите через {провайдер}.» Привязка нескольких провайдеров к одному аккаунту — в backlog.

Аналогично: если пользователь зарегистрирован через LOCAL (email + пароль), вход через OAuth с тем же email → ошибка с предложением войти через пароль (или наоборот).

### Проекты (ProjectsModule)
- `GET /api/projects` — список проектов пользователя.
- `POST /api/projects` — создать проект. Body: `CreateProjectDto { name, address?, objectType, defaultCeilingHeight? }`.
- `GET /api/projects/:id` — получить проект со всеми вложенными данными (rooms, walls, openings, elements, photos, adjacencies, floorPlanLayout). Включает вычисляемые поля (площадь, периметр, объём каждой комнаты).
- `PUT /api/projects/:id` — обновить проект. Body: `UpdateProjectDto` (partial).
- `DELETE /api/projects/:id` — удалить проект (каскадно удаляет все rooms, walls, photos, файлы на диске).
- `POST /api/projects/:id/duplicate` — дублировать проект (глубокая копия).
- `POST /api/projects/:id/blueprint` — загрузить фото планировки от застройщика (multipart/form-data). Сохраняет файл, записывает путь в `Project.blueprintPhotoPath`. Используется на шаге 1 визарда как референс.

### Комнаты (RoomsModule)
- `POST /api/projects/:projectId/rooms` — добавить комнату. Body: `CreateRoomDto { name, type, shape }`.
- `PUT /api/rooms/:id` — обновить комнату. Body: `UpdateRoomDto` (partial, включая ceilingHeight1/2).
- `DELETE /api/rooms/:id` — удалить комнату (каскадно).
- `PUT /api/projects/:projectId/rooms/reorder` — изменить порядок. Body: `{ roomIds: string[] }`.

### Стены (WallsModule)
- `POST /api/rooms/:roomId/walls` — добавить стену. Body: `CreateWallDto { label, cornerFrom, cornerTo, length, material, wallType }`.
- `PUT /api/walls/:id` — обновить стену. Body: `UpdateWallDto` (partial, включая кривизну).
- `DELETE /api/walls/:id` — удалить стену (каскадно удаляет окна, двери, adjacency).

### Сегменты стен (SegmentsModule)
- `POST /api/walls/:wallId/segments` — добавить сегмент. Body: `CreateSegmentDto { segmentType, length, depth?, sortOrder, windowOpeningId?, doorOpeningId?, description? }`.
- `PUT /api/segments/:id` — обновить сегмент.
- `DELETE /api/segments/:id` — удалить сегмент.
- `POST /api/walls/:wallId/segments/validate` — валидировать сумму сегментов vs длина стены. Ответ: `{ wallLength, segmentsSum, difference, isValid }`.

### Развёртки стен (ElevationsModule)
- `GET /api/walls/:wallId/elevation` — получить развёртку (SVG + данные). Генерируется на лету из сегментов, проёмов и элементов.
- `POST /api/walls/:wallId/elevation/generate` — принудительно перегенерировать SVG развёртки.

### Связи стен (AdjacencyModule)
- `POST /api/projects/:projectId/adjacencies` — создать связь. Body: `CreateAdjacencyDto { wallAId, wallBId, hasDoorBetween?, doorOpeningId? }`.
- `GET /api/projects/:projectId/adjacencies` — получить все связи проекта.
- `DELETE /api/adjacencies/:id` — удалить связь.

### Окна и двери (OpeningsModule)
- `POST /api/walls/:wallId/windows` — добавить окно. Body: `CreateWindowDto { width, height, sillHeightFromScreed, revealWidthLeft?, revealWidthRight?, isFrenchDoor? }`.
- `PUT /api/windows/:id` — обновить окно.
- `DELETE /api/windows/:id` — удалить окно.
- `POST /api/walls/:wallId/doors` — добавить дверь. Body: `CreateDoorDto { width, heightFromScreed }`.
- `PUT /api/doors/:id` — обновить дверь.
- `DELETE /api/doors/:id` — удалить дверь.

### Элементы комнаты (ElementsModule)
- `POST /api/rooms/:roomId/elements` — добавить элемент. Body: `CreateElementDto { elementType, width?, height?, depth?, positionX?, offsetFromWall?, offsetFromFloor?, wallId?, cornerLabel?, description? }`.
- `PUT /api/elements/:id` — обновить.
- `DELETE /api/elements/:id` — удалить.

### Углы (AnglesModule)
- `POST /api/rooms/:roomId/angles` — добавить угол. Body: `CreateAngleDto { cornerLabel, wallAId, wallBId, isRightAngle?, angleDegrees? }`.
- `PUT /api/angles/:id` — обновить.
- `DELETE /api/angles/:id` — удалить.
- `POST /api/angles/:id/photo` — загрузить фото угла (через FileStorageService pipeline).

### Фото (PhotosModule)
- `POST /api/rooms/:roomId/photos` — загрузить фото комнаты (multipart/form-data). Query: `?type=OVERVIEW_BEFORE|OVERVIEW_AFTER|DETAIL`.
- `POST /api/elements/:elementId/photo` — загрузить фото элемента (заменяет предыдущее).
- `POST /api/windows/:windowId/photo` — загрузить фото окна.
- `POST /api/doors/:doorId/photo` — загрузить фото двери.
- `DELETE /api/photos/:id` — удалить фото (из БД + с диска).
- `GET /uploads/:userId/:projectId/:roomId/:filename` — получить фото (статика через Nginx).
- `GET /uploads/:userId/:projectId/:roomId/thumb/:filename` — получить превью.

### План (PlanModule)
- `GET /api/projects/:id/plan` — получить данные плана. Ответ: `{ layoutJson, svgData, adjacencies[], rooms[] с computedArea/Perimeter }`.
- `PUT /api/projects/:id/plan` — сохранить/обновить layoutJson (позиции и повороты комнат).
- `POST /api/projects/:id/plan/assemble` — запустить автоматическую сборку SVG из adjacency-связей и размеров стен. Ответ: `{ svgData, layoutJson }`.
- `GET /api/projects/:id/plan/pdf` — сгенерировать и скачать PDF обмерного плана.

### Системные
- `GET /api/health` — статус приложения: состояние БД, свободное место на диске. Используется для Docker healthcheck и мониторинга.

---

## 7. Конвейер загрузки фото (File Upload Pipeline)

```
Клиент (браузер)                     Сервер (NestJS)
─────────────────                     ───────────────
1. <input capture="environment">
2. Canvas resize (max 2048px,        
   JPEG quality 80%)                 
3. POST multipart/form-data ───────► 4. FileValidationPipe:
                                        - проверка MIME (image/jpeg, image/png, image/webp)
                                        - проверка размера (≤ 10 МБ)
                                     5. multer → сохранение во временную директорию
                                     6. PhotosService:
                                        - sharp: очистка EXIF-данных
                                        - sharp: генерация thumbnail (400px по большей стороне)
                                        - перемещение в uploads/{userId}/{projectId}/{roomId}/
                                        - сохранение пути в БД (RoomPhoto или element.photoPath)
                                     7. Ответ: { id, filePath, thumbPath }
```

На клиенте используется `canvas.toBlob()` для ресайза перед отправкой. Библиотека не нужна — нативное API браузера.

---

## 8. Алгоритм сборки плана (Plan Assembly)

На шаге 4 визарда приложение автоматически строит 2D-план квартиры из данных обмеров.

**Входные данные:**
- Список комнат с размерами стен (Wall[], теперь идентифицируются по паре углов cornerFrom/cornerTo).
- Связи WallAdjacency (какие стены в разных комнатах являются общими).

**Алгоритм (PlanAssemblerService):**

1. Для каждой комнаты строится полигон из длин стен и углов (по умолчанию 90°, если не задано иное).
2. Первая комната размещается в начале координат.
3. Для каждой связи WallAdjacency: вторая комната позиционируется так, чтобы wallA и wallB совпали по координатам (с учётом поворота). **Частичное перекрытие стен:** если длины wallA и wallB различаются (например, коридор 725мм примыкает к стене кухни 3390мм), комнаты стыкуются по начальной точке меньшей стены. Оставшийся участок длинной стены остаётся свободным.
4. Если есть несвязанные комнаты — они размещаются рядом с пометкой «Связь не задана».
5. Результат сохраняется как `layoutJson` (позиции/повороты) и `svgData` (готовый SVG для отображения).

**Ручная корректировка:**
- Пользователь может через UI (React-Konva): перетаскивать комнаты, поворачивать на 90°, менять привязку стены.
- Изменения сохраняются в `layoutJson` через `PUT /api/projects/:id/plan`.
- SVG перегенерируется на клиенте (Konva → SVG export) и отправляется на сервер.

---

## 9. Автосохранение

Фронтенд отправляет изменения на сервер с дебаунсом 3 секунды после последнего ввода (или каждые 30 секунд, если пользователь активно работает). Каждый изменённый ресурс сохраняется отдельным `PUT`-запросом на соответствующий CRUD endpoint (PUT /api/walls/:id, PUT /api/segments/:id, PUT /api/windows/:id и т.д.) — без «fat PUT» на комнату. Изменения группируются в очередь и отправляются последовательно, чтобы избежать race conditions. При потере соединения — показывается индикатор «Нет связи», изменения копятся локально (в Zustand store) и отправляются при восстановлении в порядке очереди.

---

## 10. Требования к мобильной версии

Основной сценарий использования — мобильный телефон (вертикальная ориентация). Дизайн mobile-first:

- Все формы — в одну колонку, крупные поля ввода (min 44px touch target).
- Камера вызывается через `<input type="file" accept="image/*" capture="environment">`.
- Визард — один подшаг на экране, кнопки «Назад» / «Далее» внизу.
- Редактор плана (шаг 4) должен работать с touch-жестами (pinch-to-zoom, drag).
- Поддержка PWA: manifest.json, service worker (офлайн-заглушка «Нет интернета, данные сохранятся при подключении»).

---

## 11. Безопасность

- JWT-авторизация через @nestjs/jwt (access token — 15 мин, refresh token — 30 дней, httpOnly cookie).
- Пароли хэшируются через bcrypt (cost factor ≥ 12).
- Валидация входных данных: class-validator + class-transformer (глобальный ValidationPipe в NestJS).
- Загружаемые файлы: FileValidationPipe проверяет MIME-type (только image/jpeg, image/png, image/webp), ограничение размера (10 МБ на фото), очистка EXIF-данных через sharp.
- Rate limiting: @nestjs/throttler.
- CORS: настроен в NestJS — только разрешённые домены.
- SQL-инъекции: Prisma использует параметризованные запросы из коробки.
- Helmet: заголовки безопасности (X-Frame-Options, CSP и т.д.).

---

## 12. Производительность

- Фото: сжатие на клиенте перед отправкой (canvas resize до max 2048px по большей стороне, качество JPEG 80%). На сервере — генерация thumbnail 400px через sharp.
- API: ответ на чтение < 200мс, запись < 500мс.
- Размер бандла фронтенда: < 300 КБ gzip (code splitting по шагам визарда через React.lazy).
- Ленивая загрузка фото в дашборде и плане.
- Статика фронтенда раздаётся через Nginx (gzip, кэш-заголовки).

---

## 13. Деплой (MVP)

Docker Compose на одном VPS. Два контейнера: приложение (NestJS + собранный фронтенд) и Nginx (reverse proxy, SSL).

### Docker Compose — сервисы

- **app** — NestJS-приложение. Volume: `./data:/app/data` (SQLite + uploads).
- **nginx** — reverse proxy. Раздаёт статику фронтенда, проксирует `/api` в app. Certbot для SSL.

### Структура на сервере
```
/opt/metrico/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── certbot/              # SSL-сертификаты
├── data/
│   ├── metrico.db        # SQLite база (volume)
│   └── uploads/          # фото (volume)
└── .env                  # переменные окружения
```

### CI/CD (GitHub Actions)

- **На push в main**: линтинг → тесты → сборка Docker-образа → push в container registry → деплой на VPS (SSH + docker compose pull + up).
- **На PR**: линтинг → тесты → preview (опционально).

### Бэкап

Cron-задача на VPS: ежедневное копирование `metrico.db` + `uploads/` на внешнее хранилище (S3 или rsync на второй сервер).

---

## 14. Спринты

Детальные задачи, агенты и зависимости — в папке `sprints/`. Каждый агент работает по единому пайплайну: `docs/agent-pipeline.md`.

- **Sprint 1 — Каркас**: монорепо, Docker, Prisma-схема + миграции, авторизация (JWT), CRUD проектов/комнат, скелет фронтенда (роутинг, визард), GitHub Actions.
- **Sprint 2 — Обмер**: полная форма шага 3 (стены, окна, двери, элементы, углы, кривизна), загрузка фото (pipeline), автосохранение, валидация, seed-данные и тесты.
- **Sprint 3 — План**: WallAdjacency UI, автосборка SVG (PlanAssemblerService), ручная корректировка (Konva), сводка, вычисляемые поля (площадь, периметр, объём).
- **Sprint 4 — Результат**: интерактивный дашборд (UC-04), генерация PDF с условными обозначениями, экспорт.
- **Sprint 5 — Полировка**: OAuth (Google, Яндекс), PWA, визуальные подсказки, мобильная адаптация, SSL, CI/CD до прода, e2e-тесты.

## 15. Backlog (за пределами MVP)

- Подтверждение email при регистрации (верификация через ссылку в письме).
- Привязка нескольких OAuth-провайдеров к одному аккаунту (link accounts).
- Расширение `RoomElement.elementType`: выводы канализации (SEWAGE_OUTLET), датчики пожаротушения (FIRE_SENSOR), ригели/балки (BEAM), ступени (STEP).
- Шаблоны типовых планировок новостроек.
- Калькулятор материалов (с ценами).
- Экспорт PDF без водяного знака (премиум).
- Распознавание замеров по фото (AI).
- AR-режим замера через камеру телефона.
