# Single-image production deployment

Updated: 2026-10-18

## Production layout

The root `Dockerfile` produces the deployable Pixcape image. The intended routes are:

- Vite editor at `/`
- Blockbench at `/blockbench/`
- Next.js account and creator/admin pages, including `/login`, `/account`, `/creator`, and `/admin`
- Next.js authentication/API routes under `/api/`
- AI API under `/api/ai/`

The container entrypoint is `docker-entrypoint-single.sh`. It applies Prisma migrations when `DATABASE_URL` is configured, then starts the AI API, Next.js, and Nginx. Check the actual container logs and health endpoints after deployment; a successful image build alone does not prove that all services are reachable.

## Database configuration

Set `DATABASE_PROVIDER` and `DATABASE_URL` together:

| Provider | `DATABASE_PROVIDER` | Example `DATABASE_URL` |
|---|---|---|
| PostgreSQL | `postgresql` | `postgresql://USER:PASSWORD@HOST:5432/pixcape?schema=public` |
| MySQL | `mysql` | `mysql://USER:PASSWORD@HOST:3306/pixcape` |
| SQLite | `sqlite` | `file:/data/pixcape.db` |

The application contains provider-specific Prisma clients under `generated/prisma-postgresql`, `generated/prisma-mysql`, and `generated/prisma-sqlite`. Select the matching provider at runtime. PostgreSQL and MySQL require a provisioned database and a least-privilege user. SQLite is intended for a single instance and requires persistent storage mounted at `/data`; do not share a SQLite database file between replicas.

Back up the database before deploying a release that changes migrations. Startup migration failures must be treated as a deployment failure and investigated before routing traffic.

## Required environment variables

- `DATABASE_PROVIDER`: `postgresql`, `mysql`, or `sqlite`.
- `DATABASE_URL`: connection URL for the selected provider.
- `NEXTAUTH_SECRET`: unique, high-entropy production secret.
- `NEXTAUTH_URL`: the public HTTPS URL used by the authentication service.

GitHub OAuth (optional unless GitHub sign-in is enabled):

- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`

Login rate limiting:

- `LOGIN_RATE_LIMIT_MAX`: maximum attempts per window.
- `LOGIN_RATE_LIMIT_WINDOW_SECONDS`: window length in seconds.
- `LOGIN_RATE_LIMIT_IP_HEADER`: proxy header used to determine the client IP. Trust it only when the reverse proxy overwrites the header.

General runtime:

- `NODE_ENV`: use `production`.
- `PIXELCAPE_PORT`: host port mapped to container port 80 when using Compose.

AI API variables (optional unless the corresponding provider is used):

- `AI_ALLOWED_ORIGINS`
- `AI_DEFAULT_PROVIDER`
- `AI_DEFAULT_MODEL`
- `AI_MAX_UPLOAD_MB`
- `AI_RATE_LIMIT_PER_MINUTE`
- `AI_TIMEOUT_MS`
- `GEMINI_API_KEY`, `GEMINI_IMAGE_MODELS`, and legacy alias `GEMINI_IMAGE_MODEL`
- `OPENAI_API_KEY`, `OPENAI_IMAGE_MODELS`, and legacy alias `OPENAI_IMAGE_MODEL`
- `OPENROUTER_API_KEY`, `OPENROUTER_IMAGE_MODELS`, `OPENROUTER_IMAGE_TO_IMAGE_MODELS`, `OPENROUTER_SITE_URL`, and legacy aliases `OPENROUTER_IMAGE_MODEL`, `OPENROUTER_IMAGE_TO_IMAGE_MODEL`
- `ARK_API_KEY` or `VOLCENGINE_ARK_API_KEY`, `ARK_BASE_URL`
- `SEEDREAM_IMAGE_MODELS`, legacy alias `SEEDREAM_IMAGE_MODEL`, and `SEEDREAM_IMAGE_SIZE`

Admin bootstrap is an explicit operator action: `BOOTSTRAP_ADMIN_EMAIL` is used by `npm run db:bootstrap-admin`; it is not required for normal startup. Remove it immediately after the controlled bootstrap operation.

Never put database passwords, OAuth secrets, or `NEXTAUTH_SECRET` in `VITE_*`/`NEXT_PUBLIC_*` variables, source control, or image build arguments.

## Compose deployment

Set environment variables in the deployment platform or a private `.env` file, then run:

```bash
docker compose build
docker compose up -d
docker compose logs -f pixcape
```

For SQLite, preserve the persistent `/data` volume. For PostgreSQL/MySQL, create the database and a least-privilege database user before starting the service.

## Deployment verification checklist

Run these checks against the actual image and deployment:

1. Confirm the container stays healthy and logs show successful database migration.
2. Verify `/`, `/blockbench/`, `/login`, `/api/auth/providers`, `/api/ai/models`, and `/health`.
3. Verify sign-in and role-based access for ordinary users, creators, and administrators.
4. Test rate limiting and confirm protected resources cannot be accessed by another user's account.
5. For each database provider, verify migration status, create/read-back persistence, and data survival after a container restart.
6. Confirm the published image tag and digest in the registry before treating a release as deployed.

Do not claim PostgreSQL, MySQL, or SQLite runtime compatibility based only on generated clients or a successful build. Each provider needs a matching integration/runtime test against a disposable database. CI can only run those checks after GitHub Actions billing and runner availability are restored.
