# Pixcape

A Minecraft 64×64 skin and outfit studio built with React, TypeScript, Vite, Canvas 2D, and Three.js.

## Phase A: Preset Outfit Studio

- Preset shawl and coat textures based on the CapeSkinImage example assets.
- Separate cape picker with an independent 3D cape preview and standalone cape PNG export.
- Steve (classic arms) and Alex (slim arms) model options.
- Front/back preview controls and mouse/touch drag rotation.
- Import a standard 64×64 PNG skin, compose a shawl/coat overlay, and export the resulting skin PNG.
- Responsive layout for desktop and mobile.
- The original pixel editor remains available from the preset workspace.

### Asset attribution

The preset textures and sample skin are loaded from [lonelyang/CapeSkinImage](https://github.com/lonelyang/CapeSkinImage). Please review that project's license and attribution notes before redistributing the assets independently. The application links to the source project in the workspace.

## Existing pixel editor

- 64×64 pixel canvas with pencil, eraser, fill, eyedropper, line, rectangle and ellipse tools.
- Color palette, layer management, undo/redo, grid controls, and PNG export.
- Import images into the editor.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Docker

```bash
docker compose up --build -d
```

Then open http://localhost:8080.

## GitHub Actions / GHCR

The workflow in `.github/workflows/docker-publish.yml` builds and publishes the container image to GitHub Container Registry on pushes to `main` and version tags. The package is published as `ghcr.io/<owner>/pixcape`.

## License

MIT
