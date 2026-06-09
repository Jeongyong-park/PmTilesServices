# PMTiles Services — Boilerplate

Vector basemap boilerplate serving a **PMTiles** file from a Spring Boot 3 backend
and rendering it in the browser through **two switchable engines** — MapLibre GL JS
and OpenLayers — both driven by **one shared style** (`basemap-style.ts`).

```
PmTilesServices/
├── backend/                 # Spring Boot 3 (Java 17, Maven)
│   └── src/main/java/com/example/pmtiles/
│       ├── PmtilesApplication.java
│       ├── controller/TileApiController.java   # Range serving + glyphs
│       └── config/WebConfig.java               # dev CORS
├── frontend/                # Vite + React 19 + TypeScript
│   └── src/
│       ├── App.tsx                       # engine toggle
│       ├── styles/basemap-style.ts       # shared MapLibre style spec
│       └── components/
│           ├── MapLibreMap.tsx
│           └── OpenLayersMap.tsx
└── README.md
```

## How it works

- **Backend** serves `data/south-korea.pmtiles` (classpath resource) at
  `GET /api/tiles/south-korea.pmtiles` with **HTTP Range Request** support
  (`Accept-Ranges: bytes`, `206 Partial Content`). The PMTiles clients (MapLibre's
  `pmtiles://` protocol, OpenLayers' `ol-pmtiles`) fetch only the byte ranges they
  need. Glyph PBFs are served at `GET /api/tiles/fonts/{fontstack}/{range}.pbf`.
- **Frontend** runs on Vite (`:5173`) and proxies `/api` to the backend (`:8080`).
  Both map components consume the same `basemapStyle`:
  - **MapLibre** uses it directly (`pmtiles://` protocol registered via `pmtiles`).
  - **OpenLayers** builds a `PMTilesVectorSource` (`ol-pmtiles`) and applies the
    same style with `applyStyle` (`ol-mapbox-style`).

## Prerequisites

- JDK 17, Maven 3.9+
- Node.js 18+ (20+ recommended), npm
- A `south-korea.pmtiles` (OpenMapTiles schema) and optional Noto Sans glyph PBFs —
  see [`backend/src/main/resources/data/README.md`](backend/src/main/resources/data/README.md).

## Run (dev — two processes)

**1. Backend**

```bash
cd backend
mvn spring-boot:run
# → http://localhost:8080
```

**2. Frontend**

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Open http://localhost:5173. Map renders Korea via MapLibre by default; the toggle
(top-right) switches to OpenLayers rendering the **same** basemap data.

## Verify the backend directly

```bash
# Full file metadata
curl -sI http://localhost:8080/api/tiles/south-korea.pmtiles
#   → 200, Accept-Ranges: bytes, Content-Type: application/x-protobuf

# Range request
curl -sI -H "Range: bytes=0-99" http://localhost:8080/api/tiles/south-korea.pmtiles
#   → 206, Content-Range: bytes 0-99/<size>, Content-Length: 100

# Glyph (404 if not placed)
curl -sI "http://localhost:8080/api/tiles/fonts/Noto%20Sans%20Regular/0-255.pbf"
```

## Notes

- The classpath PMTiles resource is resolved to a real file once on first request
  (copied to a temp file when running from a packaged jar) so range seeks stay
  efficient via `RandomAccessFile`.
- Labels render only when glyph PBFs are present; geometry renders regardless.
- For production you can build the frontend (`npm run build`) and serve `dist/`
  from the same origin (e.g. copy into `backend/src/main/resources/static/`),
  making the dev CORS config a no-op.

Distilled from the `gi1ict/uiap-2024` reference implementation.
