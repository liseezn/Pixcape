# Pixcape

A lightweight 64×64 pixel-art studio built with React, TypeScript, Vite, and Canvas 2D.

## Features
- 64×64 pixel canvas with pencil and eraser tools
- Color palette and custom color picker
- Grid toggle and clear-canvas action
- Import an image and scale it to the canvas
- Export transparent PNG
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
