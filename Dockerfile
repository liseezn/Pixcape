# Build Blockbench static assets.
FROM node:24-bookworm-slim AS blockbench-build
ARG BLOCKBENCH_REF=5b0c99cd5a0e0ef3d15f52e91e945672076022ac
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /blockbench
RUN git init && git remote add origin https://github.com/liseezn/blockbench.git && git fetch --depth=1 origin "$BLOCKBENCH_REF" && git checkout --detach FETCH_HEAD
RUN npm ci && npm run build-web && test -s dist/bundle.js
RUN mkdir -p /runtime && cp index.html favicon.png icon_full.png manifest.webmanifest LICENSE.MD /runtime/ && cp -a assets css content dist font icons js keymaps lang lib themes /runtime/

# Build the Vite frontend.
FROM node:24-alpine AS pixcape-build
ARG VITE_AI_API_BASE_URL=/api/ai
ENV VITE_AI_API_BASE_URL=$VITE_AI_API_BASE_URL
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build:app

# Build Next.js and a provider-matched Prisma client.
FROM node:22-alpine AS next-build
ARG DATABASE_PROVIDER=postgresql
ENV DATABASE_PROVIDER=$DATABASE_PROVIDER NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run db:generate && npm run next:build

# AI API native dependencies (including sharp) use the same Node/Alpine ABI.
FROM node:22-alpine AS ai-api-build
WORKDIR /ai-api
COPY ai-api/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY ai-api/ ./

# Single image: keep the exact Node 22 Alpine runtime used to compile Prisma/SQLite/sharp native modules.
FROM node:22-alpine AS runtime
RUN apk add --no-cache nginx
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY --from=pixcape-build /app/dist /usr/share/nginx/html
COPY --from=blockbench-build /runtime/ /usr/share/nginx/html/blockbench/
COPY --from=next-build /app/package.json /app/package.json
COPY --from=next-build /app/node_modules /app/node_modules
COPY --from=next-build /app/.next /app/.next
COPY --from=next-build /app/app /app/app
COPY --from=next-build /app/pages /app/pages
COPY --from=next-build /app/lib /app/lib
COPY --from=next-build /app/prisma /app/prisma
COPY --from=next-build /app/prisma.config.ts /app/prisma.config.ts
COPY --from=next-build /app/auth.ts /app/auth.ts
COPY --from=next-build /app/next.config.ts /app/next.config.ts
COPY --from=next-build /app/tsconfig.next.json /app/tsconfig.next.json
COPY --from=next-build /app/next-env.d.ts /app/next-env.d.ts
COPY --from=next-build /app/.database-provider-build /app/.database-provider-build
COPY --from=ai-api-build /ai-api /opt/pixcape-ai-api
COPY docker-entrypoint-single.sh /usr/local/bin/docker-entrypoint-single.sh
COPY THIRD_PARTY_NOTICES.md /usr/share/nginx/html/THIRD_PARTY_NOTICES.md
RUN chmod +x /usr/local/bin/docker-entrypoint-single.sh && mkdir -p /data
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=127.0.0.1 PORT=3000 AI_PORT=8787
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD node -e "Promise.all([fetch('http://127.0.0.1:3000/login'),fetch('http://127.0.0.1:8787/health')]).then(r=>process.exit(r.every(x=>x.status<500)?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/local/bin/docker-entrypoint-single.sh"]
