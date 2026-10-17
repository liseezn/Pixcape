#!/bin/sh
set -eu

# Run the AI API inside this same container; Nginx remains PID 1.
cd /opt/pixcape-ai-api
node server.mjs &
AI_PID=$!

shutdown() {
  kill "$AI_PID" 2>/dev/null || true
}
trap shutdown TERM INT

nginx -g 'daemon off;' &
NGINX_PID=$!

wait -n "$AI_PID" "$NGINX_PID"
STATUS=$?
shutdown
kill "$NGINX_PID" 2>/dev/null || true
wait "$AI_PID" 2>/dev/null || true
wait "$NGINX_PID" 2>/dev/null || true
exit "$STATUS"
