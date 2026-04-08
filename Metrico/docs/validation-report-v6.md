# Validation Report v6 — Metrico

**Дата:** 2026-04-08  
**Валидатор:** Senior Developer / Architect (Claude Code)  
**Статус документов:** пост-фиксовый срез (после auto-fix коммита 83e1961)  
**Покрытие:** business-requirements.md, use-cases.md, technical-requirements.md, agent-pipeline.md, sprints/sprint-1.md–5.md, seed/test-apartment.json, CLAUDE.md  

---

## Резюме

| Уровень | Кол-во |
|---------|--------|
| CRITICAL | 2 |
| HIGH     | 6 |
| MEDIUM   | 7 |
| LOW      | 4 |
| **Итого**| **19** |

Предыдущие критические проблемы из v5 (CRIT-01/02/03, HIGH-01/04) закрыты. Обнаружены новые проблемы — часть из них блокирующие.

---

## CRITICAL

### CRIT-01. S1-03 не включает модели RefreshToken и PasswordResetToken

**Файл:** `sprints/sprint-1.md`, задача S1-03  
**Связанные файлы:** `docs/technical-requirements.md` (секция 4, модели RefreshToken, PasswordResetToken)

**Описание:**  
Задача S1-03 ("Prisma-схема и миграции") содержит перечень сущностей для создания:
> "Все сущности: User, Project, Room, Wall, WallAdjacency, WindowOpening, DoorOpening, RoomElement, RoomPhoto, Angle, FloorPlanLayout."

В этом списке **отсутствуют:**
- `RefreshToken` — нужен S1-04 (AuthModule) для stateful JWT, без него логин/логаут/refresh работать не будут
- `PasswordResetToken` — нужен S3-07 (PasswordResetModule)

Если агент реализует S1-03 по инструкциям задачи, он создаст схему без `RefreshToken`. Когда агент S1-04 попытается использовать `prisma.refreshToken`, он получит ошибку компиляции Prisma-клиента.

**Воспроизведение:** агент nestjs-expert читает S1-03, видит список сущностей, не видит RefreshToken — не добавляет его в schema.prisma. Агент S1-04 пишет `prisma.refreshToken.create(...)` — compilation error.

**Фикс:** добавить в S1-03 явную запись:
```
Дополнительные модели (добавить в схему):
- RefreshToken (нужна S1-04 AuthModule): userId → User (Cascade), tokenHash (unique), expiresAt, revokedAt?, createdAt, @@index([userId])
- PasswordResetToken (нужна S3-07): userId → User (Cascade), tokenHash (bcrypt-хэш SHA-256), expiresAt, usedAt?
```

---

### CRIT-02. Несоответствие между shared walls в adjacency и физическим расположением дверей в seed

**Файл:** `seed/test-apartment.json`, блок `"adjacencies"`  
**Связанные файлы:** `sprints/sprint-3.md` (S3-01), `docs/technical-requirements.md` (алгоритм сборки плана)

**Описание:**  
В seed-данных два из четырёх adjacency-записей объявляют `hasDoorBetween: true` и ссылаются через `_doorOpeningRef` на дверь, которая физически находится на **другой** стене, чем объявленные `wallA`/`wallB`.

**Случай 1 — Коридор ↔ Санузел:**
```json
{
  "roomA": "Коридор",    "wallA": "A-B",   // 1361 мм
  "roomB": "Санузел",    "wallB": "B-C",   // 1019 мм
  "hasDoorBetween": true,
  "_doorOpeningRef": "Санузел.doors[0]"    // дверь на стене C-D (2190 мм)!
}
```
Дверь санузла расположена на стене C-D, а не на объявленной shared wall B-C.

**Случай 2 — Коридор ↔ Кухня:**
```json
{
  "roomA": "Коридор",    "wallA": "D-E",   // 725 мм
  "roomB": "Кухня",      "wallB": "D-A",   // 3390 мм
  "hasDoorBetween": true,
  "_doorOpeningRef": "Кухня.doors[0]"      // дверь на стене C-D (4110 мм)!
}
```
Дверь кухни — на стене C-D, а не на объявленной shared wall D-A.

**Последствия:**  
Данная модель допустима технически (валидация S3-01 не требует, чтобы doorOpeningId был на wallA/wallB). Но для агентов-исполнителей это создаёт неоднозначность:
- Агент UI шага 4 (S3-04) должен понять, как отображать переходы между комнатами.
- Агент PlanAssemblerService (S3-03) выровняет комнаты по wallA/wallB, но дверь будет нарисована на перпендикулярной стене, что противоречит визуальной логике.
- В e2e-тестах (S5-07, шаг 6) создание adjacency по seed-данным приведёт к тому, что тест ожидает вход "через стену D-A кухни", а дверной проём на плане будет на C-D.

**Требует решения:** либо исправить расположение дверей (переместить door entity на shared wall), либо явно задокументировать в seed и tech-requirements, что `doorOpeningId` в adjacency может ссылаться на дверь на любой стене комнаты, а shared walls — только для позиционирования в плане. PlanAssemblerService и UI-агенты должны это знать.

---

## HIGH

### HIGH-01. ElevationsModule backend полностью отсутствует во всех спринтах

**Файл:** `docs/technical-requirements.md` (секция 5 — модули, секция 6 — API)  
**Отсутствует в:** всех файлах `sprints/sprint-*.md`

**Описание:**  
Технические требования явно определяют модуль `ElevationsModule`:
- Зависимости: `ElevationsModule → PrismaModule, SegmentsModule, RoomsModule`
- Эндпоинты:
  - `GET /api/walls/:wallId/elevation` — получить развёртку (SVG + данные)
  - `POST /api/walls/:wallId/elevation/generate` — перегенерировать SVG

Модель `WallElevation` создаётся в S1-03 (Prisma-схема). Фронтенд-компонент `WallElevationView` реализуется в S2-07c. Но **бэкенд-реализация (сервис, контроллер, DTO)** ни в одном спринте не запланирована.

**Последствия:** фронтенд S2-07c не сможет получить развёртку стены с сервера. S4-01 (дашборд) показывает развёртки через `SVG из WallElevation` — данных не будет. S4-02 (PDF) включает развёртки стен — они будут пустыми.

**Фикс:** добавить задачу в Sprint 2 или Sprint 3 (например, S2-08b или S3-10):
```
S3-10. Backend: ElevationsModule
Агент: nestjs-expert
Реализовать GET /api/walls/:wallId/elevation и POST /api/walls/:wallId/elevation/generate
```

---

### HIGH-02. FileStorageService.copyProjectFiles не определён в спецификации S1-05

**Файл:** `sprints/sprint-4.md` (S4-05), `sprints/sprint-1.md` (S1-05)

**Описание:**  
S4-05 требует:
> "FileStorageService.copyProjectFiles(srcProjectId, dstProjectId) физически копирует все фото из uploads/{userId}/{srcProjectId}/ в uploads/{userId}/{dstProjectId}/"

S1-05 определяет FileStorageService со следующими методами:
- `saveFile(userId, projectId, file): Promise<string>`
- `deleteFile(filePath): Promise<void>`
- `deleteProjectFiles(projectId): Promise<void>`

Метод `copyProjectFiles` **отсутствует** в S1-05. Агент S1-05 его не реализует. Агент S4-05 будет ожидать этот метод, не найдёт его, и либо сломается, либо реализует ad-hoc, нарушая принцип единого ответственного места.

**Фикс:** добавить в S1-05 метод:
```typescript
copyProjectFiles(srcProjectId: string, dstProjectId: string, userId: string): Promise<void>
```

---

### HIGH-03. PATCH /api/projects/:id/reopen не задокументирован в Section 6 (API)

**Файл:** `docs/technical-requirements.md` (секция 6, блок ProjectsModule), `sprints/sprint-4.md` (S4-07)

**Описание:**  
S4-07 описывает:
> "Новый эндпоинт: PATCH /api/projects/:id/reopen — переводит проект из статуса COMPLETED обратно в DRAFT"

В секции 6 технических требований под блоком "Проекты (ProjectsModule)" этот эндпоинт **не перечислен**. Агент, реализующий S4-07, будет строить на основании задачи спринта. Но агент, читающий только tech-requirements для понимания API-контракта, не найдёт этот эндпоинт.

**Фикс:** добавить в секцию 6:
```
PATCH /api/projects/:id/reopen — перевести проект из COMPLETED в DRAFT (требует COMPLETED статуса).
```

---

### HIGH-04. S4-05 и S4-07 дублируют scope UC-06

**Файл:** `sprints/sprint-4.md`

**Описание:**  
S4-05 "Управление проектами (доработка)" содержит:
> "Редактирование завершённого проекта (UC-06): «Редактировать» → статус обратно в DRAFT, переход в визард."

S4-07 "Редактирование завершённого проекта (UC-06)" — **отдельная задача, полностью покрывающая то же самое**, плюс добавляет PATCH /api/projects/:id/reopen.

Два агента будут реализовывать одну и ту же функциональность. Это приведёт к конфликтам при мерже или дублированию кода.

**Фикс:** убрать блок про UC-06 из S4-05 и сослаться на S4-07. Или объединить в одну задачу.

---

### HIGH-05. S5-09 содержит устаревшую кросс-ссылку

**Файл:** `sprints/sprint-5.md` (в конце файла)

**Описание:**  
Запись в sprint-5.md:
> `~~S5-09. Сброс пароля — перенесён в Sprint 2 (S2-10).~~`

Но в sprint-2.md:
> `~~S2-10. Сброс пароля (email)~~ — **Перенесено в Sprint 3 (S3-07)**`

Итоговая цепочка: S5-09 → S2-10 → S3-07. Ссылка в S5-09 указывает на промежуточное звено, а не на финальное место задачи. Агент, ищущий задачу сброса пароля по кросс-ссылке в S5-09, найдёт зачёркнутую запись S2-10 вместо активной S3-07.

**Фикс:** обновить запись в sprint-5.md:
```
~~S5-09. Сброс пароля — перенесён в Sprint 3 (S3-07).~~
```

---

### HIGH-06. S4-06 (spike @react-pdf/renderer) расположен слишком поздно

**Файл:** `sprints/sprint-4.md` (S4-06), `sprints/sprint-4.md` (S4-02)

**Описание:**  
S4-02 явно предупреждает: "выполнять ПОСЛЕ S4-06 (spike). Если spike покажет несовместимость @react-pdf/renderer, использовать альтернативу из ADR."

S4-06 имеет зависимость "нет" — то есть может выполняться в любой момент. Если spike выявит несовместимость (что реально возможно: @react-pdf/renderer не поддерживает Node.js SSR стабильно), потребуется Puppeteer или pdfkit. Это изменение архитектуры.

Обнаружение этого в Sprint 4 означает переработку архитектуры на позднем этапе проекта, когда уже написаны модели данных, API и план отображения под SVG-данные.

**Риск:** высокий. Puppeteer требует Docker-образа с Chromium (+~400MB к контейнеру), pdfkit требует ручной верстки PDF без React-компонентов.

**Фикс:** перенести S4-06 в Sprint 2 (параллельно с бэкенд-задачами) или в начало Sprint 3. Добавить зависимость S3-02 (или S2-01) → S4-06.

---

## MEDIUM

### MED-01. Неточности в эталонных значениях объёма в seed (rounded intermediate values)

**Файл:** `seed/test-apartment.json`, блок `expectedCalculations`

**Описание:**  
Эталонные значения объёма в seed рассчитаны с промежуточным округлением площади, что приведёт к несовпадению при реализации `computeVolume` с точными числами.

**Кухня:**
- area (точная) = 4.110 × 3.390 = 13.9329 m²
- avgHeight = (2700 + 2696) / 2 = 2698 мм = 2.698 m
- volume (точная) = 13.9329 × 2.698 = **37.591 m³**
- В seed: **37.61** ← рассчитано как 13.93 (rounded) × 2.700 (ошибка в высоте)

**Маленькая комната:**
- area (точная) = 3.791 × 1.367 = 5.18210 m²
- avgHeight = (2700 + 2698) / 2 = 2699 мм = 2.699 m
- volume (точная) = 5.18210 × 2.699 = **13.987 m³** ≈ 13.99
- В seed: **13.98** ← рассчитано как 5.18 (rounded) × 2.699

**Последствия:** тесты S3-02 с жёстким `assertEqual` против seed-значений упадут при точной формуле. Нужна epsilon-толерантность (±0.02 m³).

**Фикс:** либо пересчитать seed-значения с полной точностью, либо добавить комментарий в seed:
```json
"_toleranceM3": 0.02,
"_note": "Значения рассчитаны с округлением, тесты должны использовать toBeCloseTo(val, 1)"
```

---

### MED-02. В seed данные углов используют поле `angle` вместо `angleDegrees`

**Файл:** `seed/test-apartment.json` (все комнаты, блок `angles`)  
**Связанный файл:** `docs/technical-requirements.md` (модель Angle)

**Описание:**  
Модель Angle в схеме: `angleDegrees (Float?)`.  
Seed-данные: `{"cornerLabel": "A", "angle": 90}`.

Поля `angle` в Prisma-схеме не существует — в seed используется неправильное имя поля. Seed-скрипт должен будет маппить `angle → angleDegrees`.

Кроме того, поле `isRightAngle (Boolean)` в модели должно быть задано (true, если angle = 90), но в seed оно не присутствует — тоже нужно вычислять в скрипте.

**Фикс:** переименовать поле в seed с `angle` на `angleDegrees`, добавить `isRightAngle`:
```json
{"cornerLabel": "A", "angleDegrees": 90, "isRightAngle": true}
```

---

### MED-03. Seed не документирует маппинг cornerLabel → wallAId/wallBId для Angle

**Файл:** `seed/test-apartment.json`, `sprints/sprint-2.md` (S2-04)

**Описание:**  
Модель Angle содержит обязательные FK: `wallAId` и `wallBId`. В seed-данных эти поля отсутствуют — есть только `cornerLabel`.

Неявная логика: cornerLabel "A" = угол между стенами D-A и A-B (предыдущая и следующая стены в порядке обхода). Это нигде явно не задокументировано.

Seed-скрипт `seed.ts` должен самостоятельно реализовать эту логику резолюции. Если агент S2-06 (QA) реализует seed-скрипт без понимания этой зависимости — углы не создадутся корректно.

**Фикс:** добавить в seed `_note`:
```json
"_anglesNote": "cornerLabel 'X' = угол между стеной (X-1)-(X) и стеной (X)-(X+1) в порядке обхода по часовой стрелке. Seed-скрипт должен резолвить wallAId/wallBId из labels."
```

---

### MED-04. Диапазон валидации angleDegrees не специфицирован

**Файл:** `sprints/sprint-2.md` (S2-04), `docs/technical-requirements.md` (модель Angle)

**Описание:**  
DTO CreateAngleDto не содержит валидации диапазона `angleDegrees`. Формально допустимо передать `angleDegrees: -45` или `angleDegrees: 720`.

Для корректного Shoelace-расчёта (если алгоритм когда-либо будет использовать углы вместо длин стен) значения должны быть в диапазоне (0, 360].

**Фикс:** добавить в S2-04:
```typescript
@Min(1) @Max(360) @IsOptional() angleDegrees?: number;
```

---

### MED-05. Бюджет бандла <300KB gzip может быть нарушен с React-Konva

**Файл:** `docs/technical-requirements.md` (секция 12)

**Описание:**  
Требование: "< 300 КБ gzip (code splitting по шагам визарда через React.lazy)".

React-Konva добавляет ~120–150 KB minified (Konva.js ~450 KB unminified, ~130 KB gzip). С учётом React (~45 KB), React Router, Zustand, React Hook Form, Zod, Tailwind CSS-классов и @react-pdf/renderer-зависимостей на фронтенде — лимит 300 KB реалистичен только при агрессивном tree-shaking и lazy-loading Konva исключительно на шаге 4.

**Риск:** нарушение ограничения если Konva не вынести в отдельный chunk через `React.lazy`.

**Фикс:** добавить примечание в tech-requirements:
> "Konva.js ОБЯЗАТЕЛЬНО выносится в отдельный chunk: `const KonvaEditor = React.lazy(() => import('./components/plan/KonvaEditor'))`. Бандл шага 4 загружается только при переходе на шаг 4."

---

### MED-06. passport-yandex: нет активно поддерживаемого пакета

**Файл:** `sprints/sprint-5.md` (S5-01)

**Описание:**  
S5-01: "Яндекс: стратегия: passport-yandex (или custom)."

Пакет `passport-yandex` на npm имеет последнее обновление в 2017 году, не совместим с актуальными версиями Passport.js (0.6+) из-за изменений в `callbackURL` и callback-сигнатуре. Яндекс ID OAuth 2.0 требует custom-реализации через `passport-oauth2` или `@nestjs/passport` custom strategy.

Если агент установит `passport-yandex` без проверки — получит ошибки в runtime.

**Фикс:** обновить S5-01:
> "Яндекс: реализовать custom OAuth2 strategy на базе `passport-oauth2`, так как `passport-yandex` не поддерживается (deprecated). Эндпоинты Яндекс ID: `https://oauth.yandex.ru/authorize`, `https://oauth.yandex.ru/token`, `https://login.yandex.ru/info`."

---

### MED-07. Дизайн-неоднозначность: doorOpeningId в adjacency vs. физическая позиция двери

**Файл:** `seed/test-apartment.json` (adjacencies), `docs/technical-requirements.md` (WallAdjacency, алгоритм плана)

**Описание:**  
(Связано с CRIT-02, но здесь — про дизайн-документацию, а не про корректность данных.)

Нигде в документации не объяснено, должен ли `doorOpeningId` в WallAdjacency ссылаться на дверь, физически расположенную на `wallA` или `wallB`. Отсутствие этого правила приводит к тому, что в seed-данных `doorOpeningId` ссылается на дверь на третьей стене.

UI шага 4 (S3-04) должен каким-то образом отображать "дверь между комнатами". Если агент S3-04 предположит, что дверь на одной из shared walls — логика отображения будет неверной.

**Фикс:** добавить в tech-requirements в описание WallAdjacency:
> "`doorOpeningId` — идентификатор DoorOpening-сущности, которая физически соединяет эти два помещения. Дверь НЕ обязана находиться на объявленных `wallA` или `wallB`; shared walls используются исключительно для геометрического позиционирования в PlanAssembler."

---

## LOW

### LOW-01. Список сущностей в S1-03 не обновлён после ревизии модели

**Файл:** `sprints/sprint-1.md` (S1-03)

**Описание:**  
Перечень "Все сущности" в S1-03 не включает `WallSegment`, `WallElevation`, `RefreshToken`, `PasswordResetToken` в основной список — они упоминаются позже в блоке "Новые модели", но структурно это создаёт путаницу. После всех правок список в преамбуле устарел.

**Фикс:** обновить список сущностей, объединив все модели.

---

### LOW-02. GET /api/projects/:id/plan/pdf не документирует требование COMPLETED статуса

**Файл:** `docs/technical-requirements.md` (секция 6, блок PlanModule)

**Описание:**  
S4-05 явно устанавливает: "Генерация PDF возможна только для проектов со статусом COMPLETED". Но в секции 6 описание `GET /api/projects/:id/plan/pdf` не содержит этого ограничения.

Агент, реализующий PdfGeneratorService без чтения S4-05, не добавит проверку статуса.

**Фикс:** добавить в секцию 6:
```
GET /api/projects/:id/plan/pdf — только для проектов со статусом COMPLETED (иначе 400 Bad Request).
```

---

### LOW-03. zustand/middleware/persist — minor naming в S3-09

**Файл:** `sprints/sprint-3.md` (S3-09)

**Описание:**  
S3-09: "использовать `zustand/middleware/persist`". Правильный импорт — `import { persist } from 'zustand/middleware'`. Это не отдельный подпакет, а именованный экспорт из `zustand/middleware`.

Минорно, но агент может попытаться установить `zustand/middleware/persist` как отдельный пакет.

**Фикс:** исправить на `import { persist } from 'zustand/middleware'` (Zustand 4+).

---

### LOW-04. Документ agent-pipeline.md не упоминает ElevationsModule в структуре проекта

**Файл:** `docs/agent-pipeline.md` (секция "Структура проекта")

**Описание:**  
Целевая структура сервера в agent-pipeline.md перечисляет директории: `auth/, projects/, rooms/, walls/, openings/, elements/, angles/, photos/, adjacency/, plan/, prisma/, common/`.

Директория `elevations/` (для ElevationsModule) отсутствует в этом списке, несмотря на то что модуль описан в tech-requirements.

**Фикс:** добавить `elevations/` в список директорий.

---

## Математическая верификация seed-данных

| Комната | Формула | Расчётная площадь | В seed | Статус |
|---------|---------|-------------------|--------|--------|
| Большая комната | 3.791 × 2.450 | 9.288 м² | 9.29 | ✓ |
| Маленькая комната | 3.791 × 1.367 | 5.182 м² | 5.18 | ✓ |
| Коридор (Г-форма, Shoelace) | 1.361×2.310 - 0.351×0.725 | 2.889 м² | 2.89 | ✓ |
| Санузел | 2.190 × 1.019 | 2.232 м² | 2.23 | ✓ |
| Кухня | 4.110 × 3.390 | 13.933 м² | 13.93 | ✓ |
| **Итого** | | **33.524 м²** | **33.52** | ✓ |

| Комната | Ожидаемый объём (точный) | В seed | Расхождение |
|---------|--------------------------|--------|-------------|
| Большая комната | 9.288 × 2.6975 = 25.07 м³ | 25.07 | ✓ |
| Маленькая комната | 5.182 × 2.699 = 13.987 м³ | 13.98 | ±0.007 (см. MED-01) |
| Коридор | 2.889 × 2.700 = 7.800 м³ | 7.80 | ✓ |
| Санузел | 2.232 × 2.700 = 6.026 м³ | 6.02 | ±0.006 |
| Кухня | 13.933 × 2.698 = 37.591 м³ | 37.61 | **±0.019 (см. MED-01)** |

| Комната | Периметр (сумма стен) | В seed | Статус |
|---------|-----------------------|--------|--------|
| Большая комната | 3791+2450+3791+2450 = 12482 мм | 12.482 м | ✓ |
| Маленькая комната | 3791+1367+3791+1367 = 10316 мм | 10.316 м | ✓ |
| Коридор | 1361+1585+351+725+1010+2310 = 7342 мм | 7.342 м | ✓ |
| Санузел | 2190+1019+2190+1019 = 6418 мм | 6.418 м | ✓ |
| Кухня | 4110+3390+4110+3390 = 15000 мм | 15.000 м | ✓ |

Проверка сегментов стен (сумма = длина стены):

| Комната | Стена | Сегменты | Сумма | Длина | Статус |
|---------|-------|----------|-------|-------|--------|
| Большая комната | A-B | 1090+1987+714 | 3791 | 3791 | ✓ |
| Большая комната | D-A | 1550+900 | 2450 | 2450 | ✓ |
| Маленькая комната | A-B | 1079+864+1848 | 3791 | 3791 | ✓ |
| Маленькая комната | D-A | 567+800 | 1367 | 1367 | ✓ |
| Коридор | B-C | 120+940+525 | 1585 | 1585 | ✓ |
| Санузел | C-D | 208+710+1272 | 2190 | 2190 | ✓ |
| Кухня | A-B | 1200+1460+1450 | 4110 | 4110 | ✓ |
| Кухня | C-D | 110+870+3130 | 4110 | 4110 | ✓ |

Все сегменты корректны. Кривизна корректна (Большая комната A-B: avg=3.33, dev=1.67; C-D: avg=1.33, dev=0.67).

---

## Связность зависимостей между спринтами

| Задача | Зависит от | Статус |
|--------|------------|--------|
| S1-04 AuthModule (RefreshToken) | S1-03 Prisma-схема | ⚠️ CRIT-01: RefreshToken не в S1-03 |
| S2-06 Seed | S2-01, S2-02, S2-03 | ✓ |
| S3-01 AdjacencyModule | Sprint 2 | ✓ |
| S3-02 RoomsCalcService | S3-01, S2-06 | ✓ |
| S3-03 PlanAssemblerService | S3-01, S3-02 | ✓ |
| S3-07 PasswordResetModule | S1-04 | ✓ (но RefreshToken из S1-04 зависит от CRIT-01) |
| S4-02 PdfGeneratorService | S4-06 (spike) | ⚠️ HIGH-06: spike слишком поздно |
| S4-05 Управление проектами | S3-03, S4-02 | ⚠️ HIGH-04: дублирует S4-07 |
| S4-07 Reopen endpoint | S4-05 | ⚠️ HIGH-04 |
| S5-01 OAuth | Sprint 4 | ⚠️ MED-06: passport-yandex deprecated |
| ElevationsModule backend | — | ⚠️ HIGH-01: задачи нет |

---

## Консистентность между документами

| Проверка | Результат |
|----------|-----------|
| Stack в CLAUDE.md соответствует tech-requirements.md | ✓ (React 18 + Vite, исправлено в v83e1961) |
| RefreshToken: модель в tech-req + логика в S1-04 + инвалидация в S3-07 | ✓ (все три присутствуют) |
| Shoelace с Math.abs(): tech-req + S3-02 | ✓ |
| WallAdjacency reverse-pair check: tech-req + S3-01 | ✓ |
| seed dependency в agent-pipeline: условный (если файл существует) | ✓ (исправлено в v83e1961) |
| Autosave: перенесено из S2-08 → S3-09 | ✓ |
| Password reset: S5-09 → S2-10 → S3-07 | ⚠️ HIGH-05: S5-09 указывает на S2-10 |
| ElevationsModule: модуль есть, задачи нет | ⚠️ HIGH-01 |
| FileStorageService.copyProjectFiles | ⚠️ HIGH-02 |
| PATCH /reopen в API-документации | ⚠️ HIGH-03 |

---

## Итог и приоритет исправлений

### Блокирующие (требуют правки перед запуском агентов Sprint 1/2):
1. **CRIT-01** — добавить RefreshToken и PasswordResetToken в S1-03
2. **HIGH-01** — добавить задачу ElevationsModule backend в Sprint 2/3

### Исправить до Sprint 3/4:
3. **CRIT-02** — задокументировать семантику doorOpeningId в adjacency
4. **HIGH-02** — добавить copyProjectFiles в S1-05
5. **HIGH-06** — перенести S4-06 spike в Sprint 2
6. **MED-01** — уточнить точность или добавить toleranceNote в seed
7. **MED-02** — переименовать `angle` → `angleDegrees` в seed

### Исправить до Sprint 4/5:
8. **HIGH-03** — PATCH /reopen в секцию 6 tech-requirements
9. **HIGH-04** — убрать дублирование UC-06 из S4-05
10. **HIGH-05** — исправить кросс-ссылку S5-09
11. **MED-06** — уточнить реализацию Яндекс OAuth
12. Остальные LOW/MEDIUM — по возможности
