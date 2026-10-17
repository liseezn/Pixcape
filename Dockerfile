# Build the GPL-licensed Blockbench web editor as a separate app served under /blockbench/.
FROM node:20-bookworm-slim AS blockbench-build
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

# Build the existing Pixcape skin and preset workspace without rebuilding Blockbench.
FROM node:22-alpine AS pixcape-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:app

# Serve both apps from one deployment: Pixcape at /, Blockbench at /blockbench/.
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=pixcape-build /app/dist /usr/share/nginx/html
COPY --from=blockbench-build /runtime/ /usr/share/nginx/html/blockbench/
COPY THIRD_PARTY_NOTICES.md /usr/share/nginx/html/THIRD_PARTY_NOTICES.md
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
