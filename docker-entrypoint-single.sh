#!/bin/sh
set -eu
: "${DATABASE_PROVIDER:=postgresql}"
: "${DATABASE_URL:?DATABASE_URL is required}"
case "$DATABASE_PROVIDER" in postgresql|mysql|sqlite) ;; *) echo "Unsupported DATABASE_PROVIDER" >&2; exit 64 ;; esac
BUILT_PROVIDER="$(cat /app/.database-provider-build 2>/dev/null || true)"
if [ "$BUILT_PROVIDER" != "$DATABASE_PROVIDER" ]; then
  echo "Image Prisma client was built for '$BUILT_PROVIDER', but DATABASE_PROVIDER='$DATABASE_PROVIDER'. Rebuild the image with matching --build-arg DATABASE_PROVIDER." >&2
  exit 64
fi
if [ "$DATABASE_PROVIDER" = sqlite ]; then
  case "$DATABASE_URL" in file:*) ;; *) echo "SQLite DATABASE_URL must start with file:" >&2; exit 64 ;; esac
  mkdir -p /data
fi
echo "Applying Prisma migrations for $DATABASE_PROVIDER"
cd /app
npm run db:migrate
cd /opt/pixcape-ai-api
PORT=8787 node server.mjs &
AI_PID=$!
cd /app
PORT=3000 npm run next:start &
NEXT_PID=$!
nginx -g 'daemon off;' &
NGINX_PID=$!
trap 'kill "$AI_PID" "$NEXT_PID" "$NGINX_PID" 2>/dev/null || true' TERM INT
set +e
wait -n "$AI_PID" "$NEXT_PID" "$NGINX_PID"
STATUS=$?
set -e
kill "$AI_PID" "$NEXT_PID" "$NGINX_PID" 2>/dev/null || true
exit "$STATUS"
