import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { PrintScaleSpec } from '../data/tagumData';
import { TILE_SIZE_UNITS } from './terrainMath';
import { BuiltTileEntry } from './tileBuilder';

export interface StlExportResult {
  filename: string;
  byteSize: number;
  triangleCount: number;
  realOsmIncluded: boolean;
}

/**
 * Exports any BuiltTileEntry (or the full 4x4 core) — including its REAL DEM terrain mesh,
 * watertight 4 mm interlocking base skirt, and REAL extruded OpenStreetMap building footprints —
 * as a Z-up millimeter-scaled binary STL file ready for Bambu Studio, PrusaSlicer, or Cura.
 */
export function exportTilesToBinaryStl(
  tiles: BuiltTileEntry[],
  scaleSpec: PrintScaleSpec,
  exportLabel: string,
): StlExportResult {
  const exportRoot = new THREE.Group();
  const mmPerUnit = 100000 / scaleSpec.ratio; // At 1:5,000 -> 10 units (1 km) = 200 mm!
  const isSingleTile = tiles.length === 1;
  const dummyMat = new THREE.MeshBasicMaterial();

  let realOsmIncluded = false;

  const cloneHierarchy = (src: THREE.Object3D, dest: THREE.Object3D) => {
    src.children.forEach((child) => {
      if (!child.visible || child.userData.skipStl) return;

      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const cloned = new THREE.Mesh(mesh.geometry, dummyMat);
        cloned.position.copy(mesh.position);
        cloned.rotation.copy(mesh.rotation);
        cloned.scale.copy(mesh.scale);
        dest.add(cloned);
        if (mesh.children.length > 0) {
          cloneHierarchy(mesh, cloned);
        }
      } else {
        const grp = new THREE.Group();
        grp.position.copy(child.position);
        grp.rotation.copy(child.rotation);
        grp.scale.copy(child.scale);
        dest.add(grp);
        cloneHierarchy(child, grp);
      }
    });
  };

  for (const tile of tiles) {
    if (tile.osmLoaded) realOsmIncluded = true;
    const tileClone = new THREE.Group();
    if (!isSingleTile) {
      tileClone.position.set(tile.baseX, 0, tile.baseZ);
    }
    cloneHierarchy(tile.group, tileClone);
    exportRoot.add(tileClone);
  }

  // Convert Y-up Three.js scene to Z-up 3D printer convention & millimeter scale
  exportRoot.scale.setScalar(mmPerUnit);
  exportRoot.rotation.x = Math.PI / 2;
  exportRoot.updateMatrixWorld(true);

  const exporter = new STLExporter();
  const dataView = exporter.parse(exportRoot, { binary: true }) as DataView;

  const triangleCount = dataView.getUint32(80, true);
  const byteSize = dataView.byteLength;
  const tilePrintMm = Math.round(TILE_SIZE_UNITS * mmPerUnit);
  const osmTag = realOsmIncluded ? 'real_osm' : 'dem_terrain';
  const filename = `tagum_${exportLabel}_${osmTag}_1to${scaleSpec.ratio}_${tilePrintMm}mm.stl`;

  const blob = new Blob([dataView.buffer as ArrayBuffer], {
    type: 'application/octet-stream',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);

  dummyMat.dispose();

  return { filename, byteSize, triangleCount, realOsmIncluded };
}
