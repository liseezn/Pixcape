# Pixcape AI API

Independent Node.js API service for text-to-image and reference-image generation. It keeps provider keys server-side and is designed to run as a separate Zeabur service/container.

## Endpoints

- `GET /health`
- `GET /api/ai/models`: lists only providers with configured credentials (OpenRouter also requires a model ID).
- `POST /api/ai/generate`: multipart form fields `prompt`, `model` (e.g. `gemini:gemini-2.5-flash-image`, `openai:gpt-image-1.5`, `openrouter:provider/model-id`, or `auto`), `task` (`text-to-image` or `image-to-image`), and optional file field `reference`.

## Local run

```sh
cd ai-api
cp .env.example .env
# Set provider keys in your shell or a local untracked .env loader.
npm install
npm start
```

The API intentionally does not load `.env` itself; inject environment variables via your shell or deployment secrets manager. Configure multiple model IDs as comma- or semicolon-separated lists in `GEMINI_IMAGE_MODELS`, `OPENAI_IMAGE_MODELS`, and `OPENROUTER_IMAGE_MODELS`; legacy singular variables remain supported.

## Deployment

Create a separate service from the repository's `ai-api/Dockerfile`, set its root/build context to the repository root (Dockerfile path `ai-api/Dockerfile`), and add the secret variables shown in `.env.example`. Configure `AI_ALLOWED_ORIGINS` to the exact Pixcape frontend origin(s). The frontend must set `VITE_AI_API_BASE_URL` to the API base path, e.g. `https://your-ai-api.example/api/ai` (no trailing slash). If using a same-origin reverse proxy, leave it as `/api/ai` and route `/api/ai/*` to this service. The repository's local Vite dev server proxies `/api/ai` to `http://127.0.0.1:8787`.

## Security and limitations

- Keys are read only by the API service; never use `VITE_*` for secrets.
- Basic per-IP rate limiting, upload limits, content-type allow-list, request timeouts, security headers, and origin checks are enabled. Put a platform-level rate limit/WAF in front for production and configure trusted proxy behavior correctly before relying on IP-based limits.
- Provider model IDs and image API capabilities change. Validate the exact selected model against the provider's current docs/account before production use.
- Generated output is mapped from a generated front/back panel into a 64×64 UV PNG. The converter fills base faces, synthesizes side/top/bottom faces, and makes unused UV regions transparent. This is structural validation only: image-model panel alignment and visual fidelity still require review in a 3D preview before treating a result as production-ready.
- The API does not silently switch a user's explicitly selected model to another provider.

## Docker Compose quick start

The root `docker-compose.yml` includes the isolated API service. Set the provider secrets and `AI_ALLOWED_ORIGINS=http://localhost:8080` in the shell or an untracked deployment env file, then run `docker compose up --build`. The Nginx reverse-proxy configuration for same-origin routing is a separate deployment choice; if exposing the API on its own public domain, build the frontend with `VITE_AI_API_BASE_URL=https://your-ai-api.example/api/ai` and set `AI_ALLOWED_ORIGINS` to the exact frontend origin.


## Skin conversion status

The API now converts generated side-by-side front/back character panels to a 64×64 PNG and exposes Classic (4px arms) / Slim (3px arms) selection. The UV converter is a first-pass implementation, not a guarantee that every provider follows the requested panel layout. Inspect the exported PNG in Pixcape's 3D viewer before using it in-game; provider credentials and real-provider end-to-end checks are still required.
