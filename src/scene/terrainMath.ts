import {
  CORE_HALF_EXTENT,
  GRID_COUNT,
  sceneToLatLon,
  TILE_SIZE_UNITS,
  tileCenterScene,
} from './geoProjection';
import { RealElevationSampler } from './realGeoLoader';

export { CORE_HALF_EXTENT, GRID_COUNT, TILE_SIZE_UNITS };
export const tileCenterWorld = tileCenterScene;

export const WATER_LEVEL_Y = 0.05;
export const TILE_BASE_BOTTOM_Y = -0.95;

// Vertical scale converting real meters ASL into Three.js scene Y units
// 1 scene unit horizontally = 100 m; using 0.018 vertically gives ~1.8x topographic relief clarity
export const ELEVATION_METERS_TO_SCENE_Y = 0.018;

let activeRealDem: RealElevationSampler | null = null;

export function setActiveRealDem(sampler: RealElevationSampler | null): void {
  activeRealDem = sampler;
}

export function hasRealDem(): boolean {
  return activeRealDem !== null;
}

export function getRealElevationMetersAtScene(x: number, z: number): number {
  if (activeRealDem) {
    const { lat, lon } = sceneToLatLon(x, z);
    return activeRealDem.sampleMeters(lat, lon);
  }
  // Gentle fallback topographic approximation while AWS Terrarium DEM tiles stream in (~200 ms)
  const neSlope = (x + 20) * 0.45 + (-z + 20) * 0.48;
  return Math.max(2, 12 + neSlope + Math.sin(x * 0.08) * Math.cos(z * 0.09) * 3.5);
}

/**
 * Returns scene Y elevation at world (x, z) — backed by live AWS Terrarium DEM once loaded!
 */
export function getTagumElevation(x: number, z: number): number {
  const meters = getRealElevationMetersAtScene(x, z);
  return Math.max(0.02, meters * ELEVATION_METERS_TO_SCENE_Y);
}
