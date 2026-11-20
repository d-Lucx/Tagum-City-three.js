import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  DroneTargetId,
  DRONE_TARGETS,
  getTileInfoByGrid,
  MaterialMode,
  TagumTileInfo,
  VERIFIED_LANDMARKS,
} from '../data/tagumData';
import { latLonToScene, SCENE_UNITS_PER_METER } from './geoProjection';
import {
  buildChristTheKingCathedral,
  buildFreedomParkComplex,
  buildGaisanoCommercialHub,
  buildTagumCityHall,
} from './landmarks';
import { TagumMaterialSet } from './materials';
import { RealOsmBuilding, TileOsmPayload } from './realGeoLoader';
import {
  CORE_HALF_EXTENT,
  getRealElevationMetersAtScene,
  getTagumElevation,
  GRID_COUNT,
  TILE_BASE_BOTTOM_Y,
  TILE_SIZE_UNITS,
  tileCenterWorld,
  WATER_LEVEL_Y,
} from './terrainMath';

export interface BuiltTileEntry {
  info: TagumTileInfo;
  group: THREE.Group;
  baseX: number;
  baseZ: number;
  terrainMesh: THREE.Mesh;
  terrainMaterial: THREE.MeshStandardMaterial;
  skirtMesh: THREE.Mesh;
  osmGroup: THREE.Group;
  osmRegularMesh: THREE.Mesh | null;
  osmNamedMesh: THREE.Mesh | null;
  osmLoaded: boolean;
  osmPayload: TileOsmPayload | null;
  landmarkGroup: THREE.Group | null;
  landmarkWorldPos: { x: number; z: number } | null;
  selectionFrame: THREE.Group;
  hitboxMesh: THREE.Mesh;
  satTexture: THREE.CanvasTexture | null;
  mapTexture: THREE.CanvasTexture | null;
}

export interface TagumCityRig {
  tiles: BuiltTileEntry[];
  tilesRoot: THREE.Group;
  horizonMesh: THREE.Mesh;
  horizonWater: THREE.Mesh;
  updateVisualMode: (mode: MaterialMode) => void;
  updateVerticalBoost: (boost: number) => void;
  setShowHeroLandmarks: (show: boolean) => void;
  applyRealElevationToAllTiles: () => void;
  applyBasemapTextures: (
    satMap: Map<string, THREE.CanvasTexture> | null,
    osmMap: Map<string, THREE.CanvasTexture> | null,
    currentMode: MaterialMode,
  ) => void;
  applyRealOsmToTile: (
    tileId: string,
    payload: TileOsmPayload,
    verticalBoost: number,
  ) => void;
  dispose: () => void;
}

function sampleTerrainColor(
  elevMeters: number,
  mode: MaterialMode,
  outColor: THREE.Color,
): void {
  if (mode === 'satelliteOsm' || mode === 'streetMapOsm') {
    // Pure white vertex color so draped real Satellite / Street Map CanvasTexture renders true-to-color
    outColor.set('#ffffff');
  } else if (mode === 'architecturalPla') {
    if (elevMeters < 10) {
      outColor.set('#c4ccd4');
    } else if (elevMeters < 35) {
      outColor.set('#d4dae0');
    } else {
      outColor.set('#c6ced6');
    }
  } else {
    // LiDAR / Real AWS Terrarium DEM Hypsometric Elevation Ramp (0 m .. 110 m+)
    const t = THREE.MathUtils.clamp(elevMeters / 95, 0, 1);
    if (elevMeters <= 3) {
      outColor.set('#0c4a6e');
    } else if (t < 0.25) {
      outColor.set('#0f766e').lerp(new THREE.Color('#10b981'), t / 0.25);
    } else if (t < 0.6) {
      outColor.set('#10b981').lerp(new THREE.Color('#eab308'), (t - 0.25) / 0.35);
    } else {
      outColor.set('#eab308').lerp(new THREE.Color('#ea580c'), (t - 0.6) / 0.4);
    }
  }
}

const TERRAIN_SEGS = 24;

function buildSkirtGeometry(centerX: number, centerZ: number): THREE.BufferGeometry {
  const half = TILE_SIZE_UNITS / 2;
  const botY = TILE_BASE_BOTTOM_Y;
  const step = TILE_SIZE_UNITS / TERRAIN_SEGS;
  const verts: number[] = [];

  const pushQuad = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    dx: number,
    dy: number,
    dz: number,
  ) => {
    verts.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    verts.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
  };

  for (let i = 0; i < TERRAIN_SEGS; i++) {
    const x0 = -half + i * step;
    const x1 = x0 + step;
    pushQuad(
      x0,
      getTagumElevation(centerX + x0, centerZ - half),
      -half,
      x1,
      getTagumElevation(centerX + x1, centerZ - half),
      -half,
      x1,
      botY,
      -half,
      x0,
      botY,
      -half,
    );
  }
  for (let i = 0; i < TERRAIN_SEGS; i++) {
    const x0 = half - i * step;
    const x1 = x0 - step;
    pushQuad(
      x0,
      getTagumElevation(centerX + x0, centerZ + half),
      half,
      x1,
      getTagumElevation(centerX + x1, centerZ + half),
      half,
      x1,
      botY,
      half,
      x0,
      botY,
      half,
    );
  }
  for (let i = 0; i < TERRAIN_SEGS; i++) {
    const z0 = -half + i * step;
    const z1 = z0 + step;
    pushQuad(
      half,
      getTagumElevation(centerX + half, centerZ + z0),
      z0,
      half,
      getTagumElevation(centerX + half, centerZ + z1),
      z1,
      half,
      botY,
      z1,
      half,
      botY,
      z0,
    );
  }
  for (let i = 0; i < TERRAIN_SEGS; i++) {
    const z0 = half - i * step;
    const z1 = z0 - step;
    pushQuad(
      -half,
      getTagumElevation(centerX - half, centerZ + z0),
      z0,
      -half,
      getTagumElevation(centerX - half, centerZ + z1),
      z1,
      -half,
      botY,
      z1,
      -half,
      botY,
      z0,
    );
  }
  pushQuad(-half, botY, -half, half, botY, -half, half, botY, half, -half, botY, half);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

function buildTileTerrainAndSkirt(
  centerX: number,
  centerZ: number,
  col: number,
  row: number,
  materials: TagumMaterialSet,
  gridFallbackMap: THREE.Texture,
): {
  topMesh: THREE.Mesh;
  topMaterial: THREE.MeshStandardMaterial;
  skirtMesh: THREE.Mesh;
} {
  const half = TILE_SIZE_UNITS / 2;
  const topGeo = new THREE.PlaneGeometry(TILE_SIZE_UNITS, TILE_SIZE_UNITS, TERRAIN_SEGS, TERRAIN_SEGS);
  topGeo.rotateX(-Math.PI / 2);

  const pos = topGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const wx = centerX + pos.getX(i);
    const wz = centerZ + pos.getZ(i);
    const elevY = getTagumElevation(wx, wz);
    pos.setY(i, elevY);

    sampleTerrainColor(getRealElevationMetersAtScene(wx, wz), 'satelliteOsm', tmpColor);
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
  topGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  topGeo.computeVertexNormals();

  // Per-tile cloned terrain material so each tile displays its own aligned Satellite / Street Map texture
  const topMaterial = materials.terrainBase.clone();
  topMaterial.map = gridFallbackMap;
  topMaterial.vertexColors = true;

  const topMesh = new THREE.Mesh(topGeo, topMaterial);
  topMesh.receiveShadow = true;
  topMesh.castShadow = false;

  const skirtGeo = buildSkirtGeometry(centerX, centerZ);
  const skirtMesh = new THREE.Mesh(skirtGeo, materials.terrainSkirt);
  skirtMesh.castShadow = true;
  skirtMesh.receiveShadow = true;

  // Chamfered 4 mm interlocking zipper tabs along interior tile edges
  const tabGeo = new THREE.BoxGeometry(0.32, 0.34, 0.72);
  if (col < GRID_COUNT - 1) {
    for (const tz of [-2.4, 2.4]) {
      const tab = new THREE.Mesh(tabGeo, materials.terrainSkirt);
      tab.position.set(half + 0.14, TILE_BASE_BOTTOM_Y + 0.32, tz);
      skirtMesh.add(tab);
    }
  }
  if (row < GRID_COUNT - 1) {
    for (const tx of [-2.4, 2.4]) {
      const tab = new THREE.Mesh(tabGeo, materials.terrainSkirt);
      tab.rotation.y = Math.PI / 2;
      tab.position.set(tx, TILE_BASE_BOTTOM_Y + 0.32, half + 0.14);
      skirtMesh.add(tab);
    }
  }

  return { topMesh, topMaterial, skirtMesh };
}

function buildSelectionFrame(
  centerX: number,
  centerZ: number,
  materials: TagumMaterialSet,
): THREE.Group {
  const frame = new THREE.Group();
  frame.visible = false;
  frame.userData.skipStl = true;
  updateSelectionFrameHeights(frame, centerX, centerZ, materials);
  return frame;
}

function updateSelectionFrameHeights(
  frame: THREE.Group,
  centerX: number,
  centerZ: number,
  materials: TagumMaterialSet,
) {
  while (frame.children.length > 0) {
    const ch = frame.children[0] as THREE.Mesh;
    ch.geometry.dispose();
    frame.remove(ch);
  }
  const half = TILE_SIZE_UNITS / 2 - 0.06;
  const barThickness = 0.11;
  const segments = 12;

  const buildEdge = (isHorizontal: boolean, fixedCoord: number) => {
    for (let i = 0; i < segments; i++) {
      const t0 = -half + (i / segments) * (half * 2);
      const t1 = -half + ((i + 1) / segments) * (half * 2);
      const mid = (t0 + t1) / 2;
      const len = Math.abs(t1 - t0) + 0.02;
      const lx = isHorizontal ? mid : fixedCoord;
      const lz = isHorizontal ? fixedCoord : mid;
      const y = getTagumElevation(centerX + lx, centerZ + lz) + 0.08;

      const geo = isHorizontal
        ? new THREE.BoxGeometry(len, 0.07, barThickness)
        : new THREE.BoxGeometry(barThickness, 0.07, len);
      const mesh = new THREE.Mesh(geo, materials.selectionFrame);
      mesh.position.set(lx, y, lz);
      frame.add(mesh);
    }
  };

  buildEdge(true, -half);
  buildEdge(true, half);
  buildEdge(false, -half);
  buildEdge(false, half);
}

/**
 * Extrudes real OpenStreetMap building polygons (exact WGS84 footprints!) into batched
 * BufferGeometries with zero-allocation verticalBoost height adjustment support!
 */
function buildRealOsmBuildingsMeshes(
  tile: BuiltTileEntry,
  buildings: RealOsmBuilding[],
  materials: TagumMaterialSet,
  verticalBoost: number,
): { regularMesh: THREE.Mesh | null; namedMesh: THREE.Mesh | null } {
  const regularGeos: THREE.BufferGeometry[] = [];
  const namedGeos: THREE.BufferGeometry[] = [];
  const half = TILE_SIZE_UNITS / 2;

  for (const b of buildings) {
    if (!b.polygon || b.polygon.length < 4) continue;

    // Assign building strictly to the tile owning its WGS84 centroid (prevents duplicates across tile edges)
    const cScene = latLonToScene(b.centroid[0], b.centroid[1]);
    const clx = cScene.x - tile.baseX;
    const clz = cScene.z - tile.baseZ;
    if (Math.abs(clx) > half || Math.abs(clz) > half) continue;

    const pts2d: THREE.Vector2[] = [];
    for (let i = 0; i < b.polygon.length - 1; i++) {
      const pScene = latLonToScene(b.polygon[i][0], b.polygon[i][1]);
      // Clamp footprint gently to tile boundary so exploding tiles cleanly separates neighboring structures
      const lx = THREE.MathUtils.clamp(pScene.x - tile.baseX, -half + 0.04, half - 0.04);
      const lz = THREE.MathUtils.clamp(pScene.z - tile.baseZ, -half + 0.04, half - 0.04);
      // Shape point (lx, -lz) rotated -90 deg around X maps cleanly to 3D (lx, +h, +lz)
      const pt = new THREE.Vector2(lx, -lz);
      if (pts2d.length === 0 || pts2d[pts2d.length - 1].distanceToSquared(pt) > 0.00008) {
        pts2d.push(pt);
      }
    }
    if (pts2d.length < 3) continue;

    // Compute signed area to filter degenerate sliver polygons
    let area2 = 0;
    for (let i = 0; i < pts2d.length; i++) {
      const a = pts2d[i];
      const c = pts2d[(i + 1) % pts2d.length];
      area2 += a.x * c.y - c.x * a.y;
    }
    if (Math.abs(area2) < 0.0004) continue;

    try {
      const shape = new THREE.Shape(pts2d);
      const baseElevY = getTagumElevation(cScene.x, cScene.z);
      const embedDepth = 0.08; // Embed slightly below sloped ground so buildings never float
      // Real metric height -> scene units (100 m = 1 unit, multiplied gently so real 1-story buildings stay crisp)
      const rawSceneH = Math.max(0.05, b.heightM * SCENE_UNITS_PER_METER * 1.45);
      const extrudedH = rawSceneH * verticalBoost;

      const extGeo = new THREE.ExtrudeGeometry(shape, {
        depth: extrudedH + embedDepth,
        bevelEnabled: false,
        curveSegments: 1,
      });
      extGeo.rotateX(-Math.PI / 2);
      extGeo.translate(0, baseElevY - embedDepth, 0);

      // Convert to clean non-indexed geometry & tag per-vertex baseY / rawRoofDelta for fast live boost scaling
      const cleanGeo = extGeo.index ? extGeo.toNonIndexed() : extGeo;
      if (cleanGeo !== extGeo) extGeo.dispose();

      // Remove UV attribute if mismatched so mergeGeometries never fails
      cleanGeo.deleteAttribute('uv');
      const pAttr = cleanGeo.attributes.position as THREE.BufferAttribute;
      const baseYArr = new Float32Array(pAttr.count);
      const rawHArr = new Float32Array(pAttr.count);
      const topThreshold = baseElevY + extrudedH * 0.5;
      for (let i = 0; i < pAttr.count; i++) {
        const y = pAttr.getY(i);
        if (y > topThreshold) {
          baseYArr[i] = baseElevY;
          rawHArr[i] = rawSceneH;
        } else {
          baseYArr[i] = baseElevY - embedDepth;
          rawHArr[i] = 0;
        }
      }
      cleanGeo.setAttribute('aBaseY', new THREE.BufferAttribute(baseYArr, 1));
      cleanGeo.setAttribute('aRawH', new THREE.BufferAttribute(rawHArr, 1));
      cleanGeo.computeVertexNormals();

      if (b.name || b.levels >= 3) {
        namedGeos.push(cleanGeo);
      } else {
        regularGeos.push(cleanGeo);
      }
    } catch {
      // Skip invalid self-intersecting OSM ways gracefully
    }
  }

  let regularMesh: THREE.Mesh | null = null;
  if (regularGeos.length > 0) {
    const merged = mergeGeometries(regularGeos, false);
    regularGeos.forEach((g) => g.dispose());
    if (merged) {
      regularMesh = new THREE.Mesh(merged, materials.osmBuilding);
      regularMesh.castShadow = true;
      regularMesh.receiveShadow = true;
    }
  }

  let namedMesh: THREE.Mesh | null = null;
  if (namedGeos.length > 0) {
    const merged = mergeGeometries(namedGeos, false);
    namedGeos.forEach((g) => g.dispose());
    if (merged) {
      namedMesh = new THREE.Mesh(merged, materials.osmBuildingNamed);
      namedMesh.castShadow = true;
      namedMesh.receiveShadow = true;
    }
  }

  return { regularMesh, namedMesh };
}

/**
 * Builds crisp 3D road & waterway ribbons from real OpenStreetMap polyline nodes
 */
function buildRealOsmVectorsGroup(
  tile: BuiltTileEntry,
  payload: TileOsmPayload,
  materials: TagumMaterialSet,
): THREE.Group {
  const vecGroup = new THREE.Group();
  const half = TILE_SIZE_UNITS / 2;

  const primaryVerts: number[] = [];
  const secondaryVerts: number[] = [];
  const waterVerts: number[] = [];

  const appendRibbon = (
    targetVerts: number[],
    pts: Array<[number, number]>,
    widthScene: number,
    yLift: number,
  ) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = latLonToScene(pts[i][0], pts[i][1]);
      const b = latLonToScene(pts[i + 1][0], pts[i + 1][1]);
      const ax0 = a.x - tile.baseX;
      const az0 = a.z - tile.baseZ;
      const bx0 = b.x - tile.baseX;
      const bz0 = b.z - tile.baseZ;

      // Skip segments completely outside this tile
      if (
        (Math.abs(ax0) > half + 0.5 && Math.abs(bx0) > half + 0.5) ||
        (Math.abs(az0) > half + 0.5 && Math.abs(bz0) > half + 0.5)
      ) {
        continue;
      }

      const x0 = THREE.MathUtils.clamp(ax0, -half, half);
      const z0 = THREE.MathUtils.clamp(az0, -half, half);
      const x1 = THREE.MathUtils.clamp(bx0, -half, half);
      const z1 = THREE.MathUtils.clamp(bz0, -half, half);

      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      if (len < 0.004) continue;

      const nx = (-dz / len) * (widthScene * 0.5);
      const nz = (dx / len) * (widthScene * 0.5);

      const y0 = getTagumElevation(tile.baseX + x0, tile.baseZ + z0) + yLift;
      const y1 = getTagumElevation(tile.baseX + x1, tile.baseZ + z1) + yLift;

      const p1x = x0 + nx, p1z = z0 + nz;
      const p2x = x0 - nx, p2z = z0 - nz;
      const p3x = x1 - nx, p3z = z1 - nz;
      const p4x = x1 + nx, p4z = z1 + nz;

      targetVerts.push(p1x, y0, p1z, p2x, y0, p2z, p3x, y1, p3z);
      targetVerts.push(p1x, y0, p1z, p3x, y1, p3z, p4x, y1, p4z);
    }
  };

  for (const r of payload.roads) {
    const isMajor =
      r.highway === 'trunk' ||
      r.highway === 'primary' ||
      r.highway === 'secondary' ||
      r.highway === 'trunk_link' ||
      r.highway === 'primary_link';
    const wScene = Math.max(0.055, r.widthM * SCENE_UNITS_PER_METER * 1.4);
    appendRibbon(isMajor ? primaryVerts : secondaryVerts, r.points, wScene, isMajor ? 0.036 : 0.026);
  }

  for (const w of payload.waterways) {
    const wScene = Math.max(0.09, w.widthM * SCENE_UNITS_PER_METER * 1.3);
    appendRibbon(waterVerts, w.points, wScene, 0.022);
  }

  const pushMesh = (verts: number[], mat: THREE.Material, skipStl = false) => {
    if (verts.length === 0) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    if (skipStl) mesh.userData.skipStl = true;
    vecGroup.add(mesh);
  };

  pushMesh(primaryVerts, materials.roadPrimary, false);
  pushMesh(secondaryVerts, materials.roadSecondary, false);
  pushMesh(waterVerts, materials.water, true);

  return vecGroup;
}

function rescaleOsmBuildingGeometry(mesh: THREE.Mesh | null, verticalBoost: number) {
  if (!mesh) return;
  const geo = mesh.geometry;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const baseY = geo.attributes.aBaseY as THREE.BufferAttribute | undefined;
  const rawH = geo.attributes.aRawH as THREE.BufferAttribute | undefined;
  if (!pos || !baseY || !rawH) return;

  for (let i = 0; i < pos.count; i++) {
    const h = rawH.getX(i);
    if (h > 0) {
      pos.setY(i, baseY.getX(i) + h * verticalBoost);
    }
  }
  pos.needsUpdate = true;
}

export function buildTagumCityScene(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
  gridFallbackMap: THREE.Texture,
): TagumCityRig {
  const tilesRoot = new THREE.Group();
  tilesRoot.name = 'Tagum_16_Tile_Real_Geo_Grid';

  const tiles: BuiltTileEntry[] = [];

  for (let row = 0; row < GRID_COUNT; row++) {
    for (let col = 0; col < GRID_COUNT; col++) {
      const info = getTileInfoByGrid(col, row);
      const { x: cx, z: cz } = tileCenterWorld(col, row);

      const tileGroup = new THREE.Group();
      tileGroup.name = `Tile_${info.id}_${info.barangay.replace(/\s+/g, '_')}`;
      tileGroup.position.set(cx, 0, cz);
      tileGroup.userData.tileId = info.id;

      // 1. Watertight terrain mesh + 4 mm base skirt + zipper joints
      const { topMesh, topMaterial, skirtMesh } = buildTileTerrainAndSkirt(
        cx,
        cz,
        col,
        row,
        materials,
        gridFallbackMap,
      );
      tileGroup.add(topMesh);
      tileGroup.add(skirtMesh);

      // 2. Container for live OpenStreetMap extruded buildings + roads + waterways
      const osmGroup = new THREE.Group();
      osmGroup.name = `OSM_${info.id}`;
      tileGroup.add(osmGroup);

      // 3. Verified Real-GPS Composite Hero Landmarks (anchored at exact lat/lon!)
      let landmarkGroup: THREE.Group | null = null;
      let landmarkWorldPos: { x: number; z: number } | null = null;
      const lmInfo = VERIFIED_LANDMARKS.find((l) => l.tileId === info.id);
      if (lmInfo) {
        const wPos = latLonToScene(lmInfo.lat, lmInfo.lon);
        landmarkWorldPos = wPos;
        if (lmInfo.id === 'cityHall') {
          landmarkGroup = buildTagumCityHall(materials, shadowMap);
          landmarkGroup.scale.setScalar(0.46); // True architectural scale relative to 1 km = 10 units
        } else if (lmInfo.id === 'cathedral') {
          landmarkGroup = buildChristTheKingCathedral(materials, shadowMap);
          landmarkGroup.scale.setScalar(0.44);
        } else if (lmInfo.id === 'freedomPark') {
          landmarkGroup = buildFreedomParkComplex(materials, shadowMap);
          landmarkGroup.scale.setScalar(0.46);
        } else if (lmInfo.id === 'gaisanoMall' || lmInfo.id === 'robinsonsPlace') {
          landmarkGroup = buildGaisanoCommercialHub(materials, shadowMap);
          landmarkGroup.scale.setScalar(0.44);
        }
        if (landmarkGroup) {
          landmarkGroup.position.set(
            wPos.x - cx,
            getTagumElevation(wPos.x, wPos.z),
            wPos.z - cz,
          );
          tileGroup.add(landmarkGroup);
        }
      }

      // 4. Selection perimeter frame
      const selectionFrame = buildSelectionFrame(cx, cz, materials);
      tileGroup.add(selectionFrame);

      // 5. Simplified proxy collision box on Layer 1 for crisp raycasting
      const hitboxGeo = new THREE.BoxGeometry(TILE_SIZE_UNITS, 2.2, TILE_SIZE_UNITS);
      const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitboxMesh = new THREE.Mesh(hitboxGeo, hitboxMat);
      hitboxMesh.position.y = 0.2;
      hitboxMesh.layers.set(1);
      hitboxMesh.userData.tileId = info.id;
      hitboxMesh.userData.skipStl = true;
      tileGroup.add(hitboxMesh);

      tilesRoot.add(tileGroup);

      tiles.push({
        info,
        group: tileGroup,
        baseX: cx,
        baseZ: cz,
        terrainMesh: topMesh,
        terrainMaterial: topMaterial,
        skirtMesh,
        osmGroup,
        osmRegularMesh: null,
        osmNamedMesh: null,
        osmLoaded: false,
        osmPayload: null,
        landmarkGroup,
        landmarkWorldPos,
        selectionFrame,
        hitboxMesh,
        satTexture: null,
        mapTexture: null,
      });
    }
  }

  // Extended Surrounding Davao del Norte Horizon Terrain
  const horizonGeo = new THREE.PlaneGeometry(240, 240, 88, 88);
  horizonGeo.rotateX(-Math.PI / 2);
  const hPos = horizonGeo.attributes.position as THREE.BufferAttribute;
  const hColors = new Float32Array(hPos.count * 3);
  const horizonMesh = new THREE.Mesh(horizonGeo, materials.horizonTerrain);
  horizonMesh.receiveShadow = true;

  const updateHorizonGeometry = (mode: MaterialMode) => {
    const cTmp = new THREE.Color();
    for (let i = 0; i < hPos.count; i++) {
      const x = hPos.getX(i);
      const z = hPos.getZ(i);
      let elevY = getTagumElevation(x, z);
      const elevMeters = getRealElevationMetersAtScene(x, z);

      const maxAxis = Math.max(Math.abs(x), Math.abs(z));
      if (maxAxis < CORE_HALF_EXTENT - 0.3) {
        elevY = TILE_BASE_BOTTOM_Y - 0.12;
      } else if (maxAxis < CORE_HALF_EXTENT + 1.4) {
        const blend = (maxAxis - (CORE_HALF_EXTENT - 0.3)) / 1.7;
        elevY = THREE.MathUtils.lerp(TILE_BASE_BOTTOM_Y - 0.12, elevY - 0.03, blend);
      }
      hPos.setY(i, elevY);

      if (mode === 'satelliteOsm') {
        // Subtle lush tropical lowland green-slate surrounding Davao del Norte horizon
        const t = THREE.MathUtils.clamp(elevMeters / 120, 0, 1);
        cTmp.set('#3e5440').lerp(new THREE.Color('#2c4031'), t);
      } else if (mode === 'streetMapOsm') {
        cTmp.set('#b9c6d1');
      } else {
        sampleTerrainColor(elevMeters, mode, cTmp);
      }
      hColors[i * 3] = cTmp.r;
      hColors[i * 3 + 1] = cTmp.g;
      hColors[i * 3 + 2] = cTmp.b;
    }
    hPos.needsUpdate = true;
    horizonGeo.setAttribute('color', new THREE.BufferAttribute(hColors, 3));
    horizonGeo.computeVertexNormals();
  };

  updateHorizonGeometry('satelliteOsm');

  const seaGeo = new THREE.PlaneGeometry(240, 240);
  seaGeo.rotateX(-Math.PI / 2);
  const horizonWater = new THREE.Mesh(seaGeo, materials.water);
  horizonWater.position.y = WATER_LEVEL_Y - 0.03;
  horizonWater.receiveShadow = true;

  let currentModeCache: MaterialMode = 'satelliteOsm';
  let currentBoostCache = 1.35;

  const updateVisualMode = (mode: MaterialMode) => {
    currentModeCache = mode;
    const colTmp = new THREE.Color();

    for (const tile of tiles) {
      const geom = tile.terrainMesh.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      const colAttr = geom.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const wx = tile.baseX + posAttr.getX(i);
        const wz = tile.baseZ + posAttr.getZ(i);
        sampleTerrainColor(getRealElevationMetersAtScene(wx, wz), mode, colTmp);
        colAttr.setXYZ(i, colTmp.r, colTmp.g, colTmp.b);
      }
      colAttr.needsUpdate = true;

      if (mode === 'satelliteOsm') {
        tile.terrainMaterial.map = tile.satTexture ?? gridFallbackMap;
        tile.terrainMaterial.roughness = 0.92;
      } else if (mode === 'streetMapOsm') {
        tile.terrainMaterial.map = tile.mapTexture ?? gridFallbackMap;
        tile.terrainMaterial.roughness = 0.88;
      } else if (mode === 'architecturalPla') {
        tile.terrainMaterial.map = gridFallbackMap;
        tile.terrainMaterial.roughness = 0.88;
      } else {
        tile.terrainMaterial.map = gridFallbackMap;
        tile.terrainMaterial.roughness = 0.82;
      }
      tile.terrainMaterial.needsUpdate = true;
    }

    updateHorizonGeometry(mode);
  };

  const applyRealElevationToAllTiles = () => {
    for (const tile of tiles) {
      const posAttr = tile.terrainMesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const wx = tile.baseX + posAttr.getX(i);
        const wz = tile.baseZ + posAttr.getZ(i);
        posAttr.setY(i, getTagumElevation(wx, wz));
      }
      posAttr.needsUpdate = true;
      tile.terrainMesh.geometry.computeVertexNormals();

      // Update skirt perimeter vertices to seal seamlessly against real DEM elevation
      const newSkirtGeo = buildSkirtGeometry(tile.baseX, tile.baseZ);
      tile.skirtMesh.geometry.dispose();
      tile.skirtMesh.geometry = newSkirtGeo;

      // Ground hero landmark cleanly onto the real DEM elevation
      if (tile.landmarkGroup && tile.landmarkWorldPos) {
        tile.landmarkGroup.position.y = getTagumElevation(
          tile.landmarkWorldPos.x,
          tile.landmarkWorldPos.z,
        );
      }

      // Refresh selection border heights
      updateSelectionFrameHeights(tile.selectionFrame, tile.baseX, tile.baseZ, materials);

      // If this tile already had OSM loaded before DEM finished, re-seat its OSM buildings/roads onto real DEM
      if (tile.osmPayload) {
        applyRealOsmToTile(tile.info.id, tile.osmPayload, currentBoostCache);
      }
    }
    updateVisualMode(currentModeCache);
  };

  const applyBasemapTextures = (
    satMap: Map<string, THREE.CanvasTexture> | null,
    osmMap: Map<string, THREE.CanvasTexture> | null,
    mode: MaterialMode,
  ) => {
    for (const tile of tiles) {
      if (satMap) {
        tile.satTexture?.dispose();
        tile.satTexture = satMap.get(tile.info.id) ?? null;
      }
      if (osmMap) {
        tile.mapTexture?.dispose();
        tile.mapTexture = osmMap.get(tile.info.id) ?? null;
      }
    }
    updateVisualMode(mode);
  };

  const applyRealOsmToTile = (
    tileId: string,
    payload: TileOsmPayload,
    verticalBoost: number,
  ) => {
    const tile = tiles.find((t) => t.info.id === tileId);
    if (!tile) return;

    // Dispose any previous OSM geometry on this tile
    while (tile.osmGroup.children.length > 0) {
      const ch = tile.osmGroup.children[0];
      ch.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry.dispose();
        }
      });
      tile.osmGroup.remove(ch);
    }

    const { regularMesh, namedMesh } = buildRealOsmBuildingsMeshes(
      tile,
      payload.buildings,
      materials,
      verticalBoost,
    );
    if (regularMesh) tile.osmGroup.add(regularMesh);
    if (namedMesh) tile.osmGroup.add(namedMesh);

    const vectors = buildRealOsmVectorsGroup(tile, payload, materials);
    tile.osmGroup.add(vectors);

    tile.osmRegularMesh = regularMesh;
    tile.osmNamedMesh = namedMesh;
    tile.osmLoaded = true;
    tile.osmPayload = payload;
  };

  const updateVerticalBoost = (boost: number) => {
    currentBoostCache = boost;
    for (const tile of tiles) {
      rescaleOsmBuildingGeometry(tile.osmRegularMesh, boost);
      rescaleOsmBuildingGeometry(tile.osmNamedMesh, boost);
      if (tile.landmarkGroup) {
        const baseScale = tile.info.id === 'A3' || tile.info.id === 'C2' || tile.info.id === 'A4' ? 0.44 : 0.46;
        tile.landmarkGroup.scale.set(baseScale, baseScale * (0.72 + boost * 0.28), baseScale);
      }
    }
  };

  const setShowHeroLandmarks = (show: boolean) => {
    for (const tile of tiles) {
      if (tile.landmarkGroup) {
        tile.landmarkGroup.visible = show;
      }
    }
  };

  const dispose = () => {
    horizonGeo.dispose();
    seaGeo.dispose();
    for (const tile of tiles) {
      tile.satTexture?.dispose();
      tile.mapTexture?.dispose();
      tile.terrainMaterial.dispose();
    }
    tilesRoot.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).geometry.dispose();
      }
    });
  };

  return {
    tiles,
    tilesRoot,
    horizonMesh,
    horizonWater,
    updateVisualMode,
    updateVerticalBoost,
    setShowHeroLandmarks,
    applyRealElevationToAllTiles,
    applyBasemapTextures,
    applyRealOsmToTile,
    dispose,
  };
}

export function buildCrosshatchWaypoints(
  targetId: DroneTargetId,
  altitudeM: number,
): THREE.Vector3[] {
  const cfg = DRONE_TARGETS[targetId];
  const groundY = getTagumElevation(cfg.x, cfg.z);
  const flightY = groundY + 1.8 + (altitudeM - 60) * 0.036;
  const half = cfg.span / 2;
  const lines = 4;
  const step = cfg.span / (lines - 1);

  const waypoints: THREE.Vector3[] = [];
  for (let i = 0; i < lines; i++) {
    const z = cfg.z - half + i * step;
    if (i % 2 === 0) {
      waypoints.push(new THREE.Vector3(cfg.x - half, flightY, z));
      waypoints.push(new THREE.Vector3(cfg.x + half, flightY, z));
    } else {
      waypoints.push(new THREE.Vector3(cfg.x + half, flightY, z));
      waypoints.push(new THREE.Vector3(cfg.x - half, flightY, z));
    }
  }
  for (let i = 0; i < lines; i++) {
    const x = cfg.x - half + i * step;
    if (i % 2 === 0) {
      waypoints.push(new THREE.Vector3(x, flightY + 0.1, cfg.z + half));
      waypoints.push(new THREE.Vector3(x, flightY + 0.1, cfg.z - half));
    } else {
      waypoints.push(new THREE.Vector3(x, flightY + 0.1, cfg.z - half));
      waypoints.push(new THREE.Vector3(x, flightY + 0.1, cfg.z + half));
    }
  }
  waypoints.push(waypoints[0].clone());
  return waypoints;
}
