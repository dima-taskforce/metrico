# Metrico — Agent Pipeline

Этот документ описывает обязательный процесс работы агента (субагента Claude Code) над любой задачей проекта Metrico. **Агент ОБЯЗАН прочитать этот файл перед началом работы.**

---

## Общие правила

- Язык кода: TypeScript (strict mode).
- Стиль: ESLint + Prettier (конфиг в корне проекта).
- Коммиты: Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`).
- Ветки: `sprint-N/task-name` (например: `sprint-1/auth-module`).
- Тесты обязательны для каждой задачи.

---

## Пайплайн (7 шагов)

### Шаг 1. Анализ требований

Прочитать (в указанном порядке):

1. `docs/business-requirements.md` — бизнес-контекст.
2. `docs/use-cases.md` — пользовательские сценарии.
3. `docs/technical-requirements.md` — модель данных, API, архитектура.
4. Файл задачи из `sprints/sprint-N.md` — конкретное задание.

Понять: что именно нужно сделать, какие сущности затронуты, какие API-эндпоинты, какие модули NestJS / компоненты React.

### Шаг 2. Разбор задачи на блоки

Перед написанием кода — составить план реализации:

- Какие файлы нужно создать или изменить.
- Порядок: сначала бэкенд (модель → сервис → контроллер → DTO), потом фронтенд (store → API-клиент → компонент → страница).
- Зависимости от других задач (если есть — проверить, что они выполнены).

Записать план в комментарий к задаче и в todo-лист агента.

### Шаг 3. Реализация

Писать код, следуя конвенциям проекта:

**Бэкенд (NestJS):**
- Модуль → сервис → контроллер → DTO.
- DTO: class-validator декораторы, все поля типизированы.
- Сервисы: инъекция PrismaService через конструктор.
- Контроллеры: `@UseGuards(JwtAuthGuard)` на защищённых эндпоинтах.
- Обработка ошибок: NestJS exceptions (`NotFoundException`, `BadRequestException`).

**Фронтенд (React):**
- Компоненты: функциональные, с TypeScript-пропсами.
- Состояние визарда: Zustand store.
- Формы: React Hook Form + Zod-схемы.
- Стили: Tailwind CSS, mobile-first.
- API-вызовы: через обёртку `api.ts` (fetch/axios + JWT interceptor).

### Шаг 4. Написание тестов

**Обязательный минимум:**

Бэкенд:
- Unit-тесты сервисов (Jest): бизнес-логика, расчёты, валидация.
- Integration-тесты контроллеров: HTTP-запросы через supertest, проверка статусов и тел ответов.
- Для расчётов (площадь, периметр, объём, кривизна) — тесты с заранее посчитанными ожидаемыми значениями из seed-данных.

Фронтенд:
- Unit-тесты компонентов (Vitest + React Testing Library): рендеринг, пользовательские действия.
- Тесты Zustand-сторов: проверка состояния после экшенов.

Seed-данные: использовать `seed/test-apartment.json` как эталонный набор данных для тестов.

### Шаг 5. Самопроверка

Запустить перед коммитом:

```bash
# Линтинг
npm run lint

# Проверка типов
npm run typecheck

# Тесты
npm run test

# Сборка (убедиться, что не сломали)
npm run build
```

Все команды должны пройти без ошибок. Если есть ошибки — исправить.

### Шаг 6. Код-ревью (самопроверка)

Агент перечитывает свой код и проверяет:

- Соответствие модели данных из `technical-requirements.md` (поля, типы, enum-ы).
- Соответствие API-контрактам (эндпоинты, DTO, статусы ответов).
- Нет хардкода, магических чисел, забытых TODO.
- Нет console.log / отладочного кода.
- Каскадное удаление работает правильно.
- Защищённые эндпоинты имеют `@UseGuards`.
- Фото-загрузка проходит через FileValidationPipe.

### Шаг 7. Коммит в git

```bash
# Создать ветку (если ещё не создана)
git checkout -b sprint-N/task-name

# Добавить файлы
git add <конкретные файлы>

# Коммит с Conventional Commit message
git commit -m "feat(module): краткое описание"

# Пуш
git push origin sprint-N/task-name
```

После завершения всех задач спринта — создать PR в main.

---

## Роли агентов

Каждая задача в спринте указывает роль агента. Роль определяет фокус и экспертизу:

| Роль | Фокус | Ключевые навыки |
|---|---|---|
| **nestjs-expert** | Бэкенд: модули, сервисы, контроллеры, Prisma | NestJS, Prisma, TypeScript, Jest, API-дизайн |
| **react-expert** | Фронтенд: компоненты, страницы, состояние | React, Zustand, React Hook Form, Tailwind |
| **fullstack** | Задачи, затрагивающие и бэк, и фронт | Оба стека, интеграция API ↔ UI |
| **devops** | Docker, CI/CD, Nginx, деплой | Docker Compose, GitHub Actions, Nginx |
| **qa** | Тесты, seed-данные, e2e | Jest, Vitest, Supertest, тестовые сценарии |

---

## Структура проекта (целевая)

```
metrico/
├── client/                    # React SPA (Vite)
│   ├── src/
│   │   ├── api/               # API-клиент
│   │   ├── components/        # Общие компоненты
│   │   ├── pages/             # Страницы (роуты)
│   │   ├── stores/            # Zustand stores
│   │   ├── hooks/             # Кастомные хуки
│   │   ├── types/             # TypeScript типы
│   │   └── utils/             # Утилиты
│   ├── public/
│   ├── index.html
│   └── vite.config.ts
├── server/                    # NestJS API
│   ├── src/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── rooms/
│   │   ├── walls/
│   │   ├── openings/
│   │   ├── elements/
│   │   ├── angles/
│   │   ├── photos/
│   │   ├── adjacency/
│   │   ├── plan/
│   │   ├── prisma/
│   │   └── common/
│   ├── prisma/
│   │   └── schema.prisma
│   └── test/
├── seed/                      # Тестовые данные
│   └── test-apartment.json
├── docs/                      # Документация
├── sprints/                   # Задачи по спринтам
├── docker-compose.yml
├── nginx/
└── .github/workflows/
```
