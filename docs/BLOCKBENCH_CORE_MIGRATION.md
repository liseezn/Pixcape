# Blockbench Core Migration Assessment

Date: 2026-10-11

## Decision

Use the upstream Blockbench source as the editor core on an isolated Pixcape branch. Do not attempt to import Blockbench as an npm dependency: it is an application with its own build pipeline, application lifecycle, format registry, UI, and plugin APIs.

Upstream reference: https://github.com/JannisX11/blockbench
Upstream license: GPL-3.0, see https://github.com/JannisX11/blockbench/blob/master/LICENSE.MD

## Repository audit

Pixcape `main` currently uses:
- React 18 + TypeScript + Vite 6.
- Three.js as a direct dependency.
- `npm run build`: `tsc -b && vite build`.
- A multi-stage Docker image: Node 22 builds `dist`, Nginx serves it on port 80.
- Nginx SPA fallback and a `/health` endpoint.
- The current UI is a small 64×64 Canvas 2D pixel editor with a Three.js preview, not a full 3D model/animation application.
- The existing README says MIT. That declaration cannot be carried over to upstream Blockbench source as if the combined application remained MIT-only.

Upstream Blockbench package metadata (currently inspected):
- Version 5.2.2.
- Node.js >= 20.
- Its own build system in `build.js`.
- Web build command: `npm run build-web` (runs `node ./build.js --target=web`).
- Web development command: `npm run serve`.
- Electron build is separate from the web build.

## Compatibility findings

1. Blockbench is not a React component or a drop-in Three.js dependency. Replacing Pixcape's UI with a dependency import will not work.
2. A direct-source migration must bring in the upstream source tree and preserve its build scripts, assets, dependencies, and license notices. Pixcape-specific UI should be added as a downstream customization/plugin or maintained patch set.
3. The current Dockerfile assumes Vite emits `/app/dist`. Before using it for Blockbench, confirm the actual output path and web-server requirements of the upstream web target; do not assume the current image will continue to build unchanged.
4. The current Nginx config may need adjustments for Blockbench's generated web assets, routing, cache behavior, and any runtime endpoints.
5. Pixcape's current MIT license and Blockbench's GPL-3.0 obligations need explicit reconciliation. Distributing a modified combined application generally requires compliance with GPL-3.0, including preserving notices and providing corresponding source under GPL-compatible terms. This is a technical assessment, not legal advice.
6. Keep `main` and the existing deployment untouched until the migrated web build and Docker image have been validated.

## Migration sequence

### Stage 1 — Isolated baseline
- Work on `feat/blockbench-core-migration`, based on Pixcape `main`.
- Keep a record of the original Docker/Nginx deployment assumptions.
- Preserve a rollback path to `main`.

### Stage 2 — Import upstream source
- Vendor or fork a pinned Blockbench upstream revision into this branch (not a runtime npm dependency).
- Preserve upstream copyright and GPL-3.0 files and notices.
- Record the exact upstream commit in this document when imported.
- Avoid copying only selected UI files; Blockbench relies on a coordinated source tree and build pipeline.

### Stage 3 — Build and deployment adaptation
- Install using the upstream lockfile and supported Node version.
- Run the upstream web build first, then verify its output directory.
- Adapt Dockerfile and Nginx only after the real build output and routing are known.
- Keep container port 80 and health checks compatible with the current Zeabur deployment.

### Stage 4 — Pixcape product layer
- Add Pixcape branding and a dedicated Minecraft workflow without removing general Blockbench features.
- Provide separate modes/workspaces for:
  - General 3D model editing.
  - Texture painting and UV editing.
  - Animation timeline and keyframes.
  - Minecraft skin editing.
  - Wearable presets: cape and shoulder cape are distinct items; hats, tops, trousers, and shoes are separate assets.
- Keep skin/clothing presets as Pixcape-specific features; do not mislabel a shoulder cape as a cape.

### Stage 5 — Verification before merge
- Run upstream web build and the Docker build.
- Smoke-test model creation, texture painting, UVs, animation timeline, import/export, and responsive viewport behavior.
- Verify the production container responds on port 80 and `/health`.
- Review license notices and source-distribution compliance.
- Merge to `main` only after CI passes and the existing Zeabur deployment path is confirmed.

## Current status

- [x] Inspected Pixcape `main` package scripts, React/Vite/Three.js dependencies, README, Dockerfile, Nginx configuration, and entry point.
- [x] Inspected the existing `feat/blockbench-inspired-editor` branch; its package and deployment configuration match `main`.
- [x] Inspected upstream Blockbench package scripts and GPL-3.0 notice.
- [x] Created isolated branch `feat/blockbench-core-migration`.
- [ ] Upstream Blockbench source has not yet been imported.
- [ ] No build has been run in a CI or local runtime during this audit.
- [ ] No deployment configuration has been changed.

This branch intentionally does not claim a successful Blockbench build until the upstream source tree is imported and the actual build can be run.
