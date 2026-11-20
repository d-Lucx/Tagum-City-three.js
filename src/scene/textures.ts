import * as THREE from 'three';

export interface ProceduralTexturePack {
  plaBumpMap: THREE.CanvasTexture;
  facadeAlbedoMap: THREE.CanvasTexture;
  facadeRoughnessMap: THREE.CanvasTexture;
  terrainGridMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTexturePack(maxAnisotropy: number): ProceduralTexturePack {
  const anisotropy = Math.max(1, Math.min(maxAnisotropy, 16));

  // 1. Subtle 3D-Printed Matte PLA / Architectural Plaster micro-layer bump map (linear)
  const plaCanvas = document.createElement('canvas');
  plaCanvas.width = 256;
  plaCanvas.height = 256;
  const plaCtx = plaCanvas.getContext('2d')!;
  plaCtx.fillStyle = '#808080';
  plaCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    const shade = 118 + Math.round(Math.sin(y * 1.57) * 14 + ((y * 17) % 9) - 4);
    plaCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    plaCtx.fillRect(0, y, 256, 1);
  }
  const plaBumpMap = new THREE.CanvasTexture(plaCanvas);
  plaBumpMap.wrapS = THREE.RepeatWrapping;
  plaBumpMap.wrapT = THREE.RepeatWrapping;
  plaBumpMap.repeat.set(3, 3);
  plaBumpMap.anisotropy = anisotropy;

  // 2. Architectural building facade window grid (albedo in SRGBColorSpace)
  const facCanvas = document.createElement('canvas');
  facCanvas.width = 256;
  facCanvas.height = 256;
  const facCtx = facCanvas.getContext('2d')!;
  facCtx.fillStyle = '#e8e4dc';
  facCtx.fillRect(0, 0, 256, 256);

  // Subtle floor slab bands
  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    facCtx.fillStyle = '#d3cdc2';
    facCtx.fillRect(0, y, 256, 5);
    // Recessed glazed windows
    for (let col = 0; col < 8; col++) {
      const x = col * 32 + 5;
      facCtx.fillStyle = (row + col) % 5 === 0 ? '#5c7288' : '#435568';
      facCtx.fillRect(x, y + 9, 22, 18);
      // Top window mullion highlight
      facCtx.fillStyle = '#89a0b4';
      facCtx.fillRect(x, y + 9, 22, 2);
    }
  }
  const facadeAlbedoMap = new THREE.CanvasTexture(facCanvas);
  facadeAlbedoMap.colorSpace = THREE.SRGBColorSpace;
  facadeAlbedoMap.wrapS = THREE.RepeatWrapping;
  facadeAlbedoMap.wrapT = THREE.RepeatWrapping;
  facadeAlbedoMap.repeat.set(1, 1);
  facadeAlbedoMap.anisotropy = anisotropy;

  // 3. Facade roughness map (linear: smooth glass = dark 0.15, matte concrete = bright 0.85)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#dadada';
  rCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    for (let col = 0; col < 8; col++) {
      const x = col * 32 + 5;
      rCtx.fillStyle = '#2e2e2e';
      rCtx.fillRect(x, y + 9, 22, 18);
    }
  }
  const facadeRoughnessMap = new THREE.CanvasTexture(roughCanvas);
  facadeRoughnessMap.wrapS = THREE.RepeatWrapping;
  facadeRoughnessMap.wrapT = THREE.RepeatWrapping;
  facadeRoughnessMap.anisotropy = anisotropy;

  // 4. Subtle topographic & metric grid overlay texture (SRGBColorSpace)
  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = 512;
  gridCanvas.height = 512;
  const gCtx = gridCanvas.getContext('2d')!;
  gCtx.fillStyle = '#ffffff';
  gCtx.fillRect(0, 0, 512, 512);
  gCtx.strokeStyle = 'rgba(30, 42, 54, 0.09)';
  gCtx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 64) {
    gCtx.beginPath();
    gCtx.moveTo(i, 0);
    gCtx.lineTo(i, 512);
    gCtx.stroke();
    gCtx.beginPath();
    gCtx.moveTo(0, i);
    gCtx.lineTo(512, i);
    gCtx.stroke();
  }
  // Crisp tile border line
  gCtx.strokeStyle = 'rgba(20, 28, 38, 0.22)';
  gCtx.lineWidth = 4;
  gCtx.strokeRect(2, 2, 508, 508);

  const terrainGridMap = new THREE.CanvasTexture(gridCanvas);
  terrainGridMap.colorSpace = THREE.SRGBColorSpace;
  terrainGridMap.anisotropy = anisotropy;

  // 5. Soft radial contact shadow texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(6, 10, 16, 0.65)');
  grad.addColorStop(0.55, 'rgba(6, 10, 16, 0.26)');
  grad.addColorStop(1, 'rgba(6, 10, 16, 0.0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 256, 256);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  return {
    plaBumpMap,
    facadeAlbedoMap,
    facadeRoughnessMap,
    terrainGridMap,
    contactShadowMap,
    dispose: () => {
      plaBumpMap.dispose();
      facadeAlbedoMap.dispose();
      facadeRoughnessMap.dispose();
      terrainGridMap.dispose();
      contactShadowMap.dispose();
    },
  };
}
