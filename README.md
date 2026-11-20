# Tagum City 3D — Geospatial & Print Workbench

An interactive, geographically referenced 3D city model and modular 3D-printing workbench for **Tagum City, Davao del Norte, Philippines** (`195.8 km²`, 23 barangays, 300,042 residents).

Built with **React 19**, **TypeScript**, **Three.js**, **Tailwind CSS v4**, and an **Express** geospatial proxy server, the workbench streams live **OpenStreetMap** building footprints and road networks, real **AWS Terrarium DEM** elevation terrain, and progressive high-resolution **Esri World Imagery** (up to Zoom 18 / `~0.59 m/px`) across a 16-tile (`4 × 4 km`) urban core centered on Magugpo, paired with watertight binary **STL** export for modular FDM 3D printing.

---

## Key Features

### Live Geographically Accurate 3D City (`4 × 4 km` Urban Core)
- **WGS84 Metric Projection**: Anchored at `7.4450°N, 125.8120°E` where `1.0` scene unit = `100 m`, dividing the `4 × 4 km` urban core into **16 uniform `1 × 1 km` spatial tiles (`A1`–`D4`)**.
- **Automatic 16-Tile OpenStreetMap Streaming**: Automatically loads real building polygons, road networks, and waterways across all 16 tiles on startup from downtown Magugpo outward using a 3-worker concurrent queue, automatic retry, and server-side request deduplication.
- **Real Elevation Terrain (AWS Terrarium DEM)**: Decodes live Zoom 12 Terrarium elevation tiles (`elevation_m = (R * 256 + G + B / 256) - 32768`) to shape terrain meshes, base skirts, roads, buildings, and landmarks accurately above sea level.
- **Progressive Crystal-Clear Satellite Imagery**:
  1. **Pass 1 (Instant Load)**: Zoom 16 (`~2.4 m/px`, `768×768` per tile) Esri World Imagery + Carto Voyager Street Map.
  2. **Pass 2 (Core HD Sharpen)**: Automatic background upgrade to Zoom 17 (`~1.18 m/px`, `1024×1024` per tile) across all 16 tiles.
  3. **Pass 3 (Focused Ultra-HD)**: Automatic **Zoom 18** (`~0.59 m/px`, `1536×1536`) upgrade whenever a tile is selected or jumped to via a landmark.

### 8 Photo-Referenced 1:1 Landmarks (Jump-Only Reveal)
Detailed architectural models remain hidden during overview exploration so raw OSM footprints render uninterrupted, then materialize smoothly when clicked from the **Jump** bar while cleanly hiding the overlapping flat-top OSM polygon underneath:

| Landmark | Tile | WGS84 Coordinates | Architectural Reference |
| --- | :---: | --- | --- |
| **Freedom Park & Historical Cultural Center** | `B2` | `7.44759°N, 125.80412°E` | 2021 contemporary white arched colonnade along Rizal St, Tagumpay Theater & Freedom Park plaza (`64 × 36 m`) |
| **Tagum City Trade & Cultural Center Pavilion** | `B2` | `7.44934°N, 125.80408°E` | Twin wide-span curved steel-truss tropical trade halls along Quezon St with ventilated clerestory ridge monitors (`52 × 108 m`) |
| **Gaisano Mall of Tagum** | `C2` | `7.44929°N, 125.81203°E` | Dual commercial wings (Buildings A & B) linked by an elevated glazed skybridge along Daang Maharlika |
| **Christ the King Cathedral** | `A3` | `7.44102°N, 125.79995°E` | Medieval castle-fortress cathedral with twin crenellated towers, Kublai fountain & 85.5 m Wooden Rosary Garden |
| **Big 8 Corporate Hotel** | `B3` | `7.44168°N, 125.80618°E` | Flagship 8-storey cream-stone modern neo-classical hotel with pilasters, dentil cornice crown & resort pool deck |
| **New Tagum City Hall** | `D3` | `7.44080°N, 125.82648°E` | Architect Sol Flores glass-and-steel executive & legislative wings beneath a sweeping curved steel-truss atrium canopy (`114 × 81 m`) |
| **Robinsons Place Tagum** | `A4` | `7.42958°N, 125.79719°E` | Architect Jonathan O. Gan "Green City Malling" 3-level complex with clerestory glass atrium, blue/orange fascia & illuminated 6 m Supertrees |
| **Iglesia ni Cristo — Locale of Tagum City** | `D4` | `7.42773°N, 125.82540°E` | Pristine white & pastel sage-green neo-Gothic sanctuary with soaring slender vertical spires, lancet windows & grand steps |

### Modular 3D Printing & Binary STL Export
- **Watertight Printable Geometry**: Every tile includes a solid 4 mm base skirt and chamfered interlocking zipper tabs along interior boundaries so individually printed `200 × 200 mm` tiles lock together without glue drift.
- **Direct Client-Side Binary STL Exporter**: Export either the currently selected `1 × 1 km` tile or the entire `4 × 4 km` 16-tile core directly to manifold binary `.stl` scaled to your chosen physical map ratio (`1:1,000` to `1:10,000`).
- **Live Controls**: Real-time **Explode 16 Tiles** slider (`0%` default contiguous layout up to `100%` exploded bed preview), **Height Boost** (`1.0×`–`2.5×`) for crisp thin-wall printing, and 4 surface visualization modes (**Satellite**, **Street Map**, **Matte PLA**, **Real DEM**).
- **Interactive Engineering Field Guide**: Built-in reference modal covering print scale trade-offs, open geospatial datasets (OSM, Google Open Buildings, Overture, Copernicus GLO-30, UP Phil-LiDAR), and a copy-ready Python vector-to-STL pipeline script pre-configured for the active tile and scale.

---

## 3D Printing Scale Matrix (`200 × 200 mm` Modular Tiles)

Calculated for standard `220 × 220 mm` or `256 × 256 mm` FDM build plates using a `0.4 mm` nozzle (`0.8 mm` minimum two-perimeter wall thickness):

| Scale | Ground Area / Tile | `4 × 4 km` Core | Full City (`195.8 km²`) | Min. Printable Feature (`0.8 mm`) | 10 m Building Height | Recommended Use |
| :---: | :---: | :---: | :---: | :---: | :---: | --- |
| **1:1,000** | `200 × 200 m` | 400 tiles (`4.0 × 4.0 m`) | ~4,895 tiles | `0.8 m` | `10.0 mm` | Single landmark or campus block |
| **1:2,000** | `400 × 400 m` | 100 tiles (`2.0 × 2.0 m`) | ~1,224 tiles | `1.6 m` | `5.0 mm` | Detailed downtown block series |
| **1:2,500** | `500 × 500 m` | 64 tiles (`1.6 × 1.6 m`) | ~783 tiles | `2.0 m` | `4.0 mm` | Multi-block urban corridor display |
| **1:5,000** | `1,000 × 1,000 m` | **16 tiles (`0.8 × 0.8 m`)** | ~196 tiles | `4.0 m` | `2.0 mm` | **Default** — Desk/wall Magugpo core |
| **1:10,000** | `2,000 × 2,000 m` | 4 tiles (`0.4 × 0.4 m`) | ~49 tiles | `8.0 m` | `1.0 mm` | Full-municipality topographic relief |

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **3D Engine**: Three.js (`ACESFilmicToneMapping`, `RoomEnvironment` PMREM IBL, `OrbitControls`, `BufferGeometryUtils` batched OSM extrusion, adaptive software-WebGL detection & frame pacing)
- **Backend Server**: Express 4 (`tsx` in development, Node.js in production) acting as a CORS-safe caching proxy for OpenStreetMap, Overpass fallbacks, Esri World Imagery, Carto Voyager, and AWS Terrarium DEM tiles

---

## Repository Structure

```text
├── server.ts                       # Express server + Vite middleware + CORS-safe OSM & raster tile cache proxy
├── index.html                      # Application HTML entry point & OpenGraph metadata
├── package.json                    # Scripts and dependencies
├── vite.config.ts                  # Vite + React + Tailwind v4 build config
└── src/
    ├── App.tsx                     # Root application state, automatic 16-tile OSM streaming & camera coordination
    ├── main.tsx                    # React DOM entry point
    ├── index.css                   # Tailwind CSS v4 styles, tabular numerals, custom dock sliders
    ├── data/
    │   └── tagumData.ts            # Verified landmark coordinates, 16-tile metadata, print scales & Python generator
    ├── components/
    │   ├── TagumViewport.tsx       # Full-bleed Three.js canvas, raycasting, progressive z16/z17/z18 satellite & camera fly-to
    │   ├── ControlDock.tsx         # Collapsible bottom control dock (Real Map & OSM, 3D Print & STL, Jump bar)
    │   └── FieldGuideModal.tsx     # Engineering reference tables & pre-configured Python vector-to-STL script
    └── scene/
        ├── geoProjection.ts        # Exact WGS84 <-> metric Three.js scene & Web Mercator tile math
        ├── terrainMath.ts          # Real AWS Terrarium DEM sampler & elevation interpolation
        ├── realGeoLoader.ts        # Multi-zoom Esri/Carto canvas stitcher, Zoom 18 HD tile loader & OSM fetcher
        ├── tileBuilder.ts          # 16-tile terrain/skirt builder, batched OSM extrusions, road ribbons & landmark mounts
        ├── landmarks.ts            # 8 photo-referenced composite 1:1 Three.js landmark builders
        ├── materials.ts            # PBR materials & surface mode switching (Satellite, Street Map, PLA, DEM)
        ├── textures.ts             # Procedural contact shadow, grid fallback & PLA micro-bump textures
        └── stlExporter.ts          # Watertight binary STL serializer (single tile or full 4×4 core)
```

---

## Getting Started

### Prerequisites
- **Node.js** `>= 20` (or **Bun** / **npm**)

### Installation & Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start the full-stack dev server (Express + Vite middleware on port 3000)
npm run dev
```

Open **`http://localhost:3000`** in your browser. All 16 OSM tiles, AWS Terrarium DEM elevation, and progressive satellite imagery will begin streaming automatically.

### Build & Type Check

```bash
# Type-check TypeScript without emitting files
npm run lint

# Build production client bundle to dist/
npm run build

# Run production server (serves dist/ + /api/geo/* routes on port 3000)
NODE_ENV=production npm start
```

---

## Backend Proxy API

`server.ts` exposes two cached geospatial endpoints to avoid browser CORS restrictions and rate-limit spikes:

| Endpoint | Description |
| --- | --- |
| `GET /api/geo/osm?south=&west=&north=&east=` | Fetches buildings, roads, and waterways for a Tagum bounding box from the official **OpenStreetMap v0.6 API** (with automatic `2×2` quad subdivision for ultra-dense blocks and multi-mirror Overpass fallback), deduplicated in-flight and cached in memory. |
| `GET /api/geo/tile/:source/:z/:x/:y` | Proxies and caches raster map tiles (`z` 10–18, LRU cache up to 1,200 tiles) for `source` ∈ `satellite` (Esri World Imagery), `osm` (Carto Voyager), or `elevation` (AWS Terrarium DEM). |

---

## Navigation & Controls

- **Left-Drag**: Orbit around the current city core or selected tile anchor
- **Right-Drag**: Pan across the `4 × 4 km` Tagum core
- **Scroll Wheel**: Zoom in/out (`minDistance: 1.1`, `maxDistance: 88`)
- **Click Any Tile**: Focuses the camera smoothly onto that tile's center (preserving your viewing azimuth) and triggers an automatic **Zoom 18 HD** satellite upgrade
- **Jump Bar**: Flies to overview presets (**City Core**, **Top Map**, **Print Bed**) or any of the **8 1:1 Landmarks**
- **`H` Key**: Toggles Zen/Cinema mode (hides/shows the bottom control dock)
- **`Esc` Key**: Closes the Field Guide modal

---

## Geospatial Data Attribution

- **Buildings, Roads & Waterways**: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL)
- **Satellite Imagery**: Esri World Imagery (Esri, Maxar, Earthstar Geographics, and the GIS User Community)
- **Street Basemap**: CARTO Voyager / OpenStreetMap contributors
- **Elevation Terrain**: AWS Mapzen Terrarium Open Terrain Tiles (SRTM / Copernicus-derived)

---

## License

MIT License — feel free to fork, adapt, and extend for other Philippine cities or modular 3D-printed urban models.
