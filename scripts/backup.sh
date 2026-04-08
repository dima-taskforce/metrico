#!/usr/bin/env bash
# backup.sh — ежедневный бэкап metrico.db + uploads/
#
# Использование:
#   DEPLOY_DIR=/opt/metrico /opt/metrico/scripts/backup.sh
#
# Crontab (на VPS, запускать от пользователя с доступом к Docker):
#   0 3 * * * DEPLOY_DIR=/opt/metrico BACKUP_REMOTE=backup@backup-host:/backups/metrico \
#             /opt/metrico/scripts/backup.sh >> /var/log/metrico-backup.log 2>&1
#
# Переменные окружения:
#   DEPLOY_DIR      Путь к каталогу проекта (default: /opt/metrico)
#   BACKUP_BASE     Куда писать локальные снапшоты (default: $DEPLOY_DIR/backups)
#   BACKUP_REMOTE   rsync-цель для внешнего бэкапа, напр. user@host:/path
#                   Если не задана — только локальный снапшот
#   COMPOSE_PROJECT Имя Docker Compose проекта (default: metrico)

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/metrico}"
BACKUP_BASE="${BACKUP_BASE:-$DEPLOY_DIR/backups}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-metrico}"
DATE=$(date +%Y-%m-%d)
OUT="$BACKUP_BASE/$DATE"

log() { echo "[$(date -Iseconds)] $*"; }

mkdir -p "$OUT"
log "=== Backup start → $OUT ==="

# Копируем данные из Docker volume через временный Alpine-контейнер.
# Том называется <project>_data (docker compose naming convention).
docker run --rm \
  --name "metrico-backup-$DATE" \
  -v "${COMPOSE_PROJECT}_data:/source:ro" \
  -v "$OUT:/dest" \
  alpine sh -c '
    set -e
    if [ -f /source/metrico.db ]; then
      cp /source/metrico.db /dest/metrico.db
      echo "db: $(du -sh /dest/metrico.db | cut -f1)"
    else
      echo "db: not found (skipped)"
    fi
    if [ -d /source/uploads ]; then
      cp -a /source/uploads /dest/uploads
      echo "uploads: $(find /dest/uploads -type f | wc -l) files"
    else
      echo "uploads: not found (skipped)"
    fi
  ' | while IFS= read -r line; do log "$line"; done

log "Local snapshot size: $(du -sh "$OUT" | cut -f1)"

# Внешний rsync (опционально)
if [ -n "${BACKUP_REMOTE:-}" ]; then
  rsync -az --delete --stats \
    "$OUT/" "$BACKUP_REMOTE/$DATE/" \
    | grep -E 'sent|received|total size' \
    | while IFS= read -r line; do log "rsync: $line"; done
  log "Remote sync done → $BACKUP_REMOTE/$DATE/"
fi

# Удаляем снапшоты старше 7 дней
find "$BACKUP_BASE" -maxdepth 1 -mindepth 1 -type d -mtime +7 -print | \
  while IFS= read -r old; do
    log "Pruning: $old"
    rm -rf "$old"
  done

log "=== Backup done ==="
