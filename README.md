# Pixcape

A Minecraft skin quick-customization studio built with React, TypeScript, Vite, Canvas 2D, and Three.js. The goal is fast assembly from ready-made clothing/accessory presets, with pixel-level editing available when needed.

## Features
- 64×64 pixel canvas with pencil and eraser tools
- Color palette and custom color picker
- Grid toggle and clear-canvas action
- Import an image and scale it to the canvas
- Export transparent PNG
- Ready-made asset browser for capes/shoulder wraps, hats, shirts, pants, and shoes
- Presets apply as editable layers, so assets can be recolored, erased, reordered, or combined
- Live Minecraft character preview with Steve/Alex model selection
- Responsive layout for desktop and mobile

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
``
Then open http://localhost:8080.

## GitHub Actions / GHCR
The workflow in `.github/workflows/docker-publish.yml` builds and publishes the container image to GitHub Container Registry on pushes to `main` and version tags. The package is published as `ghcr.io/<owner>/pixcape`.

To make the package public, open the package settings on GitHub and change visibility. To deploy it on a server, install Docker Compose, pull the image, and run it behind your preferred reverse proxy.

## License
MIT
