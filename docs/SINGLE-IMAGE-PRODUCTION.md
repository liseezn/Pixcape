# Single-image production deployment

Updated: 2026-10-17

## Production entry point

The root `Dockerfile` builds one deployable image containing:
- Vite skin editor at `/`
- Blockbench at `/blockbench/`
- Next.js account/creator/admin routes: `/login`, `/account`, `/creator`, `/admin`
- NextAuth and other Next.js API routes under `/api/`
- AI API under `/api/ai/`

The container entry point is `/usr/local/bin/docker-entrypoint-single.sh`. It checks the selected database provider, runs `npm run db:migrate`, then starts the AI API, Next.js on port 3000 and Nginx on port 80. Migration failure prevents the app from starting. Container health checks both Next.js and the AI API.

## Runtime-selectable database providers

The same image contains three provider-specific Prisma Clients and their matching migration directories. Choose the database at runtime with `DATABASE_PROVIDER`; changing providers does not require rebuilding the image. The entrypoint applies the selected provider's migrations before starting services.

Supported values:
- `postgresql`: `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/pixcape?schema=public`
- `mysql`: `DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/pixcape`
- `sqlite`: `DATABASE_URL=file:/data/pixcape.db`

PostgreSQL and MySQL need a provisioned database and least-privilege user. SQLite is intended for a single instance and requires the persistent `/data` volume; do not share a SQLite file between replicas.

## Environment variables

Required for the account service:
- `DATABASE_PROVIDER`: `postgresql`, `mysql`, or `sqlite`; selects the database at runtime without rebuilding the image.
- `DATABASE_URL`: connection URL for the selected database.
- `NEXTAUTH_SECRET`: unique high-entropy production secret.
- `NEXTAUTH_URL`: public HTTPS URL used by NextAuth.

GitHub OAuth:
- `AUTH_GITHUB_ID`: OAuth client ID; required to enable GitHub sign-in.
- `AUTH_GITHUB_SECRET`: OAuth client secret; required to enable GitHub sign-in.

Login throttling:
- `LOGIN_RATE_LIMIT_MAX`: default `10` attempts per window.
- `LOGIN_RATE_LIMIT_WINDOW_SECONDS`: default `900` seconds.
- `LOGIN_RATE_LIMIT_IP_HEADER`: default `x-real-ip`; only trust it when the reverse proxy overwrites it.

General runtime:
- `NODE_ENV`: set to `production`.
- `PIXELCAPE_PORT`: host port mapped to container port 80; compose default `8080`.

AI API variables (optional unless the corresponding provider is used):
- `AI_ALLOWED_ORIGINS` (default empty)
- `AI_DEFAULT_PROVIDER` (default `auto`)
- `AI_DEFAULT_MODEL` (default empty)
- `AI_MAX_UPLOAD_MB` (default `8`)
- `AI_RATE_LIMIT_PER_MINUTE` (default `5`)
- `AI_TIMEOUT_MS` (default `90000`)
- `GEMINI_API_KEY`, `GEMINI_IMAGE_MODELS` (default `gemini-2.5-flash-image`)
- `OPENAI_API_KEY`, `OPENAI_IMAGE_MODELS` (default `gpt-image-1,gpt-image-1.5`)
- `OPENROUTER_API_KEY`, `OPENROUTER_IMAGE_MODELS`, `OPENROUTER_IMAGE_TO_IMAGE_MODELS`, `OPENROUTER_SITE_URL` (optional attribution URL sent to OpenRouter; defaults to `https://pixcape.app`)
- Legacy single-model aliases accepted by the AI API: `GEMINI_IMAGE_MODEL`, `OPENAI_IMAGE_MODEL`, `OPENROUTER_IMAGE_MODEL`, `OPENROUTER_IMAGE_TO_IMAGE_MODEL`, and `SEEDREAM_IMAGE_MODEL`; prefer the plural `*_MODELS` variables for multi-model configuration.
- `ARK_API_KEY`, `VOLCENGINE_ARK_API_KEY`, `ARK_BASE_URL` (default `https://ark.cn-beijing.volces.com/api/v3`)
- `SEEDREAM_IMAGE_MODELS` (default `doubao-seedream-4-0-250828`)
- `SEEDREAM_IMAGE_SIZE` (default `2K`)

One-time admin bootstrap:
- `BOOTSTRAP_ADMIN_EMAIL` is consumed only by `npm run db:bootstrap-admin`; it is not required for normal startup. Remove it immediately after the controlled bootstrap operation.

Never place database passwords, OAuth secrets, or `NEXTAUTH_SECRET` in `VITE_*` / `NEXT_PUBLIC_*` variables, source control, or image build args.

## Compose deployment

Set the variables in the deployment platform or a private `.env` file. Compose passes the database, auth and rate-limit variables to the same container that runs Next.js.

```bash
docker compose build
docker compose up -d
docker compose logs -f pixcape
```

For SQLite, retain the named `pixcape-data` volume. For PostgreSQL/MySQL, create the database and a least-privilege database user before starting the service. Back up the database before each production release; `prisma migrate deploy` runs automatically at container startup.

## Verification status

A successful image build alone does not prove database connectivity or persistence. For each provider, verify a provider-matched build against a disposable database, migration status, OAuth sign-in, user creation/read-back, rate-limit persistence and data survival after container restart. Check `/`, `/blockbench/`, `/login`, `/api/auth/providers`, `/api/ai/models` and `/health`. Do not claim production verification until those checks have been executed against the actual deployment.
