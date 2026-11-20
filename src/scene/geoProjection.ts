// Exact WGS84 <-> Local Metric Three.js Scene Projection for Tagum City, Davao del Norte
// Centered at 7.4450° N, 125.8120° E so the 4 x 4 km Magugpo Core covers:
//   - Freedom Park & Historical Center (7.4474° N, 125.8041° E) -> Tile B2
//   - Gaisano Mall of Tagum (7.4493° N, 125.8120° E)           -> Tile C2
//   - Christ the King Cathedral (7.4412° N, 125.7999° E)       -> Tile A3
//   - New Tagum City Hall Apokon (7.4408° N, 125.8265° E)      -> Tile D3
//   - Robinsons Place Tagum (7.4294° N, 125.7975° E)           -> Tile A4

export const TAGUM_ORIGIN_LAT = 7.4450;
export const TAGUM_ORIGIN_LON = 125.8120;

// Exact metric conversion factors at latitude 7.445° N
export const METERS_PER_DEG_LAT = 110590.0;
export const METERS_PER_DEG_LON = 111320.0 * Math.cos((TAGUM_ORIGIN_LAT * Math.PI) / 180); // ~110,382.2 m/deg

// Scene scale: 1.0 scene unit = 100 meters (so 1 km tile = 10.0 x 10.0 scene units)
export const SCENE_UNITS_PER_METER = 0.01;
export const METERS_PER_SCENE_UNIT = 100.0;

export const TILE_SIZE_UNITS = 10.0; // 1,000 m x 1,000 m
export const GRID_COUNT = 4; // 4 x 4 = 16 tiles
export const CORE_HALF_EXTENT = (TILE_SIZE_UNITS * GRID_COUNT) / 2; // 20 units = 2,000 m

export interface LatLonBBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/**
 * Convert real WGS84 (lat, lon) into local Three.js scene (x, z)
 * +X = East, -Z = North (+Z = South)
 */
export function latLonToScene(lat: number, lon: number): { x: number; z: number } {
  const x = (lon - TAGUM_ORIGIN_LON) * METERS_PER_DEG_LON * SCENE_UNITS_PER_METER;
  const z = -(lat - TAGUM_ORIGIN_LAT) * METERS_PER_DEG_LAT * SCENE_UNITS_PER_METER;
  return { x, z };
}

/**
 * Convert local Three.js scene (x, z) back into exact WGS84 (lat, lon)
 */
export function sceneToLatLon(x: number, z: number): { lat: number; lon: number } {
  const lon = TAGUM_ORIGIN_LON + (x * METERS_PER_SCENE_UNIT) / METERS_PER_DEG_LON;
  const lat = TAGUM_ORIGIN_LAT - (z * METERS_PER_SCENE_UNIT) / METERS_PER_DEG_LAT;
  return { lat, lon };
}

/**
 * World scene center (x, z) of tile (col 0..3 West->East, row 0..3 North->South)
 */
export function tileCenterScene(col: number, row: number): { x: number; z: number } {
  return {
    x: -CORE_HALF_EXTENT + TILE_SIZE_UNITS * (col + 0.5),
    z: -CORE_HALF_EXTENT + TILE_SIZE_UNITS * (row + 0.5),
  };
}

/**
 * Exact WGS84 bounding box for a 1 km x 1 km tile (col 0..3, row 0..3)
 */
export function getTileBBox(col: number, row: number): LatLonBBox {
  const { x: cx, z: cz } = tileCenterScene(col, row);
  const half = TILE_SIZE_UNITS / 2;
  const nw = sceneToLatLon(cx - half, cz - half);
  const se = sceneToLatLon(cx + half, cz + half);
  return {
    south: se.lat,
    west: nw.lon,
    north: nw.lat,
    east: se.lon,
  };
}

// Web Mercator slippy-map tile math (for Esri Satellite, Carto OSM, and AWS Terrarium DEM)
export function lonToTileFloat(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

export function latToTileFloat(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
}
