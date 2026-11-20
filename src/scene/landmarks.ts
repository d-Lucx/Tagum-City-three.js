import * as THREE from 'three';
import { TagumMaterialSet } from './materials';

function enableShadows(group: THREE.Object3D) {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

function addContactShadow(
  group: THREE.Group,
  shadowMap: THREE.Texture,
  width: number,
  depth: number,
) {
  const geo = new THREE.PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.36,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.012;
  mesh.userData.skipStl = true;
  group.add(mesh);
}

/**
 * 1. New Tagum City Hall (Brgy. Apokon — 7.44080°N, 125.82648°E)
 * Photo-referenced to Architect Sol Flores' contemporary glass-and-steel civic capitol:
 * - Real footprint ~114 m x 81 m (1.14 x 0.81 scene units at 1 unit = 100 m)
 * - Symmetrical executive & legislative wings with greenish-blue glass curtain walls & silver steel frames
 * - Massive central open-air Atrium sheltered by a sweeping curved steel-truss canopy roof (NO classical dome!)
 * - Clean cantilevered metallic eaves, broad approach terrace, and Kublai Millan colorful cultural face sculptures
 */
export function buildTagumCityHall(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'New_Tagum_City_Hall';

  // Dedicated realistic architectural accent materials for City Hall
  const tealGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#3b7a8c'),
    roughness: 0.1,
    metalness: 0.25,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
  });
  const silverSteelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c8d0d8'),
    roughness: 0.28,
    metalness: 0.78,
  });
  const whiteCladMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f2f4f6'),
    roughness: 0.72,
    metalness: 0.08,
  });
  const kublaiAccentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d95f2a'),
    roughness: 0.55,
    metalness: 0.1,
  });

  // Model authored cleanly in normalized units (~1.14 wide x 0.82 deep scene units = exact 114 m x 82 m!)
  addContactShadow(group, shadowMap, 1.38, 1.04);

  // 1. Broad elevated granite civic podium & front grand steps
  const podium = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.09, 0.84), whiteCladMat);
  podium.position.set(0, -0.025, 0);
  group.add(podium);

  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(0.46 - i * 0.03, 0.018, 0.14 - i * 0.035),
      whiteCladMat,
    );
    step.position.set(0, 0.012 + i * 0.016, 0.44 - i * 0.025);
    group.add(step);
  }

  // 2. Twin Executive (West) & Legislative (East) 3-story glass-and-steel wings
  const wingW = 0.36;
  const wingH = 0.21;
  const wingD = 0.54;
  for (const side of [-1, 1]) {
    const wx = side * 0.37;

    // Glass curtain-wall core
    const glassCore = new THREE.Mesh(new THREE.BoxGeometry(wingW, wingH, wingD), tealGlassMat);
    glassCore.position.set(wx, 0.02 + wingH / 2, -0.03);
    group.add(glassCore);

    // Horizontal white/silver floor spandrel bands (3 stories + cantilevered roof fascia)
    for (let fl = 0; fl < 4; fl++) {
      const spandrel = new THREE.Mesh(
        new THREE.BoxGeometry(wingW + 0.026, 0.018, wingD + 0.026),
        fl === 3 ? silverSteelMat : whiteCladMat,
      );
      spandrel.position.set(wx, 0.035 + fl * 0.068, -0.03);
      group.add(spandrel);
    }

    // Fine vertical structural steel facade mullions
    const mullionGeo = new THREE.BoxGeometry(0.012, wingH + 0.01, 0.014);
    for (let m = -2; m <= 2; m++) {
      const fMul = new THREE.Mesh(mullionGeo, silverSteelMat);
      fMul.position.set(wx + m * 0.075, 0.02 + wingH / 2, -0.03 + wingD / 2 + 0.004);
      group.add(fMul);

      const bMul = new THREE.Mesh(mullionGeo, silverSteelMat);
      bMul.position.set(wx + m * 0.075, 0.02 + wingH / 2, -0.03 - wingD / 2 - 0.004);
      group.add(bMul);
    }

    // Sweeping angled cantilevered metallic roof slab over each wing
    const wingRoof = new THREE.Mesh(
      new THREE.BoxGeometry(wingW + 0.08, 0.022, wingD + 0.09),
      silverSteelMat,
    );
    wingRoof.position.set(wx, 0.252, -0.03);
    wingRoof.rotation.z = side * -0.06;
    group.add(wingRoof);
  }

  // 3. Central Open-Air Civic Atrium Glazed Connector & Mezzanine Bridges
  const atriumBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.24), tealGlassMat);
  atriumBack.position.set(0, 0.13, -0.18);
  group.add(atriumBack);

  // Open steel colonnade posts framing the central atrium entry
  const postGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.27, 10);
  for (const px of [-0.17, -0.06, 0.06, 0.17]) {
    const post = new THREE.Mesh(postGeo, silverSteelMat);
    post.position.set(px, 0.155, 0.24);
    group.add(post);
  }

  // 4. Sweeping Modern Curved Steel-Truss Atrium Roof Canopy (Sol Flores signature span)
  const canopyShape = new THREE.Shape();
  canopyShape.moveTo(-0.34, 0);
  canopyShape.quadraticCurveTo(0, 0.115, 0.34, 0);
  canopyShape.lineTo(0.32, -0.018);
  canopyShape.quadraticCurveTo(0, 0.092, -0.32, -0.018);
  canopyShape.closePath();

  const canopyGeo = new THREE.ExtrudeGeometry(canopyShape, {
    depth: 0.7,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 20,
  });
  canopyGeo.translate(0, 0, -0.35);
  const canopyRoof = new THREE.Mesh(canopyGeo, silverSteelMat);
  canopyRoof.position.set(0, 0.275, -0.01);
  group.add(canopyRoof);

  // Exposed structural steel curved rib arches spanning the atrium canopy
  const ribCurvePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = -0.34 + t * 0.68;
    const y = Math.sin(t * Math.PI) * 0.065;
    ribCurvePts.push(new THREE.Vector3(x, y, 0));
  }
  const ribCurve = new THREE.CatmullRomCurve3(ribCurvePts);
  const ribGeo = new THREE.TubeGeometry(ribCurve, 18, 0.009, 6, false);
  for (const rz of [-0.28, -0.1, 0.08, 0.26]) {
    const rib = new THREE.Mesh(ribGeo, whiteCladMat);
    rib.position.set(0, 0.27, rz);
    group.add(rib);
  }

  // 5. Front Civic Forecourt — Kublai Millan Cultural Face Sculptures & Flagpole
  const sculptureBase = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.025, 16), whiteCladMat);
  sculptureBase.position.set(-0.28, 0.03, 0.34);
  group.add(sculptureBase);

  const sculptureTotem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.034, 0.11, 10), kublaiAccentMat);
  sculptureTotem.position.set(-0.28, 0.095, 0.34);
  group.add(sculptureTotem);

  const sculptureCrown = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), materials.landmarkGold);
  sculptureCrown.position.set(-0.28, 0.155, 0.34);
  group.add(sculptureCrown);

  const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.36, 8), silverSteelMat);
  flagpole.position.set(0.28, 0.2, 0.35);
  group.add(flagpole);

  enableShadows(group);
  return group;
}

/**
 * 2. Christ the King Cathedral (Magugpo West — 7.44102°N, 125.79995°E)
 * Photo-referenced to the Diocese of Tagum's famous castle-like medieval fortress cathedral:
 * - Real footprint ~45.4 m East-West x 63.0 m North-South (0.46 x 0.63 scene units)
 * - Massive wide fortress nave with crenellated battlements & parapets along the roofline
 * - Twin square castle towers flanking the facade with fortress crowns
 * - Golden Royal Crown, Cross, and Sacred Heart/Alpha-Omega facade emblems
 * - Front Kublai Millan Loaves-and-Fish fountain + Rear Holy Rosary Garden with the 85.5 m World's Largest Wooden Rosary!
 */
export function buildChristTheKingCathedral(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Christ_The_King_Cathedral';

  const stoneWallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e9e0cf'),
    roughness: 0.86,
    metalness: 0.02,
  });
  const fortressTrimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c7b99e'),
    roughness: 0.82,
    metalness: 0.04,
  });
  const roofTerracottaMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8f4c36'),
    roughness: 0.56,
    metalness: 0.12,
  });
  const ironwoodMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5a3924'),
    roughness: 0.72,
    metalness: 0.06,
  });

  addContactShadow(group, shadowMap, 0.72, 1.08);

  // 1. Elevated fortress stone plinth & wide front entry steps
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.68), fortressTrimMat);
  plinth.position.set(0, -0.02, 0);
  group.add(plinth);

  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(0.28 - i * 0.02, 0.016, 0.1 - i * 0.025),
      fortressTrimMat,
    );
    step.position.set(0, 0.014 + i * 0.014, 0.35 - i * 0.02);
    group.add(step);
  }

  // 2. Massive Wide Fortress Nave Sanctuary Hall
  const nave = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.56), stoneWallMat);
  nave.position.set(0, 0.11, -0.01);
  group.add(nave);

  // Side aisle buttress pilasters
  const buttressGeo = new THREE.BoxGeometry(0.03, 0.175, 0.035);
  for (const side of [-1, 1]) {
    for (let z = -0.24; z <= 0.18; z += 0.105) {
      const b = new THREE.Mesh(buttressGeo, fortressTrimMat);
      b.position.set(side * 0.215, 0.108, z);
      group.add(b);
    }
  }

  // Recessed stained-glass clerestory windows on nave walls
  const winGeo = new THREE.BoxGeometry(0.432, 0.055, 0.36);
  const clerestory = new THREE.Mesh(winGeo, materials.landmarkGlass);
  clerestory.position.set(0, 0.135, -0.04);
  group.add(clerestory);

  // Shallow pitched inner sanctuary roof hidden behind castle battlements
  const innerRoof = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.5), roofTerracottaMat);
  innerRoof.position.set(0, 0.21, -0.02);
  group.add(innerRoof);

  // 3. Crenellated Castle Battlements (Merlons) along East, West, and Rear Rooflines
  const merlonGeo = new THREE.BoxGeometry(0.028, 0.032, 0.045);
  for (const side of [-1, 1]) {
    for (let z = -0.26; z <= 0.22; z += 0.08) {
      const m = new THREE.Mesh(merlonGeo, stoneWallMat);
      m.position.set(side * 0.2, 0.215, z);
      group.add(m);
    }
  }
  const rearMerlonGeo = new THREE.BoxGeometry(0.045, 0.032, 0.028);
  for (let x = -0.16; x <= 0.16; x += 0.08) {
    const m = new THREE.Mesh(rearMerlonGeo, stoneWallMat);
    m.position.set(x, 0.215, -0.28);
    group.add(m);
  }

  // 4. Twin Square Castle Fortress Towers Flanking the Front Facade (+Z)
  for (const side of [-1, 1]) {
    const tx = side * 0.195;
    const tz = 0.235;

    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.3, 0.115), stoneWallMat);
    tower.position.set(tx, 0.17, tz);
    group.add(tower);

    // Recessed vertical lancet tower windows
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.11, 0.122), materials.landmarkGlass);
    slit.position.set(tx, 0.2, tz);
    group.add(slit);

    // Fortress tower crown cornice + 4 corner turret battlements
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.132, 0.022, 0.132), fortressTrimMat);
    crown.position.set(tx, 0.322, tz);
    group.add(crown);

    const turretMerlonGeo = new THREE.BoxGeometry(0.032, 0.034, 0.032);
    for (const dx of [-0.045, 0.045]) {
      for (const dz of [-0.045, 0.045]) {
        const tm = new THREE.Mesh(turretMerlonGeo, stoneWallMat);
        tm.position.set(tx + dx, 0.346, tz + dz);
        group.add(tm);
      }
    }
  }

  // 5. Central Royal Fortress Facade Gable, Crown Emblem & Golden Cross
  const centerFacade = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.25, 0.08), stoneWallMat);
  centerFacade.position.set(0, 0.145, 0.26);
  group.add(centerFacade);

  // Arched portal doorway
  const doorway = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.09), materials.landmarkGlass);
  doorway.position.set(0, 0.065, 0.268);
  group.add(doorway);

  // Golden Royal Crown & Sacred Heart Relief Ring on upper facade
  const crownRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.042, 0.008, 8, 16),
    materials.landmarkGold,
  );
  crownRing.position.set(0, 0.215, 0.305);
  group.add(crownRing);

  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.11, 0.014), materials.landmarkGold);
  crossV.position.set(0, 0.32, 0.265);
  group.add(crossV);

  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.014, 0.014), materials.landmarkGold);
  crossH.position.set(0, 0.345, 0.265);
  group.add(crossH);

  // 6. Front Kublai Millan Loaves-and-Fish Fountain Basin
  const fountainRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.085, 0.026, 20),
    fortressTrimMat,
  );
  fountainRim.position.set(0, 0.025, 0.46);
  group.add(fountainRim);

  const fountainPool = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.028, 20), materials.water);
  fountainPool.position.set(0, 0.026, 0.46);
  fountainPool.userData.skipStl = true;
  group.add(fountainPool);

  // 7. Rear Holy Rosary Garden — World's Largest Wooden Rosary (85.5 m) & Outstretched Christ Statue
  const beadGeo = new THREE.SphereGeometry(0.011, 7, 7);
  const rosaryBeadCount = 26;
  for (let i = 0; i < rosaryBeadCount; i++) {
    const ang = (i / rosaryBeadCount) * Math.PI * 2;
    const bx = Math.cos(ang) * 0.16;
    const bz = -0.5 + Math.sin(ang) * 0.12;
    const bead = new THREE.Mesh(beadGeo, ironwoodMat);
    bead.position.set(bx, 0.022, bz);
    group.add(bead);
  }
  // Christ the King statue with outstretched arms at the far end of the Rosary Garden
  const statuePedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.04, 0.045, 10),
    fortressTrimMat,
  );
  statuePedestal.position.set(0, 0.032, -0.63);
  group.add(statuePedestal);

  const statueBody = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.09, 8), materials.landmarkGold);
  statueBody.position.set(0, 0.095, -0.63);
  group.add(statueBody);

  const statueArms = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.014, 0.014), materials.landmarkGold);
  statueArms.position.set(0, 0.125, -0.63);
  group.add(statueArms);

  enableShadows(group);
  return group;
}

/**
 * 3. Tagum City Historical & Cultural Center + Freedom Park (Magugpo Poblacion — 7.44759°N, 125.80412°E)
 * Photo-referenced to the 2021 Rizal Street landmark ("Mother of all Infrastructures"):
 * - Real footprint ~64.3 m East-West x 36.5 m North-South (0.643 x 0.365 scene units, 4 stories)
 * - Prominent contemporary structural WHITE ARCHES colonnade framing recessed full-height glass curtain walls
 * - Multi-level clean white roof planes + Tagumpay 1,000-seat Theater upper fly-tower volume
 * - Adjacent manicured Freedom Park ceremonial plaza to the south (+Z) with radial walkways & Flag Monument
 */
export function buildFreedomParkComplex(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Tagum_Historical_Cultural_Center_Freedom_Park';

  const pureWhiteMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f7f7f5'),
    roughness: 0.78,
    metalness: 0.03,
  });
  const warmGrayMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#cfd4da'),
    roughness: 0.85,
    metalness: 0.04,
  });
  const darkGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#28465e'),
    roughness: 0.1,
    metalness: 0.25,
    clearcoat: 0.9,
  });
  const parkLawnMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5a8652'),
    roughness: 0.92,
    metalness: 0.0,
  });

  addContactShadow(group, shadowMap, 0.86, 0.96);

  // 1. Main 4-Story Historical & Cultural Center Core (Kagikan Museum + City Library + Tagumpay Theater)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.07, 0.38), warmGrayMat);
  plinth.position.set(0, -0.015, 0);
  group.add(plinth);

  const mainCore = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.34), pureWhiteMat);
  mainCore.position.set(0, 0.12, 0);
  group.add(mainCore);

  // Recessed full-height dark glazed facade bands behind the structural arches
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.165, 0.352), darkGlassMat);
  frontGlass.position.set(0, 0.115, 0);
  group.add(frontGlass);

  // 2. Signature Contemporary White Structural Arches along Rizal Street Frontage (+Z)
  const archWallShape = new THREE.Shape();
  const totalW = 0.64;
  const totalH = 0.21;
  archWallShape.moveTo(-totalW / 2, 0);
  archWallShape.lineTo(totalW / 2, 0);
  archWallShape.lineTo(totalW / 2, totalH);
  archWallShape.lineTo(-totalW / 2, totalH);
  archWallShape.closePath();

  // Punch 7 tall modern rounded arch bays cleanly into the white facade screen!
  const bayCount = 7;
  const baySpan = (totalW - 0.06) / bayCount;
  for (let i = 0; i < bayCount; i++) {
    const cx = -totalW / 2 + 0.03 + (i + 0.5) * baySpan;
    const hw = baySpan * 0.38;
    const archR = hw;
    const straightH = 0.125;

    const hole = new THREE.Path();
    hole.moveTo(cx - hw, 0.008);
    hole.lineTo(cx + hw, 0.008);
    hole.lineTo(cx + hw, straightH);
    hole.absarc(cx, straightH, archR, 0, Math.PI, false);
    hole.lineTo(cx - hw, 0.008);
    archWallShape.holes.push(hole);
  }

  const archScreenGeo = new THREE.ExtrudeGeometry(archWallShape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 14,
  });
  const frontArchScreen = new THREE.Mesh(archScreenGeo, pureWhiteMat);
  frontArchScreen.position.set(0, 0.02, 0.17);
  group.add(frontArchScreen);

  // Rear matching arch facade screen
  const backArchScreen = new THREE.Mesh(archScreenGeo, pureWhiteMat);
  backArchScreen.position.set(0, 0.02, -0.198);
  group.add(backArchScreen);

  // 3. Sleek Multi-Plane Modern Civic Roof Slab & Tagumpay Theater Fly-Tower
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(0.69, 0.024, 0.43), pureWhiteMat);
  roofSlab.position.set(0, 0.236, 0);
  group.add(roofSlab);

  const roofAccentTrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.008, 0.44),
    materials.landmarkGold,
  );
  roofAccentTrim.position.set(0, 0.249, 0);
  group.add(roofAccentTrim);

  // Tagumpay Theater upper acoustic crown volume (offset slightly west)
  const theaterCrown = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.065, 0.24), warmGrayMat);
  theaterCrown.position.set(-0.11, 0.28, -0.02);
  group.add(theaterCrown);

  // 4. Adjacent Freedom Park Ceremonial Plaza directly South (+Z) along Rizal Street
  const parkBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.4), warmGrayMat);
  parkBase.position.set(0, 0.005, 0.44);
  group.add(parkBase);

  // Manicured green park quadrants
  for (const sx of [-0.21, 0.21]) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.28), parkLawnMat);
    lawn.position.set(sx, 0.022, 0.44);
    group.add(lawn);
  }

  // Central Freedom Park Monument Stepped Pedestal & Tall Ceremonial Flag Mast
  const monPed = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.032, 8), pureWhiteMat);
  monPed.position.set(0, 0.032, 0.44);
  group.add(monPed);

  const flagMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.009, 0.28, 8),
    materials.landmarkSteel,
  );
  flagMast.position.set(0, 0.18, 0.44);
  group.add(flagMast);

  const crest = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 8, 16), materials.landmarkGold);
  crest.position.set(0, 0.075, 0.44);
  group.add(crest);

  enableShadows(group);
  return group;
}

/**
 * 4. Gaisano Mall of Tagum (Daang Maharlika Highway / Briz District — 7.44929°N, 125.81203°E)
 * Photo-referenced to GMall Tagum's real dual-building interconnected retail complex:
 * - Real OSM footprint ~248 m x 303 m span oriented ~50° along Pan-Philippine Highway
 * - Building A (Main Department Store & Cinemas) + Building B (Supermarket & Annex)
 * - Connected by an elevated glazed pedestrian skybridge
 * - Off-white & light gray concrete/ACP walls accented with bold Gaisano crimson-red & royal-blue trim bands
 * - Glazed highway entry portals, cantilevered silver porte-cochère canopies, and rooftop HVAC chillers
 */
export function buildGaisanoCommercialHub(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Gaisano_Mall_of_Tagum';

  const mallWallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#efede8'),
    roughness: 0.78,
    metalness: 0.04,
  });
  const lightGrayPanelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d2d6dc'),
    roughness: 0.68,
    metalness: 0.14,
  });
  const gmallRedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#b8292f'),
    roughness: 0.42,
    metalness: 0.18,
  });
  const gmallBlueMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1d4477'),
    roughness: 0.44,
    metalness: 0.2,
  });

  // Rotate cleanly to match Gaisano Mall of Tagum's real -50° diagonal alignment along Daang Maharlika!
  const container = new THREE.Group();
  container.rotation.y = (50 * Math.PI) / 180;
  group.add(container);

  addContactShadow(container, shadowMap, 1.9, 1.35);

  // 1. Building A — Main Mall Big-Box Volume (3-story retail + cinemas)
  const bldgA = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.72), mallWallMat);
  bldgA.position.set(-0.34, 0.06, 0.02);
  container.add(bldgA);

  // Corporate Gaisano red & blue horizontal facade trim bands on Building A
  const bandARed = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.022, 0.74), gmallRedMat);
  bandARed.position.set(-0.34, 0.145, 0.02);
  container.add(bandARed);

  const bandABlue = new THREE.Mesh(new THREE.BoxGeometry(0.965, 0.016, 0.735), gmallBlueMat);
  bandABlue.position.set(-0.34, 0.122, 0.02);
  container.add(bandABlue);

  // Main highway glazed entrance portal & cantilevered aluminum canopy
  const entryGlassA = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.11, 0.04),
    materials.landmarkGlass,
  );
  entryGlassA.position.set(-0.34, 0.06, 0.38);
  container.add(entryGlassA);

  const canopyA = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.018, 0.12), materials.landmarkSteel);
  canopyA.position.set(-0.34, 0.095, 0.43);
  container.add(canopyA);

  // Upper cinema crown & rooftop HVAC chillers on Building A
  const cinemaBox = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.055, 0.42), lightGrayPanelMat);
  cinemaBox.position.set(-0.38, 0.175, -0.04);
  container.add(cinemaBox);

  // 2. Building B — Interconnected Annex Wing across access drive
  const bldgB = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.64), mallWallMat);
  bldgB.position.set(0.64, 0.05, -0.02);
  container.add(bldgB);

  const bandBRed = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.66), gmallRedMat);
  bandBRed.position.set(0.64, 0.125, -0.02);
  container.add(bandBRed);

  const entryGlassB = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.095, 0.04),
    materials.landmarkGlass,
  );
  entryGlassB.position.set(0.64, 0.055, 0.305);
  container.add(entryGlassB);

  // 3. Elevated Glazed Pedestrian Skybridge Linking Building A & Building B
  const bridgeFloor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.018, 0.14), lightGrayPanelMat);
  bridgeFloor.position.set(0.21, 0.088, 0.0);
  container.add(bridgeFloor);

  const bridgeGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.045, 0.13),
    materials.landmarkGlass,
  );
  bridgeGlass.position.set(0.21, 0.118, 0.0);
  container.add(bridgeGlass);

  const bridgeRoof = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.014, 0.155), gmallBlueMat);
  bridgeRoof.position.set(0.21, 0.145, 0.0);
  container.add(bridgeRoof);

  // 4. Rooftop HVAC Cooling Units across both wings
  const hvacGeo = new THREE.BoxGeometry(0.08, 0.028, 0.06);
  for (const [hx, hz] of [
    [-0.1, 0.18],
    [-0.22, 0.18],
    [0.54, 0.12],
    [0.72, -0.14],
  ]) {
    const unit = new THREE.Mesh(hvacGeo, materials.landmarkSteel);
    unit.position.set(hx, 0.162, hz);
    container.add(unit);
  }

  enableShadows(group);
  return group;
}

/**
 * 5. Composite 10-Part Photogrammetry Mapping Drone (RTK Quadcopter + 45° Oblique Camera Frustum)
 */
export function buildPhotogrammetryDrone(materials: TagumMaterialSet): {
  group: THREE.Group;
  rotors: THREE.Mesh[];
  frustum: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.name = 'Photogrammetry_RTK_Drone';

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.085, 0.34), materials.droneBody);
  group.add(body);

  const rtkStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.018, 0.08, 8),
    materials.landmarkSteel,
  );
  rtkStem.position.set(0, 0.08, -0.03);
  group.add(rtkStem);

  const rtkDome = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.055, 0.035, 14),
    materials.droneAccent,
  );
  rtkDome.position.set(0, 0.125, -0.03);
  group.add(rtkDome);

  const rotors: THREE.Mesh[] = [];
  const armAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const armGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.34, 8);
  armGeo.rotateZ(Math.PI / 2);
  const motorGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.045, 10);
  const rotorGeo = new THREE.CircleGeometry(0.15, 16);
  rotorGeo.rotateX(-Math.PI / 2);

  for (const ang of armAngles) {
    const arm = new THREE.Mesh(armGeo, materials.droneBody);
    arm.position.set(Math.cos(ang) * 0.17, 0.01, Math.sin(ang) * 0.17);
    arm.rotation.y = -ang;
    group.add(arm);

    const mx = Math.cos(ang) * 0.3;
    const mz = Math.sin(ang) * 0.3;
    const motor = new THREE.Mesh(motorGeo, materials.droneAccent);
    motor.position.set(mx, 0.032, mz);
    group.add(motor);

    const rotor = new THREE.Mesh(rotorGeo, materials.droneRotor);
    rotor.position.set(mx, 0.06, mz);
    group.add(rotor);
    rotors.push(rotor);
  }

  const gimbal = new THREE.Mesh(
    new THREE.BoxGeometry(0.095, 0.075, 0.11),
    materials.landmarkSteel,
  );
  gimbal.position.set(0, -0.075, 0.07);
  gimbal.rotation.x = Math.PI * 0.25;
  group.add(gimbal);

  const frustumGeo = new THREE.ConeGeometry(0.75, 1.9, 4, 1, true);
  frustumGeo.rotateY(Math.PI / 4);
  frustumGeo.translate(0, -0.95, 0);
  const frustum = new THREE.Mesh(frustumGeo, materials.droneFrustum);
  frustum.position.set(0, -0.1, 0.08);
  frustum.rotation.x = -Math.PI * 0.18;
  group.add(frustum);

  return { group, rotors, frustum };
}
