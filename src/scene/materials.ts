import * as THREE from 'three';
import { MaterialMode } from '../data/tagumData';
import { ProceduralTexturePack } from './textures';

export interface TagumMaterialSet {
  terrainBase: THREE.MeshStandardMaterial;
  terrainSkirt: THREE.MeshStandardMaterial;
  horizonTerrain: THREE.MeshStandardMaterial;
  water: THREE.MeshPhysicalMaterial;
  roadPrimary: THREE.MeshStandardMaterial;
  roadSecondary: THREE.MeshStandardMaterial;
  osmBuilding: THREE.MeshStandardMaterial;
  osmBuildingNamed: THREE.MeshStandardMaterial;
  landmarkConcrete: THREE.MeshStandardMaterial;
  landmarkRoofAccent: THREE.MeshStandardMaterial;
  landmarkGlass: THREE.MeshPhysicalMaterial;
  landmarkGold: THREE.MeshPhysicalMaterial;
  landmarkSteel: THREE.MeshStandardMaterial;
  selectionFrame: THREE.MeshStandardMaterial;
  applyMode: (mode: MaterialMode) => void;
  dispose: () => void;
}

export function createTagumMaterials(
  textures: ProceduralTexturePack,
  isSoftwareGl: boolean,
): TagumMaterialSet {
  const terrainBase = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.02,
    map: textures.terrainGridMap,
    bumpMap: textures.plaBumpMap,
    bumpScale: 0.012,
  });

  const terrainSkirt = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#232b35'),
    roughness: 0.74,
    metalness: 0.08,
    bumpMap: textures.plaBumpMap,
    bumpScale: 0.02,
  });

  const horizonTerrain = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 1.0,
  });

  const water = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#21658a'),
    roughness: 0.16,
    metalness: 0.14,
    clearcoat: isSoftwareGl ? 0.2 : 0.85,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.88,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const roadPrimary = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2c3440'),
    roughness: 0.84,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const roadSecondary = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#475260'),
    roughness: 0.88,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  // Real OpenStreetMap extruded buildings (regular & named landmarks/commercial)
  const osmBuilding = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ece9e2'),
    roughness: 0.78,
    metalness: 0.05,
    bumpMap: textures.plaBumpMap,
    bumpScale: 0.012,
  });

  const osmBuildingNamed = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e6c9a2'),
    roughness: 0.62,
    metalness: 0.12,
  });

  // Hero composite architectural landmark materials
  const landmarkConcrete = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f4f1ea'),
    roughness: 0.84,
    metalness: 0.03,
    bumpMap: textures.plaBumpMap,
    bumpScale: 0.012,
  });

  const landmarkRoofAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#b85c38'),
    roughness: 0.48,
    metalness: 0.22,
  });

  const landmarkGlass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#5a8db3'),
    roughness: 0.12,
    metalness: 0.2,
    clearcoat: isSoftwareGl ? 0.3 : 1.0,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: isSoftwareGl ? 0.65 : 0.78,
  });

  const landmarkGold = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#dba844'),
    roughness: 0.2,
    metalness: 0.92,
    clearcoat: 0.4,
  });

  const landmarkSteel = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#919fad'),
    roughness: 0.32,
    metalness: 0.82,
  });

  const selectionFrame = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f59e0b'),
    emissive: new THREE.Color('#d97706'),
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.4,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

  const allMaterials: THREE.Material[] = [
    terrainBase,
    terrainSkirt,
    horizonTerrain,
    water,
    roadPrimary,
    roadSecondary,
    osmBuilding,
    osmBuildingNamed,
    landmarkConcrete,
    landmarkRoofAccent,
    landmarkGlass,
    landmarkGold,
    landmarkSteel,
    selectionFrame,
  ];

  const applyMode = (mode: MaterialMode) => {
    if (mode === 'satelliteOsm') {
      terrainBase.bumpScale = 0;
      terrainSkirt.color.set('#232b35');
      water.color.set('#1b5e85');
      roadPrimary.color.set('#28303b');
      roadSecondary.color.set('#46505e');
      osmBuilding.color.set('#f2efe8');
      osmBuilding.roughness = 0.76;
      osmBuildingNamed.color.set('#e8c89c');
      landmarkConcrete.color.set('#f5f2eb');
      landmarkRoofAccent.color.set('#b85535');
      landmarkGlass.color.set('#5c9cc4');
    } else if (mode === 'streetMapOsm') {
      terrainBase.bumpScale = 0;
      terrainSkirt.color.set('#2d3642');
      water.color.set('#3885b3');
      roadPrimary.color.set('#475569');
      roadSecondary.color.set('#64748b');
      osmBuilding.color.set('#f4f1ea');
      osmBuilding.roughness = 0.82;
      osmBuildingNamed.color.set('#e2b87c');
      landmarkConcrete.color.set('#f7f4ee');
      landmarkRoofAccent.color.set('#c4623c');
      landmarkGlass.color.set('#4c85a8');
    } else if (mode === 'architecturalPla') {
      terrainBase.bumpScale = 0.015;
      terrainSkirt.color.set('#202832');
      water.color.set('#1f435d');
      roadPrimary.color.set('#535d6a');
      roadSecondary.color.set('#687380');
      osmBuilding.color.set('#f5f2eb');
      osmBuilding.roughness = 0.86;
      osmBuildingNamed.color.set('#ebe3d5');
      landmarkConcrete.color.set('#f7f4ee');
      landmarkRoofAccent.color.set('#c4643c');
      landmarkGlass.color.set('#4c6e8a');
    } else {
      // LiDAR / Real DEM Hypsometric Analysis
      terrainBase.bumpScale = 0.006;
      terrainSkirt.color.set('#131b25');
      water.color.set('#0e3a5c');
      roadPrimary.color.set('#1e293b');
      roadSecondary.color.set('#334155');
      osmBuilding.color.set('#dce9f5');
      osmBuilding.roughness = 0.65;
      osmBuildingNamed.color.set('#fbbf24');
      landmarkConcrete.color.set('#e4effa');
      landmarkRoofAccent.color.set('#f59e0b');
      landmarkGlass.color.set('#38bdf8');
    }

    for (const mat of allMaterials) {
      mat.needsUpdate = true;
    }
  };

  return {
    terrainBase,
    terrainSkirt,
    horizonTerrain,
    water,
    roadPrimary,
    roadSecondary,
    osmBuilding,
    osmBuildingNamed,
    landmarkConcrete,
    landmarkRoofAccent,
    landmarkGlass,
    landmarkGold,
    landmarkSteel,
    selectionFrame,
    applyMode,
    dispose: () => {
      allMaterials.forEach((m) => m.dispose());
    },
  };
}
