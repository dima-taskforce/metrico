# Deploy Secrets & Setup Guide

## GitHub Actions Secrets

Configure at: `Settings → Secrets and variables → Actions`

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Server IP or hostname (e.g. `venus` or `192.168.x.x`) |
| `VPS_USER` | SSH user (e.g. `deploy`) |
| `SSH_KEY` | Private SSH key (`~/.ssh/id_ed25519`) |
| `DEPLOY_DIR` | Deploy path on VPS (e.g. `/opt/metrico`) |
| `GHCR_TOKEN` | GitHub Personal Access Token with `read:packages` scope |
| `JWT_SECRET` | `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 64` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `YANDEX_CLIENT_ID` | From Yandex OAuth |
| `YANDEX_CLIENT_SECRET` | From Yandex OAuth |
| `TELEGRAM_CHAT_ID` | Chat ID for deploy notifications |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |

## First Deploy (Manual)

Run once on the VPS to bootstrap SSL certificates:

```bash
# 1. Clone repo
ssh venus
git clone https://github.com/USERNAME/metrico /opt/metrico
cd /opt/metrico

# 2. Create .env.production
cp .env.example .env.production
# Fill in: JWT_SECRET, JWT_REFRESH_SECRET, GOOGLE_*, YANDEX_*

# 3. Start HTTP-only first (for Certbot ACME challenge)
docker compose -f docker-compose.prod.yml up -d certbot nginx

# 4. Obtain certificate
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d metrico.n1tr0.space \
  --email admin@n1tr0.space \
  --agree-tos --non-interactive

# 5. Restart with HTTPS
docker compose -f docker-compose.prod.yml up -d

# 6. Verify health
curl https://metrico.n1tr0.space/api/health
```

## Rollback

Automatic rollback triggers if healthcheck fails within 30s after deploy.

Manual rollback:
```bash
ssh venus
cd /opt/metrico
IMAGE_TAG=sha-<previous_sha> docker compose -f docker-compose.prod.yml up -d --no-deps app
```

## Environment Variables on VPS

The `docker-compose.prod.yml` reads env vars from the environment.
On VPS, set them via `.env.production` and load with:

```bash
export $(cat .env.production | xargs)
```

Or use Docker Compose's `env_file`:

```yaml
# Add to app service in docker-compose.prod.yml if preferred
env_file: .env.production
```
