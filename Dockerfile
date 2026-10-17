# Build Blockbench as a static sub-app served under /blockbench/.
FROM node:24-bookworm-slim AS blockbench-build
ARG BLOCKBENCH_REF=5b0c99cd5a0e0ef3d15f52e91e945672076022ac
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /blockbench
RUN git init \
    && git remote add origin https://github.com/liseezn/blockbench.git \
    && git fetch --depth=1 origin "$BLOCKBENCH_REF" \
    && git checkout --detach FETCH_HEAD
RUN npm ci && npm run build-web && test -s dist/bundle.js
RUN mkdir -p /runtime \
    && cp index.html favicon.png icon_full.png manifest.webmanifest LICENSE.MD /runtime/ \
    && cp -a assets css content dist font icons js keymaps lang lib themes /runtime/ \
    && test -s /runtime/dist/bundle.js \
    && test -s /runtime/LICENSE.MD

# Build Pixcape frontend.
FROM node:24-alpine AS pixcape-build
ARG VITE_AI_API_BASE_URL=/api/ai
ENV VITE_AI_API_BASE_URL=$VITE_AI_API_BASE_URL
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:app

# Install AI API production dependencies on the same Alpine/Node ABI as runtime.
FROM node:22-alpine AS ai-api-build
WORKDIR /ai-api
COPY ai-api/package*.json ./
RUN npm install --omit=dev
COPY ai-api/ ./

# One deployable image: Nginx + Pixcape + Blockbench + AI API.
FROM nginx:1.29-alpine
RUN apk add --no-cache nodejs
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=pixcape-build /app/dist /usr/share/nginx/html
COPY --from=blockbench-build /runtime/ /usr/share/nginx/html/blockbench/
COPY --from=ai-api-build /ai-api /opt/pixcape-ai-api
COPY docker-entrypoint-single.sh /usr/local/bin/docker-entrypoint-single.sh
COPY THIRD_PARTY_NOTICES.md /usr/share/nginx/html/THIRD_PARTY_NOTICES.md
RUN chmod +x /usr/local/bin/docker-entrypoint-single.sh
ENV PORT=8787
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
ENTRYPOINT ["/usr/local/bin/docker-entrypoint-single.sh"]
