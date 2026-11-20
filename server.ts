import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

// Simple bounded in-memory caches so repeated tile/OSM requests are instantaneous
const osmCache = new Map<string, { payload: unknown; timestamp: number }>();
const inFlightOsm = new Map<string, Promise<unknown>>();
const tileCache = new Map<string, { buffer: Buffer; contentType: string }>();
const MAX_TILE_CACHE = 1200;
const MAX_OSM_CACHE = 64;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

interface RawOverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
}

interface ParsedOsmBuilding {
  id: number;
  name?: string;
  buildingType: string;
  amenity?: string;
  levels: number;
  heightM: number;
  polygon: Array<[number, number]>; // [lat, lon]
  centroid: [number, number];
}

interface ParsedOsmRoad {
  id: number;
  name?: string;
  highway: string;
  widthM: number;
  points: Array<[number, number]>;
}

interface ParsedOsmWaterway {
  id: number;
  name?: string;
  kind: 'line' | 'polygon';
  widthM: number;
  points: Array<[number, number]>;
}

function estimateBuildingHeight(tags: Record<string, string>): { levels: number; heightM: number } {
  const rawHeight = tags.height || tags['building:height'];
  if (rawHeight) {
    const parsed = parseFloat(rawHeight.replace(/[^\d.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 1.5 && parsed < 200) {
      return { levels: Math.max(1, Math.round(parsed / 3.4)), heightM: parsed };
    }
  }

  const rawLevels = tags['building:levels'];
  if (rawLevels) {
    const lv = parseFloat(rawLevels);
    if (Number.isFinite(lv) && lv >= 1 && lv <= 45) {
      return { levels: Math.round(lv), heightM: lv * 3.4 + 0.8 };
    }
  }

  const bType = (tags.building || '').toLowerCase();
  if (bType === 'cathedral' || bType === 'church') return { levels: 4, heightM: 16.0 };
  if (bType === 'civic' || bType === 'public' || bType === 'government') {
    return { levels: 3, heightM: 12.5 };
  }
  if (bType === 'commercial' || bType === 'retail' || bType === 'mall' || bType === 'hotel') {
    return { levels: 3, heightM: 11.2 };
  }
  if (bType === 'hospital' || bType === 'university' || bType === 'school') {
    return { levels: 3, heightM: 10.5 };
  }
  if (bType === 'industrial' || bType === 'warehouse') {
    return { levels: 2, heightM: 8.2 };
  }
  if (bType === 'apartments') return { levels: 4, heightM: 13.5 };
  if (bType === 'roof' || bType === 'shed' || bType === 'garage') {
    return { levels: 1, heightM: 3.6 };
  }
  // Standard Philippine single/two-story urban structure default
  return { levels: 1, heightM: 5.2 };
}

function estimateRoadWidth(highway: string): number {
  switch (highway) {
    case 'trunk':
    case 'trunk_link':
      return 14.0;
    case 'primary':
    case 'primary_link':
      return 11.0;
    case 'secondary':
      return 9.0;
    case 'tertiary':
      return 7.5;
    case 'residential':
    case 'unclassified':
      return 5.5;
    default:
      return 4.0;
  }
}

function parseOverpassJson(elements: RawOverpassElement[]) {
  const nodeMap = new Map<number, [number, number]>();
  for (const el of elements) {
    if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
      nodeMap.set(el.id, [el.lat, el.lon]);
    }
  }

  const buildings: ParsedOsmBuilding[] = [];
  const roads: ParsedOsmRoad[] = [];
  const waterways: ParsedOsmWaterway[] = [];
  const seenWayIds = new Set<number>();

  for (const el of elements) {
    if (el.type !== 'way' || !el.nodes || el.nodes.length < 2 || !el.tags) continue;
    if (seenWayIds.has(el.id)) continue;
    seenWayIds.add(el.id);

    const coords: Array<[number, number]> = [];
    for (const nid of el.nodes) {
      const pt = nodeMap.get(nid);
      if (pt) coords.push(pt);
    }
    if (coords.length < 2) continue;

    const tags = el.tags;

    if (tags.building && coords.length >= 4) {
      // Compute simple centroid
      let sumLat = 0;
      let sumLon = 0;
      const count = coords.length - 1;
      for (let i = 0; i < count; i++) {
        sumLat += coords[i][0];
        sumLon += coords[i][1];
      }
      const { levels, heightM } = estimateBuildingHeight(tags);
      buildings.push({
        id: el.id,
        name: tags.name,
        buildingType: tags.building === 'yes' ? 'building' : tags.building,
        amenity: tags.amenity || tags.shop || tags.office,
        levels,
        heightM,
        polygon: coords,
        centroid: [sumLat / count, sumLon / count],
      });
    } else if (tags.highway) {
      roads.push({
        id: el.id,
        name: tags.name,
        highway: tags.highway,
        widthM: estimateRoadWidth(tags.highway),
        points: coords,
      });
    } else if (tags.waterway || tags.natural === 'water') {
      const isClosed =
        coords.length >= 4 &&
        coords[0][0] === coords[coords.length - 1][0] &&
        coords[0][1] === coords[coords.length - 1][1];
      waterways.push({
        id: el.id,
        name: tags.name,
        kind: isClosed || tags.natural === 'water' ? 'polygon' : 'line',
        widthM: tags.waterway === 'river' ? 28 : tags.waterway === 'canal' ? 12 : 7,
        points: coords,
      });
    }
  }

  const namedPlaces = buildings
    .filter((b) => Boolean(b.name))
    .slice(0, 40)
    .map((b) => ({ id: b.id, name: b.name!, type: b.amenity || b.buildingType, heightM: b.heightM }));

  return {
    buildings,
    roads,
    waterways,
    stats: {
      buildingCount: buildings.length,
      roadCount: roads.length,
      waterwayCount: waterways.length,
      namedCount: buildings.filter((b) => Boolean(b.name)).length,
      namedSample: namedPlaces.slice(0, 12),
    },
  };
}

async function fetchOsm06BBox(
  south: number,
  west: number,
  north: number,
  east: number,
  depth = 0,
): Promise<RawOverpassElement[]> {
  const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${west.toFixed(6)},${south.toFixed(6)},${east.toFixed(6)},${north.toFixed(6)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TagumCity3DWorkbench/1.0 (+https://tagum3d.local)',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    // If a very dense downtown tile exceeds OSM 0.6's 50k node limit (HTTP 400), subdivide 2x2 once
    if (response.status === 400 && depth < 1) {
      const midLat = (south + north) / 2;
      const midLon = (west + east) / 2;
      const quads = await Promise.all([
        fetchOsm06BBox(south, west, midLat, midLon, depth + 1),
        fetchOsm06BBox(south, midLon, midLat, east, depth + 1),
        fetchOsm06BBox(midLat, west, north, midLon, depth + 1),
        fetchOsm06BBox(midLat, midLon, north, east, depth + 1),
      ]);
      return quads.flat();
    }

    if (!response.ok) {
      throw new Error(`OSM API 0.6 returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as { elements?: RawOverpassElement[] };
    return data.elements ?? [];
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// 1. Live OpenStreetMap Vector Proxy for Tagum City bounding boxes
app.get('/api/geo/osm', async (req, res) => {
  const south = parseFloat(String(req.query.south));
  const west = parseFloat(String(req.query.west));
  const north = parseFloat(String(req.query.north));
  const east = parseFloat(String(req.query.east));

  if (
    !Number.isFinite(south) ||
    !Number.isFinite(west) ||
    !Number.isFinite(north) ||
    !Number.isFinite(east) ||
    north <= south ||
    east <= west ||
    north - south > 0.05 ||
    east - west > 0.05
  ) {
    res.status(400).json({ error: 'Invalid or oversized Tagum bounding box' });
    return;
  }

  // Clamp queries strictly to Greater Tagum City region
  if (south < 7.30 || north > 7.60 || west < 125.65 || east > 125.95) {
    res.status(400).json({ error: 'Bounding box outside Tagum City region' });
    return;
  }

  const cacheKey = `${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}`;
  const cached = osmCache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.json(cached.payload);
    return;
  }

  let pending = inFlightOsm.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      let lastErr = 'OSM request failed';

      // Primary: Official OpenStreetMap 0.6 REST API (fast, ~1-2s per 1 km x 1 km tile)
      try {
        const elements = await fetchOsm06BBox(south, west, north, east);
        const parsed = parseOverpassJson(elements);
        const payload = {
          bbox: { south, west, north, east },
          source: 'https://api.openstreetmap.org/api/0.6/map.json',
          fetchedAt: new Date().toISOString(),
          ...parsed,
        };
        if (osmCache.size >= MAX_OSM_CACHE) {
          const firstKey = osmCache.keys().next().value;
          if (firstKey) osmCache.delete(firstKey);
        }
        osmCache.set(cacheKey, { payload, timestamp: Date.now() });
        return payload;
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
      }

      // Secondary fallback: Overpass mirrors
      const query = `[out:json][timeout:14];
(
  way["building"](${south},${west},${north},${east});
  way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential|trunk_link|primary_link)$"](${south},${west},${north},${east});
  way["waterway"~"^(river|stream|canal)$"](${south},${west},${north},${east});
  way["natural"="water"](${south},${west},${north},${east});
);
out body;
>;
out skel qt;`;

      for (const endpoint of OVERPASS_ENDPOINTS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'User-Agent': 'TagumCity3DWorkbench/1.0 (+https://tagum3d.local)',
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!response.ok) {
            lastErr = `${endpoint} returned HTTP ${response.status}`;
            continue;
          }

          const data = (await response.json()) as { elements?: RawOverpassElement[] };
          const parsed = parseOverpassJson(data.elements ?? []);
          const payload = {
            bbox: { south, west, north, east },
            source: endpoint,
            fetchedAt: new Date().toISOString(),
            ...parsed,
          };

          if (osmCache.size >= MAX_OSM_CACHE) {
            const firstKey = osmCache.keys().next().value;
            if (firstKey) osmCache.delete(firstKey);
          }
          osmCache.set(cacheKey, { payload, timestamp: Date.now() });
          return payload;
        } catch (err) {
          clearTimeout(timer);
          lastErr = err instanceof Error ? err.message : String(err);
        }
      }

      throw new Error(`Failed to fetch live OSM data (${lastErr})`);
    })();

    inFlightOsm.set(cacheKey, pending);
    pending.finally(() => {
      inFlightOsm.delete(cacheKey);
    });
  }

  try {
    const payload = await pending;
    res.setHeader('X-Cache', 'MISS');
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to fetch live OSM data' });
  }
});

// 2. Real Satellite Imagery, Street Map & AWS Terrarium Elevation DEM Tile Proxy (CORS-safe)
app.get('/api/geo/tile/:source/:z/:x/:y', async (req, res) => {
  const { source } = req.params;
  const z = parseInt(req.params.z, 10);
  const x = parseInt(req.params.x, 10);
  const y = parseInt(req.params.y, 10);

  if (
    !['satellite', 'osm', 'elevation'].includes(source) ||
    !Number.isInteger(z) ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    z < 10 ||
    z > 18
  ) {
    res.status(400).send('Invalid tile parameters');
    return;
  }

  const cacheKey = `${source}/${z}/${x}/${y}`;
  const cached = tileCache.get(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(cached.buffer);
    return;
  }

  let upstreamUrl = '';
  if (source === 'satellite') {
    upstreamUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  } else if (source === 'osm') {
    upstreamUrl = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
  } else {
    upstreamUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'TagumCity3DWorkbench/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      res.status(upstream.status).send('Upstream tile unavailable');
      return;
    }

    const arrayBuf = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = upstream.headers.get('content-type') || 'image/png';

    if (tileCache.size >= MAX_TILE_CACHE) {
      const firstKey = tileCache.keys().next().value;
      if (firstKey) tileCache.delete(firstKey);
    }
    tileCache.set(cacheKey, { buffer, contentType });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    clearTimeout(timer);
    res.status(502).send(err instanceof Error ? err.message : 'Tile fetch error');
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tagum City 3D Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
