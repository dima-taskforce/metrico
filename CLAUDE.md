# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**metrico** — новый проект, каталог пока пуст. При первой инициализации:

```bash
git init
git commit --allow-empty -m "chore: initial commit"
```

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS (Node.js 20 LTS, TypeScript strict) |
| Frontend | Next.js 14 App Router |
| ORM | Prisma |
| Styling | Tailwind CSS |
| Auth | JWT + httpOnly cookie |
| Infra | Docker Compose v2 + Nginx + Certbot |

## Commands

После scaffolding — обновить этот раздел реальными командами. Шаблон:

```bash
# Backend (NestJS)
cd backend
npm run start:dev       # dev-сервер
npm run build           # сборка
npm run test            # все тесты
npm run test -- --testPathPattern=auth  # один тест/файл

# Frontend (Next.js)
cd frontend
npm run dev             # dev-сервер
npm run build           # production build
npm run lint            # ESLint

# Docker
docker compose up -d    # поднять все сервисы
docker compose logs -f  # логи
docker compose down     # остановить

# Prisma
npx prisma migrate dev  # применить миграции
npx prisma studio       # GUI браузер БД
npx prisma generate     # регенерировать клиент
```

## Architecture (заполнить после scaffolding)

```
metrico/
├── backend/        # NestJS API
│   ├── src/
│   │   ├── modules/  # feature-модули (auth, users, ...)
│   │   ├── prisma/   # PrismaService
│   │   └── main.ts
│   └── prisma/
│       └── schema.prisma
├── frontend/       # Next.js App Router
│   └── app/
├── nginx/          # конфиги reverse proxy
├── docker-compose.yml
└── .env.example
```

## Key Conventions

- Модули NestJS: один каталог = один feature (`auth/`, `users/`, `metrics/`)
- Prisma schema — единый источник типов для бэкенда
- Next.js: Server Components по умолчанию, Client Components только где нужен state/events
- Env: `.env` не коммитится, `.env.example` всегда актуален
