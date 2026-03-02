# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run watch      # Webpack watch mode (rebuilds on changes)
npm run build      # One-time Webpack build

# Run the server
node server.js     # Start on port 3000 (default)
SERVER_PORT=8080 node server.js  # Custom port

# Docker
docker build -t noknotes .
docker run -p 3000:3000 -v ./notes:/notes noknotes
```

No test suite is currently configured.

## Architecture

NokNotes is a self-hosted markdown note-taking app. Notes are stored as `.md` files on the server.

**Backend (`server.js`):** Express.js server with Socket.io.
- REST: `GET /api/notes` (list), `GET /api/note/:note` (read)
- WebSocket events: `saveNote`, `newNote`, `deleteNote` → broadcasts `notesUpdated` / `noteSaved` to all connected clients for real-time sync

**Frontend (`src/js/`):** Vanilla JS split into three modules:
- `api.js` — Socket.io connection and HTTP fetch calls
- `dom.js` — All DOM manipulation, event listeners, UI state
- `state.js` — Shared mutable state (`selectedNote`, `typingTimeout`, `easyMDE` instance)
- `index.js` — Entry point; wires everything together and imports SCSS

**Build:** Webpack 5 bundles `src/js/index.js` + SASS into `dist/app.js`. The `dist/` directory contains the static files served by Express; `dist/app.js` is gitignored (built artifact).

**Data flow:** Sidebar lists notes → user clicks to load → EasyMDE editor → 400ms debounce triggers `saveNote` via Socket.io → server writes `.md` file → broadcasts update to all clients.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `3000` | HTTP server port |
| `NOTE_DIR` | `./notes` | Directory where `.md` files are stored |

## Key Conventions

- Frontend uses ES6 modules (`"type": "module"` in package.json)
- EasyMDE editor and Socket.io client are loaded via CDN in `dist/index.html`
- SASS variables for breakpoints are in `src/scss/vars.scss`; color themes in `src/scss/colors.scss`
- Mobile layout: sidebar and editor toggle visibility (one shown at a time); tablet+ shows both side-by-side
