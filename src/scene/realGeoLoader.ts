import * as THREE from 'three';
import {
  getTileBBox,
  LatLonBBox,
  latToTileFloat,
  lonToTileFloat,
} from './geoProjection';

export interface RealOsmBuilding {
  id: number;
  name?: string;
  buildingType: string;
  amenity?: string;
  levels: number;
  heightM: number;
  polygon: Array<[number, number]>; // [lat, lon]
  centroid: [number, number];
}

export interface RealOsmRoad {
  id: number;
  name?: string;
  highway: string;
  widthM: number;
  points: Array<[number, number]>;
}

export interface RealOsmWaterway {
  id: number;
  name?: string;
  kind: 'line' | 'polygon';
  widthM: number;
  points: Array<[number, number]>;
}

export interface TileOsmPayload {
  bbox: LatLonBBox;
  source: string;
  fetchedAt: string;
  buildings: RealOsmBuilding[];
  roads: RealOsmRoad[];
  waterways: RealOsmWaterway[];
  stats: {
    buildingCount: number;
    roadCount: number;
    waterwayCount: number;
    namedCount: number;
    namedSample: Array<{ id: number; name: string; type: string; heightM: number }>;
  };
}

export interface RealElevationSampler {
  sampleMeters: (lat: number, lon: number) => number;
  minElevM: number;
  maxElevM: number;
  sourceLabel: string;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load tile ${url}`));
    img.src = url;
  });
}

/**
 * Loads real AWS Mapzen Terrarium elevation DEM tiles (Copernicus/SRTM-derived)
 * at zoom 12 covering Greater Tagum City (~10 km radius around Magugpo).
 * Formula: elevation_m = (R * 256 + G + B / 256) - 32768
 */
export async function loadRealTagumDem(): Promise<RealElevationSampler> {
  const z = 12;
  const bbox: LatLonBBox = {
    south: 7.36,
    west: 125.73,
    north: 7.53,
    east: 125.90,
  };

  const minTx = Math.floor(lonToTileFloat(bbox.west, z));
  const maxTx = Math.floor(lonToTileFloat(bbox.east, z));
  const minTy = Math.floor(latToTileFloat(bbox.north, z));
  const maxTy = Math.floor(latToTileFloat(bbox.south, z));

  const cols = maxTx - minTx + 1;
  const rows = maxTy - minTy + 1;
  const tilePx = 256;

  const canvas = document.createElement('canvas');
  canvas.width = cols * tilePx;
  canvas.height = rows * tilePx;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const jobs: Array<Promise<void>> = [];
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const url = `/api/geo/tile/elevation/${z}/${tx}/${ty}`;
      jobs.push(
        loadImage(url).then((img) => {
          ctx.drawImage(img, (tx - minTx) * tilePx, (ty - minTy) * tilePx, tilePx, tilePx);
        }),
      );
    }
  }
  await Promise.all(jobs);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  const decodePixel = (px: number, py: number): number => {
    const cx = Math.max(0, Math.min(w - 1, px));
    const cy = Math.max(0, Math.min(h - 1, py));
    const idx = (cy * w + cx) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const elev = r * 256 + g + b / 256 - 32768;
    return Number.isFinite(elev) ? Math.max(-5, Math.min(1400, elev)) : 20;
  };

  const sampleMeters = (lat: number, lon: number): number => {
    const fx = (lonToTileFloat(lon, z) - minTx) * tilePx;
    const fy = (latToTileFloat(lat, z) - minTy) * tilePx;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const dx = fx - x0;
    const dy = fy - y0;

    const v00 = decodePixel(x0, y0);
    const v10 = decodePixel(x0 + 1, y0);
    const v01 = decodePixel(x0, y0 + 1);
    const v11 = decodePixel(x0 + 1, y0 + 1);

    const top = v00 * (1 - dx) + v10 * dx;
    const bot = v01 * (1 - dx) + v11 * dx;
    return top * (1 - dy) + bot * dy;
  };

  // Probe min/max across core Tagum
  let minElevM = Infinity;
  let maxElevM = -Infinity;
  for (let lat = 7.425; lat <= 7.465; lat += 0.004) {
    for (let lon = 125.792; lon <= 125.832; lon += 0.004) {
      const e = sampleMeters(lat, lon);
      if (e < minElevM) minElevM = e;
      if (e > maxElevM) maxElevM = e;
    }
  }

  return {
    sampleMeters,
    minElevM: Number.isFinite(minElevM) ? Math.round(minElevM) : 0,
    maxElevM: Number.isFinite(maxElevM) ? Math.round(maxElevM) : 85,
    sourceLabel: 'AWS Terrarium DEM (Zoom 12)',
  };
}

/**
 * Fetches & stitches real satellite imagery (Esri World Imagery) or Carto OSM street map
 * tiles across the entire 4 x 4 km Tagum core, then slices crisp per-tile CanvasTextures
 * aligned accurately to each tile's exact WGS84 bounding box!
 */
export async function loadRealCoreBasemapTextures(
  source: 'satellite' | 'osm',
  maxAnisotropy: number,
): Promise<Map<string, THREE.CanvasTexture>> {
  const z = 15; // ~4.7 m/px crisp architectural resolution (~16-25 tiles total for 4x4 km!)
  const nwBbox = getTileBBox(0, 0);
  const seBbox = getTileBBox(3, 3);

  const minTx = Math.floor(lonToTileFloat(nwBbox.west, z));
  const maxTx = Math.floor(lonToTileFloat(seBbox.east, z));
  const minTy = Math.floor(latToTileFloat(nwBbox.north, z));
  const maxTy = Math.floor(latToTileFloat(seBbox.south, z));

  const tilePx = 256;
  const master = document.createElement('canvas');
  master.width = (maxTx - minTx + 1) * tilePx;
  master.height = (maxTy - minTy + 1) * tilePx;
  const mCtx = master.getContext('2d')!;
  mCtx.fillStyle = source === 'satellite' ? '#2c3d2d' : '#dce3e8';
  mCtx.fillRect(0, 0, master.width, master.height);

  // Load slippy tiles in parallel batches
  const jobs: Array<Promise<void>> = [];
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const url = `/api/geo/tile/${source}/${z}/${tx}/${ty}`;
      jobs.push(
        loadImage(url)
          .then((img) => {
            mCtx.drawImage(img, (tx - minTx) * tilePx, (ty - minTy) * tilePx, tilePx, tilePx);
          })
          .catch(() => {
            // Leave neutral fill if an individual tile fails
          }),
      );
    }
  }
  await Promise.all(jobs);

  const colLetters = ['A', 'B', 'C', 'D'];
  const result = new Map<string, THREE.CanvasTexture>();
  const aniso = Math.max(1, Math.min(maxAnisotropy, 16));

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const id = `${colLetters[col]}${row + 1}`;
      const b = getTileBBox(col, row);

      const sx = (lonToTileFloat(b.west, z) - minTx) * tilePx;
      const sy = (latToTileFloat(b.north, z) - minTy) * tilePx;
      const ex = (lonToTileFloat(b.east, z) - minTx) * tilePx;
      const ey = (latToTileFloat(b.south, z) - minTy) * tilePx;

      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = 512;
      tileCanvas.height = 512;
      const tCtx = tileCanvas.getContext('2d')!;
      tCtx.drawImage(master, sx, sy, ex - sx, ey - sy, 0, 0, 512, 512);

      // Add very subtle 1px border hairlines to delineate the 1 km spatial tile edge
      tCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      tCtx.lineWidth = 2;
      tCtx.strokeRect(1, 1, 510, 510);

      const tex = new THREE.CanvasTexture(tileCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = aniso;
      tex.needsUpdate = true;
      result.set(id, tex);
    }
  }

  return result;
}

/**
 * Fetches live OpenStreetMap building footprints, roads, and waterways for one 1 km x 1 km tile
 */
export async function fetchRealOsmForTile(col: number, row: number): Promise<TileOsmPayload> {
  const b = getTileBBox(col, row);
  const url = `/api/geo/osm?south=${b.south.toFixed(6)}&west=${b.west.toFixed(6)}&north=${b.north.toFixed(6)}&east=${b.east.toFixed(6)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `OSM request failed (${res.status})`);
  }
  return (await res.json()) as TileOsmPayload;
}
