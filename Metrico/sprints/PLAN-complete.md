# PLAN-complete — Metrico: Полная реализация целей 2, 3, 4

**Дата:** 2026-04-10  
**Статус:** в работе

## Цели

| Цель | Описание | Статус |
|------|----------|--------|
| Goal 2 | Визуальные подсказки и фото-примеры на каждом шаге замера | частично |
| Goal 3 | Полный сбор данных (стены, проёмы, высоты, кривизна, радиаторы, панели, фото) | частично |
| Goal 4 | Готовый обмерный план (PDF + web-дашборд) | частично |

---

## Аудит: найденные проблемы

| # | Проблема | Критичность | Файл | Статус |
|---|----------|-------------|------|--------|
| B-11 | `assembleOpenings()` возвращает width/height = 0 | CRITICAL | `plan-assembler.service.ts:124` | открыт |
| B-12 | PlanStep navigates to PlaceholderStep вместо summary | HIGH | `PlanStep.tsx:105` | открыт |
| B-13 | Проект помечается COMPLETED слишком рано (в getFloorPlan) | HIGH | `plan.service.ts:66` | открыт |
| B-14 | MeasurementHint отсутствует на шаге 3.1 CornerLabelStep | MEDIUM | `CornerLabelStep.tsx` | открыт |
| B-15 | CeilingHeightStep: инлайн-SVG вместо MeasurementHint | MEDIUM | `CeilingHeightStep.tsx` | открыт |
| B-16 | PerimeterWalkStep: отсутствует MeasurementHint | MEDIUM | `PerimeterWalkStep.tsx` | открыт |
| B-17 | PhotoChecklistStep: отсутствует MeasurementHint | MEDIUM | `PhotoChecklistStep.tsx` | открыт |
| B-18 | PDF FloorPlanSvg: fake-прямоугольники вместо реальной геометрии | HIGH | `pdf.service.ts:119` | открыт |
| B-19 | canMarkDone не требует allWallsHaveSegments/allOpeningsMeasured | MEDIUM | `PhotoChecklistStep.tsx` | открыт |
| B-20 | Только OVERVIEW_BEFORE фото, нет DETAIL-типа | MEDIUM | `PhotoChecklistStep.tsx` | открыт |
| B-21 | SummaryStep использует raw fetch() вместо api-клиента | LOW | `SummaryStep.tsx:158` | открыт |

---

## Фазы реализации

### Фаза 1 — Критические баги (Goal 4)

#### P1-01. Fix assembleOpenings() — реальные размеры проёмов

**Файлы:**
- `server/src/plan/plan.service.ts` — добавить include `windowOpening`/`doorOpening` в Prisma-запрос
- `server/src/plan/plan-assembler.service.ts` — использовать реальные данные из joined relations

**Изменения в `plan.service.ts`:**
```typescript
walls: {
  include: {
    segments: {
      include: {
        windowOpening: true,
        doorOpening: true,
      },
      orderBy: { sortOrder: 'asc' },
    },
  },
}
```

**Изменения в `plan-assembler.service.ts`:**
- Обновить тип `WallWithSegmentsAndOpenings` с include relations
- В `assembleOpenings()` читать `segment.windowOpening.width`, `segment.windowOpening.height`, `segment.doorOpening.height`

**Тесты:** обновить unit-тест `plan-assembler.service.spec.ts` с mock-данными включающими relations

---

#### P1-02. Fix PlanStep навигация

**Файл:** `client/src/pages/wizard/PlanStep.tsx:105`

```typescript
// Было:
navigate(`/wizard/${projectId}/walls`);
// Стало:
navigate(`/wizard/${projectId}/summary`);
```

**Тест:** `PlanStep.test.tsx` — проверить что после handleNext вызывается navigate с `/summary`

---

#### P1-03. Fix преждевременный COMPLETED статус

**Файл:** `server/src/plan/plan.service.ts:66`

Убрать `updateStatus(projectId, ProjectStatus.COMPLETED)` из `getFloorPlan()`.  
Вместо этого добавить отдельный endpoint `PATCH /api/projects/:id/complete`.

**Изменения:**
- `plan.service.ts`: удалить вызов `updateStatus` из `getFloorPlan()`
- `plan.controller.ts`: добавить `@Patch(':id/complete')` endpoint
- `plan.service.ts`: добавить метод `completeProject(projectId)`
- `SummaryStep.tsx`: вызывать `/api/projects/:id/complete` перед `handleGeneratePlan()`

**Тест:** обновить `plan.service.spec.ts`

---

### Фаза 2 — Goal 2: MeasurementHint на всех шагах

#### P2-01. Hint на CornerLabelStep (3.1)

**Файл:** `client/src/pages/wizard/measure/CornerLabelStep.tsx`

Добавить `<MeasurementHint stepKey="corner-label" />` в заголовок шага.  
Проверить что ключ `corner-label` присутствует в `client/src/data/hints.ts`.

---

#### P2-02. Hint на CeilingHeightStep (3.2)

**Файл:** `client/src/pages/wizard/measure/CeilingHeightStep.tsx`

Заменить inline-SVG инструкцию на `<MeasurementHint stepKey="ceiling-height" />`.  
Проверить/добавить ключ в `hints.ts`.

---

#### P2-03. Hint на PerimeterWalkStep (3.3/3.4)

**Файл:** `client/src/pages/wizard/measure/PerimeterWalkStep.tsx`

Добавить `<MeasurementHint stepKey="perimeter-walk" />` в заголовок.  
Проверить/добавить ключ в `hints.ts`.

---

#### P2-04. Hint на PhotoChecklistStep (3.7)

**Файл:** `client/src/pages/wizard/measure/PhotoChecklistStep.tsx`

Добавить `<MeasurementHint stepKey="room-photo" />` в заголовок.  
Проверить/добавить ключ в `hints.ts`.

---

### Фаза 3 — Goal 3: Полнота данных

#### P3-01. PhotoChecklistStep: tighten canMarkDone

**Файл:** `client/src/pages/wizard/measure/PhotoChecklistStep.tsx`

```typescript
const canMarkDone =
  hasPhoto &&
  hasWalls &&
  allWallsHaveSegments &&    // добавить
  allOpeningsMeasured &&     // добавить
  manualChecks.curvatureChecked &&
  manualChecks.elementsPlaced;
```

---

#### P3-02. PhotoChecklistStep: DETAIL фото

**Файл:** `client/src/pages/wizard/measure/PhotoChecklistStep.tsx`

Добавить раздел для детальных фото (DETAIL тип):
- Секция "Детальные фото стен" — для каждой стены отдельная кнопка загрузки или общая
- `photosApi.upload(roomId, file, 'DETAIL')`
- Показывать в чеклисте: "Детальные фото добавлены"

---

#### P3-03. SummaryStep: использовать api-клиент

**Файл:** `client/src/pages/wizard/SummaryStep.tsx:158`

Заменить `fetch('/api/walls/${wall.id}/segments')` на вызов через `wallsApi` или `segmentsApi`.  
Если нужного метода нет — добавить в `client/src/api/`.

---

### Фаза 4 — Goal 4: Улучшение PDF

#### P4-01. FloorPlanSvg: реальная геометрия

**Файл:** `server/src/pdf/pdf.service.ts:119`

Текущий код рисует прямоугольники `width = walls[0].length, height = walls[1].length`.  
Реальная геометрия требует данных из `assembledRoom.walls` (уже содержат sortOrder + длину).

**Алгоритм для прямоугольных комнат (RECTANGLE):**
- Получить массив стен `[N, E, S, W]` (wall 0 = North = ширина, wall 1 = East = высота)  
- Масштаб: `scale = maxSize / max(roomWidth, roomHeight)`
- Нарисовать `<Rect>` с реальными пропорциями

**Алгоритм для L_SHAPE, U_SHAPE:**
- Собрать координаты углов через обход стен с накоплением dx/dy
- Нарисовать `<Polygon>` по точкам

**Поэтапно:**
1. Сначала реализовать для RECTANGLE (покрывает 80% комнат)
2. L_SHAPE/U_SHAPE — как отдельная задача

---

#### P4-02. PDF: добавить размерные линии на план

После реализации реальной геометрии — добавить размерные метки (`<Text>`) у каждой стены.

---

#### P4-03. PDF: секция кривизны и элементов

В `RoomPage` добавить:
- Таблицу кривизны стен (bottom/middle/top значения)
- Список элементов (radiators, vents и т.д.) с позициями

---

## Порядок выполнения

```
P1-01 → P1-02 → P1-03   # Критические баги, блокируют Goal 4
P2-01 → P2-02 → P2-03 → P2-04   # Hints, Goal 2
P3-01 → P3-02 → P3-03   # Данные, Goal 3
P4-01 → P4-02 → P4-03   # PDF улучшения, Goal 4
```

После каждой фазы: `npm test --run` (client + server), коммит.

---

## Прогресс

| Задача | Статус |
|--------|--------|
| P1-01 assembleOpenings fix | ◻ |
| P1-02 PlanStep навигация | ◻ |
| P1-03 COMPLETED статус | ◻ |
| P2-01 Hint CornerLabel | ◻ |
| P2-02 Hint CeilingHeight | ◻ |
| P2-03 Hint PerimeterWalk | ◻ |
| P2-04 Hint PhotoChecklist | ◻ |
| P3-01 canMarkDone tighten | ◻ |
| P3-02 DETAIL фото | ◻ |
| P3-03 SummaryStep api | ◻ |
| P4-01 FloorPlanSvg геометрия | ◻ |
| P4-02 PDF размерные линии | ◻ |
| P4-03 PDF кривизна/элементы | ◻ |
