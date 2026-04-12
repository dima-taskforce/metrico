# Deploy Secrets & Setup Guide

## Сервер

| Параметр | Значение |
|----------|---------|
| Сервер | venus (95.181.174.207) |
| SSH | `ssh venus` |
| Домен | metrico360.ru |
| Git remote | `git@github-taskforce:dima-taskforce/metrico.git` |
| SSH ключ | `~/.ssh/github_taskforce` |

## Архитектура (текущая, с 2026-04-12)

```
Internet :80/:443
  │
Host nginx (Ubuntu, не Docker) — обслуживает 3 сайта:
  ├─ metrico360.ru
  │    ├─ /          → /var/www/metrico/ (Vite SPA, статика)
  │    ├─ /api/*     → http://127.0.0.1:3000
  │    └─ /.well-known/ → /var/lib/docker/volumes/metrico_certbot_www/_data/
  ├─ quantoo.io      → /etc/nginx/sites-enabled/quantoo.io
  └─ taskforce.now   → /etc/nginx/sites-enabled/taskforce.now
          │
    NestJS API :3000  ← Docker (127.0.0.1:3000:3000, без внешних портов)
    nginx:alpine      ← Docker (без port bindings, только внутренняя сеть)
          │
    SQLite /app/data/metrico.db (Prisma)
```

### Почему так

Docker nginx раньше занимал порты 80/443, что ломало quantoo.io и taskforce.now.
Решение (2026-04-12): убрать port bindings у Docker nginx, поднять host nginx для всех трёх сайтов.

## SSL сертификаты

| Сайт | Путь к сертификату |
|------|--------------------|
| metrico360.ru | `/var/lib/docker/volumes/metrico_letsencrypt/_data/live/metrico360.ru/` |
| quantoo.io | `/etc/letsencrypt/live/quantoo.io/` |
| taskforce.now | `/etc/letsencrypt/live/taskforce.now/` |

Nginx конфиг metrico360.ru: `/etc/nginx/sites-enabled/metrico360.ru`

## Деплой клиента

```bash
# Собрать локально
cd client && npm run build

# Задеплоить статику на сервер
rsync -az --delete client/dist/ venus:/var/www/metrico/
```

## Деплой сервера

```bash
ssh venus
cd /opt/metrico
git pull
docker compose up -d --build app
```

## Первичная настройка (bootstrap, только один раз)

```bash
ssh venus

# 1. Клонировать репозиторий
git clone git@github-taskforce:dima-taskforce/metrico.git /opt/metrico
cd /opt/metrico

# 2. Создать .env.production
cp .env.example .env.production
# Заполнить: JWT_SECRET, JWT_REFRESH_SECRET, GOOGLE_*, YANDEX_*

# 3. Запустить Docker-сервисы (без port bindings у nginx)
docker compose up -d

# 4. Создать директорию для статики
mkdir -p /var/www/metrico
chown www-data:www-data /var/www/metrico

# 5. Скопировать собранный клиент
rsync -az --delete client/dist/ venus:/var/www/metrico/

# 6. Настроить host nginx
# Создать /etc/nginx/sites-available/metrico360.ru (см. шаблон ниже)
ln -s /etc/nginx/sites-available/metrico360.ru /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Шаблон nginx конфига для metrico360.ru

```nginx
server {
    listen 80;
    server_name metrico360.ru www.metrico360.ru;
    location /.well-known/acme-challenge/ {
        root /var/lib/docker/volumes/metrico_certbot_www/_data;
    }
    location / { return 301 https://metrico360.ru$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name metrico360.ru www.metrico360.ru;

    ssl_certificate /var/lib/docker/volumes/metrico_letsencrypt/_data/live/metrico360.ru/fullchain.pem;
    ssl_certificate_key /var/lib/docker/volumes/metrico_letsencrypt/_data/live/metrico360.ru/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/metrico;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Откат

```bash
ssh venus
cd /opt/metrico
git log --oneline -10
git checkout <commit>
docker compose up -d --build app
```

## GitHub Actions Secrets

Configure at: `Settings → Secrets and variables → Actions`

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | `venus` или `95.181.174.207` |
| `VPS_USER` | SSH user |
| `SSH_KEY` | Private SSH key (`~/.ssh/github_taskforce`) |
| `DEPLOY_DIR` | `/opt/metrico` |
| `JWT_SECRET` | `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 64` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `YANDEX_CLIENT_ID` | From Yandex OAuth |
| `YANDEX_CLIENT_SECRET` | From Yandex OAuth |
| `TELEGRAM_CHAT_ID` | Chat ID for deploy notifications |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
