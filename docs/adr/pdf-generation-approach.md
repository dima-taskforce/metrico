# ADR: PDF Generation Approach

**Date:** 2026-04-09  
**Status:** Accepted  
**Context:** Sprint 4, task S4-06

---

## Контекст

Нужно генерировать обмерные планы в PDF на сервере (NestJS, Node.js 20).  
PDF должен содержать: 2D-схему квартиры, таблицы по комнатам, развёртки стен, фото, водяной знак.

## Рассмотренные варианты

### Вариант 1: @react-pdf/renderer v3

Библиотека генерирует PDF на сервере через React-компоненты без DOM — только Node.js primitives.

**Проверка совместимости:**
- PoC: `server/src/pdf/poc.example.ts`
- Результат: PDF создаётся успешно, размер 2746 байт, проходит проверку PDF-заголовка (`%PDF`)
- Компоненты: `Document`, `Page`, `Text`, `View`, `Image`, `StyleSheet`, `renderToBuffer()`
- TSX не требуется — используется `React.createElement()` напрямую
- Нет зависимости от DOM, нет `window`/`document` в runtime

**Плюсы:**
- Нативная поддержка React-компонентов → переиспользование типов/логики с клиентом
- `renderToBuffer()` работает в async/await контексте NestJS
- Встроенная поддержка кириллицы (UTF-8), SVG, изображений
- Нет Headless Chrome — меньше ресурсов и сложности

**Минусы:**
- Ограниченный набор CSS (flex-only, нет grid, нет CSS-переменных)
- SVG-поддержка ограничена (нет clip-path, фильтров и т.п.)

### Вариант 2: Puppeteer (Headless Chrome)

Генерирует PDF из HTML-страницы через Chrome DevTools Protocol.

**Плюсы:** Любой CSS, точный рендер как в браузере  
**Минусы:** Тяжёлая зависимость (~150 MB), сложный деплой, медленнее при холодном старте

### Вариант 3: pdfkit

Низкоуровневая генерация (canvas-like API).

**Плюсы:** Минимальные зависимости, полный контроль  
**Минусы:** Очень многословно, нет React-интеграции, сложно верстать таблицы/макеты

### Вариант 4: jsPDF

JavaScript-библиотека для браузера с Node.js поддержкой.

**Плюсы:** Проста в старте  
**Минусы:** Плохая поддержка кириллицы, ограниченный макет, browser-first

---

## Решение

**Выбран: @react-pdf/renderer v3**

Подтверждён рабочим PoC (см. `server/src/pdf/poc.example.ts`).  
Совместим с NestJS / Node.js 20 без DOM.  
Кириллица поддерживается.  
Архитектурно согласуется с React-стеком фронтенда.

## Реализация

1. JSX в server-части **не используется** — компоненты создаются через `React.createElement()`.
2. `tsconfig.pdf.json` содержит `"jsx": "react-jsx"` на случай если JSX-файлы понадобятся изолированно.
3. PDF-сервис: `server/src/pdf/pdf.service.ts` с методом `generateProjectPdf(projectId): Promise<Buffer>`.
4. Контроллер: `GET /api/projects/:id/plan/pdf` → ответ с `Content-Type: application/pdf`.
5. Водяной знак "Metrico MVP" присутствует на каждой странице.
