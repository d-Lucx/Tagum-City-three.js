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
 * 5. Robinsons Place Tagum (Brgy. Visayan Village West — 7.42958°N, 125.79719°E)
 * Photo-referenced to Architect Jonathan O. Gan's "Green City Malling" design along National Highway:
 * - 3-level off-white & cool-gray modern commercial complex rotated ~38° parallel to Daang Maharlika
 * - Double-height clerestory glass atrium entrance with Robinsons cobalt-blue & vibrant-orange fascia crown
 * - Signature front al fresco plaza lined with 6-meter sculptural illuminated "Supertrees" & tropical palms
 * - Elevated cinema penthouse block and multi-level rear parking wing
 */
export function buildRobinsonsPlaceTagum(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Robinsons_Place_Tagum';

  const container = new THREE.Group();
  // Match real OSM footprint bearing (~38° along National Highway in Visayan Village)
  container.rotation.y = (38 * Math.PI) / 180;
  group.add(container);

  const wallLightMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#eef0f3'),
    roughness: 0.62,
    metalness: 0.06,
  });
  const wallSlateMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#b6bfc9'),
    roughness: 0.56,
    metalness: 0.14,
  });
  const robinsonsBlueMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#134b9f'),
    roughness: 0.36,
    metalness: 0.24,
  });
  const robinsonsOrangeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f16618'),
    roughness: 0.38,
    metalness: 0.18,
  });
  const atriumGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#2c5f7c'),
    roughness: 0.1,
    metalness: 0.26,
    clearcoat: 0.85,
  });
  const superTreeTrunkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5a6872'),
    roughness: 0.45,
    metalness: 0.55,
  });
  const superTreeGlowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#34d399'),
    emissive: new THREE.Color('#fbbf24'),
    emissiveIntensity: 0.55,
    roughness: 0.35,
  });

  const plazaStoneMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c8cdd4'),
    roughness: 0.85,
    metalness: 0.02,
  });
  const tropicalFoliageMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2d6b41'),
    roughness: 0.86,
    metalness: 0.02,
  });

  addContactShadow(container, shadowMap, 1.75, 1.38);

  // Paved al fresco plaza & National Highway drop-off apron
  const plaza = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.024, 1.18),
    plazaStoneMat,
  );
  plaza.position.set(0, 0.012, 0.02);
  container.add(plaza);

  // Main 3-level commercial mall block (~136 m x 76 m)
  const mainMall = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.165, 0.72), wallLightMat);
  mainMall.position.set(0, 0.095, -0.1);
  container.add(mainMall);

  // Mid-level horizontal cool-gray architectural reveal band
  const midBand = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.026, 0.735), wallSlateMat);
  midBand.position.set(0, 0.092, -0.1);
  container.add(midBand);

  // Signature Robinsons Cobalt-Blue parapet fascia + Vibrant-Orange lower accent ribbon
  const blueFascia = new THREE.Mesh(
    new THREE.BoxGeometry(1.39, 0.026, 0.745),
    robinsonsBlueMat,
  );
  blueFascia.position.set(0, 0.184, -0.1);
  container.add(blueFascia);

  const orangeRibbon = new THREE.Mesh(
    new THREE.BoxGeometry(1.395, 0.014, 0.75),
    robinsonsOrangeMat,
  );
  orangeRibbon.position.set(0, 0.165, -0.1);
  container.add(orangeRibbon);

  // Projecting central full-height Clerestory Glass Atrium & Main Highway Portal
  const atriumFrame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.21, 0.14), wallSlateMat);
  atriumFrame.position.set(0, 0.118, 0.28);
  container.add(atriumFrame);

  const atriumGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.41, 0.185, 0.15),
    atriumGlassMat,
  );
  atriumGlass.position.set(0, 0.112, 0.285);
  container.add(atriumGlass);

  // Vertical glass atrium mullions
  const mullionGeo = new THREE.BoxGeometry(0.01, 0.19, 0.016);
  for (let i = -3; i <= 3; i++) {
    const mullion = new THREE.Mesh(mullionGeo, materials.landmarkSteel);
    mullion.position.set(i * 0.058, 0.114, 0.358);
    container.add(mullion);
  }

  // Prominent Robinsons Portal Crown & cantilevered drop-off canopy
  const portalCrownBlue = new THREE.Mesh(
    new THREE.BoxGeometry(0.49, 0.036, 0.17),
    robinsonsBlueMat,
  );
  portalCrownBlue.position.set(0, 0.232, 0.285);
  container.add(portalCrownBlue);

  const portalAccentOrange = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.016, 0.02),
    robinsonsOrangeMat,
  );
  portalAccentOrange.position.set(0, 0.232, 0.372);
  container.add(portalAccentOrange);

  const dropOffCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.016, 0.14),
    wallLightMat,
  );
  dropOffCanopy.position.set(0, 0.072, 0.39);
  container.add(dropOffCanopy);

  // Elevated Cinema Penthouse & Skylight Clerestory Monitor on roof
  const cinemaBlock = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.068, 0.34), wallSlateMat);
  cinemaBlock.position.set(-0.24, 0.228, -0.14);
  container.add(cinemaBlock);

  const skylightMonitor = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.045, 0.18),
    atriumGlassMat,
  );
  skylightMonitor.position.set(0.24, 0.215, -0.05);
  container.add(skylightMonitor);

  // Rear / East Annex & Covered Parking Wing
  const parkingWing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.125, 0.36), wallSlateMat);
  parkingWing.position.set(0.46, 0.075, -0.52);
  container.add(parkingWing);

  // Signature 6-Meter Illuminated Sculptural "Supertrees" lining the front Al Fresco Plaza
  const trunkGeo = new THREE.CylinderGeometry(0.012, 0.022, 0.095, 8);
  const canopyGeo = new THREE.CylinderGeometry(0.068, 0.014, 0.038, 10, 1, false);
  const ringGeo = new THREE.TorusGeometry(0.056, 0.005, 6, 14);
  ringGeo.rotateX(Math.PI / 2);

  for (const sx of [-0.54, -0.32, 0.32, 0.54, 0.0]) {
    const sz = sx === 0 ? 0.52 : 0.45;
    const treeGroup = new THREE.Group();
    treeGroup.position.set(sx, 0.024, sz);

    const trunk = new THREE.Mesh(trunkGeo, superTreeTrunkMat);
    trunk.position.y = 0.048;
    treeGroup.add(trunk);

    const canopy = new THREE.Mesh(canopyGeo, superTreeGlowMat);
    canopy.position.y = 0.098;
    treeGroup.add(canopy);

    const ring = new THREE.Mesh(ringGeo, robinsonsOrangeMat);
    ring.position.y = 0.112;
    treeGroup.add(ring);

    container.add(treeGroup);
  }

  // Green tropical planter strips along highway frontage
  const bushGeo = new THREE.SphereGeometry(0.032, 7, 6);
  for (const [bx, bz] of [
    [-0.66, 0.46],
    [-0.43, 0.48],
    [0.43, 0.48],
    [0.66, 0.46],
    [-0.68, 0.14],
    [0.68, 0.14],
  ]) {
    const bush = new THREE.Mesh(bushGeo, tropicalFoliageMat);
    bush.scale.set(1.2, 0.78, 1.2);
    bush.position.set(bx, 0.045, bz);
    container.add(bush);
  }

  enableShadows(group);
  return group;
}

/**
 * 6. Big 8 Corporate Hotel (Brgy. Magugpo South — 7.44168°N, 125.80618°E)
 * Photo-referenced to Tagum City's flagship 8-storey modern neo-classical luxury hotel:
 * - Warm cream & travertine 8-storey tower rotated ~43° facing Daang Maharlika (National Highway)
 * - Formal rhythm of slender vertical classical pilasters & dark bronze-tinted guestroom window grids
 * - Stepped dentil cornice crown, classical rooftop pediment & gold crest fascia
 * - Grand highway porte-cochère, adjacent ballroom podium & landscaped tropical swimming pool courtyard
 */
export function buildBig8CorporateHotel(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Big_8_Corporate_Hotel';

  const container = new THREE.Group();
  // Aligned to National Highway frontage (~43° azimuth)
  container.rotation.y = (43 * Math.PI) / 180;
  group.add(container);

  const creamStoneMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#eae0cc'),
    roughness: 0.66,
    metalness: 0.04,
  });
  const warmTrimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d2c0a1'),
    roughness: 0.58,
    metalness: 0.08,
  });
  const darkWindowMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1f2c3a'),
    roughness: 0.12,
    metalness: 0.32,
    clearcoat: 0.85,
  });
  const bronzeGoldMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c5963e'),
    roughness: 0.34,
    metalness: 0.72,
  });
  const deckStoneMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#dfd7c8'),
    roughness: 0.78,
    metalness: 0.02,
  });

  const plazaStoneMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#cbc6bc'),
    roughness: 0.84,
    metalness: 0.02,
  });
  const tropicalFoliageMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2b6a40'),
    roughness: 0.86,
    metalness: 0.02,
  });

  addContactShadow(container, shadowMap, 1.12, 0.96);

  // Landscaped hotel compound plinth & driveway apron
  const compoundBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.022, 0.82),
    plazaStoneMat,
  );
  compoundBase.position.set(0, 0.011, 0);
  container.add(compoundBase);

  // 1. 2-Storey Grand Lobby & Ballroom Podium Base
  const podium = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.092, 0.42), creamStoneMat);
  podium.position.set(-0.08, 0.068, -0.1);
  container.add(podium);

  const podiumCornice = new THREE.Mesh(new THREE.BoxGeometry(0.665, 0.016, 0.445), warmTrimMat);
  podiumCornice.position.set(-0.08, 0.118, -0.1);
  container.add(podiumCornice);

  // 2. Flagship 8-Storey Modern Neo-Classical Hotel Tower
  const towerH = 0.34;
  const towerW = 0.56;
  const towerD = 0.28;
  const tower = new THREE.Mesh(new THREE.BoxGeometry(towerW, towerH, towerD), creamStoneMat);
  tower.position.set(-0.08, 0.12 + towerH / 2, -0.12);
  container.add(tower);

  // Recessed dark-glass guestroom window bands across floors 3..8 (front & rear elevations)
  const floorWinGeo = new THREE.BoxGeometry(towerW - 0.055, 0.026, towerD + 0.008);
  for (let f = 0; f < 6; f++) {
    const winBand = new THREE.Mesh(floorWinGeo, darkWindowMat);
    winBand.position.set(-0.08, 0.155 + f * 0.048, -0.12);
    container.add(winBand);
  }

  // Formal Neo-Classical Vertical Pilasters framing the 8-storey facade bays
  const pilasterGeo = new THREE.BoxGeometry(0.022, towerH + 0.02, towerD + 0.022);
  for (let i = -3; i <= 3; i++) {
    const pilaster = new THREE.Mesh(pilasterGeo, warmTrimMat);
    pilaster.position.set(-0.08 + i * 0.086, 0.12 + towerH / 2, -0.12);
    container.add(pilaster);
  }

  // Stepped Classical Dentil Cornice Crown & Rooftop Pediment
  const crownBase = new THREE.Mesh(
    new THREE.BoxGeometry(towerW + 0.045, 0.022, towerD + 0.045),
    warmTrimMat,
  );
  crownBase.position.set(-0.08, 0.468, -0.12);
  container.add(crownBase);

  const crownCap = new THREE.Mesh(
    new THREE.BoxGeometry(towerW + 0.068, 0.016, towerD + 0.068),
    creamStoneMat,
  );
  crownCap.position.set(-0.08, 0.486, -0.12);
  container.add(crownCap);

  // Central Rooftop Penthouse & Gold "BIG 8" Sign Crest
  const penthouse = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.055, 0.16), creamStoneMat);
  penthouse.position.set(-0.08, 0.518, -0.12);
  container.add(penthouse);

  const goldCrest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.024, 0.018), bronzeGoldMat);
  goldCrest.position.set(-0.08, 0.516, -0.036);
  container.add(goldCrest);

  // 3. Grand Cantilevered Highway Porte-Cochère with Classical Columns
  const porteRoof = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.024, 0.14), warmTrimMat);
  porteRoof.position.set(-0.08, 0.095, 0.16);
  container.add(porteRoof);

  const porteGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.246, 0.008, 0.146), bronzeGoldMat);
  porteGoldTrim.position.set(-0.08, 0.106, 0.16);
  container.add(porteGoldTrim);

  const colGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.075, 10);
  for (const cx of [-0.18, 0.02]) {
    const col = new THREE.Mesh(colGeo, creamStoneMat);
    col.position.set(cx, 0.056, 0.21);
    container.add(col);
  }

  // 4. Adjacent Resort-Style Outdoor Swimming Pool Courtyard & Tropical Palms
  const poolDeck = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.018, 0.44), deckStoneMat);
  poolDeck.position.set(0.31, 0.028, 0.08);
  container.add(poolDeck);

  const poolWater = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.022, 0.31), materials.water);
  poolWater.position.set(0.31, 0.031, 0.08);
  container.add(poolWater);

  // Poolside Gazebo / Cabana Pavilion
  const cabanaBase = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.048, 0.11), warmTrimMat);
  cabanaBase.position.set(0.31, 0.06, -0.2);
  container.add(cabanaBase);

  const cabanaRoof = new THREE.Mesh(new THREE.ConeGeometry(0.092, 0.042, 4), bronzeGoldMat);
  cabanaRoof.rotation.y = Math.PI / 4;
  cabanaRoof.position.set(0.31, 0.104, -0.2);
  container.add(cabanaRoof);

  // Palm & tropical hedge accents framing courtyard and highway drive
  const palmGeo = new THREE.SphereGeometry(0.03, 7, 6);
  for (const [px, pz] of [
    [0.42, 0.26],
    [0.42, -0.04],
    [0.18, 0.28],
    [-0.36, 0.26],
    [-0.38, -0.32],
  ]) {
    const palm = new THREE.Mesh(palmGeo, tropicalFoliageMat);
    palm.scale.set(1.15, 0.9, 1.15);
    palm.position.set(px, 0.054, pz);
    container.add(palm);
  }

  enableShadows(group);
  return group;
}

/**
 * 7. Tagum City Trade & Cultural Center Pavilion (Brgy. Magugpo Poblacion — 7.44934°N, 125.80408°E)
 * Photo-referenced to the twin wide-span tropical trade halls & civic arena along Quezon St (north of Freedom Park):
 * - Real footprint ~52 m × 108 m (0.52 × 1.08 scene units) aligned pure North–South along Quezon St
 * - Sweeping vaulted arched steel-truss roofs with raised ventilated clerestory ridge monitors
 * - Crisp white concrete perimeter colonnades, crimson-terracotta civic trim bands & grand entrance canopy
 */
export function buildTagumTradeCenter(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Tagum_Trade_Cultural_Center_Pavilion';

  const whiteConcreteMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f1f3f5'),
    roughness: 0.72,
    metalness: 0.04,
  });
  const roofMetalMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d2dae2'),
    roughness: 0.38,
    metalness: 0.56,
  });
  const civicCrimsonMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#9e2b2b'),
    roughness: 0.46,
    metalness: 0.16,
  });
  const darkClerestoryMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#274052'),
    roughness: 0.15,
    metalness: 0.25,
    clearcoat: 0.75,
  });

  const plazaStoneMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c7ccd2'),
    roughness: 0.86,
    metalness: 0.02,
  });
  const tropicalFoliageMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2e6c42'),
    roughness: 0.86,
    metalness: 0.02,
  });

  addContactShadow(group, shadowMap, 0.72, 1.24);

  // Paved Quezon Street civic exhibition apron
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.022, 1.14),
    plazaStoneMat,
  );
  apron.position.y = 0.011;
  group.add(apron);

  // Helper to extrude a curved wide-span tropical arched steel-truss hall roof
  const createArchedHall = (widthX: number, lengthZ: number, wallH: number, archRise: number) => {
    const hall = new THREE.Group();

    // Recessed perimeter exhibition walls + shaded glass clerestory band
    const lowerWall = new THREE.Mesh(
      new THREE.BoxGeometry(widthX - 0.06, wallH, lengthZ - 0.06),
      whiteConcreteMat,
    );
    lowerWall.position.y = 0.022 + wallH / 2;
    hall.add(lowerWall);

    const glassBand = new THREE.Mesh(
      new THREE.BoxGeometry(widthX - 0.045, 0.028, lengthZ - 0.045),
      darkClerestoryMat,
    );
    glassBand.position.y = 0.022 + wallH - 0.018;
    hall.add(glassBand);

    // Exterior white concrete colonnade piers along East & West walkways
    const pierGeo = new THREE.BoxGeometry(0.024, wallH + 0.016, 0.026);
    const pierCount = Math.max(4, Math.round(lengthZ / 0.11));
    for (let i = 0; i <= pierCount; i++) {
      const pz = -lengthZ / 2 + 0.03 + (i / pierCount) * (lengthZ - 0.06);
      for (const side of [-1, 1]) {
        const pier = new THREE.Mesh(pierGeo, whiteConcreteMat);
        pier.position.set(side * (widthX / 2 - 0.014), 0.022 + wallH / 2, pz);
        hall.add(pier);
      }
    }

    // Sweeping arched barrel steel-truss roof shell
    const archShape = new THREE.Shape();
    const halfW = widthX / 2 + 0.035;
    archShape.moveTo(-halfW, 0);
    archShape.quadraticCurveTo(0, archRise, halfW, 0);
    archShape.lineTo(halfW, 0.018);
    archShape.quadraticCurveTo(0, archRise + 0.018, -halfW, 0.018);
    archShape.closePath();

    const roofGeo = new THREE.ExtrudeGeometry(archShape, {
      depth: lengthZ + 0.04,
      bevelEnabled: false,
      curveSegments: 14,
    });
    roofGeo.translate(0, 0, -(lengthZ + 0.04) / 2);
    const roofMesh = new THREE.Mesh(roofGeo, roofMetalMat);
    roofMesh.position.y = 0.022 + wallH;
    hall.add(roofMesh);

    // Crimson civic eave trim beams along both sides
    const eaveGeo = new THREE.BoxGeometry(0.02, 0.018, lengthZ + 0.045);
    for (const side of [-1, 1]) {
      const eave = new THREE.Mesh(eaveGeo, civicCrimsonMat);
      eave.position.set(side * halfW, 0.022 + wallH + 0.008, 0);
      hall.add(eave);
    }

    // Raised ventilated clerestory ridge monitor running full length of hall
    const ridgeBase = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 0.24, 0.022, lengthZ - 0.06),
      darkClerestoryMat,
    );
    ridgeBase.position.y = 0.022 + wallH + archRise * 0.52 + 0.014;
    hall.add(ridgeBase);

    const ridgeCap = new THREE.Mesh(
      new THREE.BoxGeometry(widthX * 0.3, 0.012, lengthZ - 0.02),
      roofMetalMat,
    );
    ridgeCap.position.y = 0.022 + wallH + archRise * 0.52 + 0.028;
    hall.add(ridgeCap);

    return hall;
  };

  // North Main Arena / Cultural Pavilion Hall
  const northHall = createArchedHall(0.46, 0.52, 0.115, 0.11);
  northHall.position.set(0, 0, -0.24);
  group.add(northHall);

  // South Trade & Expo Hall linked seamlessly via covered civic breezeway
  const southHall = createArchedHall(0.42, 0.42, 0.095, 0.088);
  southHall.position.set(0, 0, 0.29);
  group.add(southHall);

  // Central Breezeway Connector & Grand Quezon St Entrance Canopy
  const connectorRoof = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.02, 0.14),
    civicCrimsonMat,
  );
  connectorRoof.position.set(0, 0.115, 0.04);
  group.add(connectorRoof);

  const westCanopy = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.016, 0.24), roofMetalMat);
  westCanopy.position.set(-0.27, 0.098, 0.04);
  group.add(westCanopy);

  // Landscaped perimeter trees framing Quezon Street & Pioneer Avenue
  const treeGeo = new THREE.SphereGeometry(0.032, 7, 6);
  for (const [tx, tz] of [
    [-0.27, -0.44],
    [-0.27, -0.22],
    [-0.27, 0.32],
    [0.27, -0.4],
    [0.27, 0.05],
    [0.27, 0.44],
  ]) {
    const tree = new THREE.Mesh(treeGeo, tropicalFoliageMat);
    tree.scale.set(1.1, 0.85, 1.1);
    tree.position.set(tx, 0.052, tz);
    group.add(tree);
  }

  enableShadows(group);
  return group;
}

/**
 * 8. Iglesia ni Cristo — Locale of Tagum City (Brgy. Apokon — 7.42773°N, 125.82540°E)
 * Photo-referenced to the iconic neo-Gothic Iglesia ni Cristo house of worship architecture:
 * - Pristine white walls accented with pastel sage-green panels & pointed Gothic gables
 * - Soaring twin front slender spires, taller central pinnacle spire & flanking side turret pinnacles
 * - Rhythmic vertical exterior buttress pilasters & pointed Gothic lancet clerestory windows
 * - Wide elevated sanctuary steps and manicured gated tropical courtyard
 */
export function buildIncTagumChapel(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Iglesia_ni_Cristo_Tagum';

  const pristineWhiteMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f6f8f9'),
    roughness: 0.56,
    metalness: 0.04,
  });
  const sageGreenMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#88b39a'),
    roughness: 0.52,
    metalness: 0.08,
  });
  const roofSageMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#6b967e'),
    roughness: 0.46,
    metalness: 0.14,
  });
  const lancetGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#27485d'),
    emissive: new THREE.Color('#f5d08a'),
    emissiveIntensity: 0.22,
    roughness: 0.14,
    metalness: 0.2,
    clearcoat: 0.85,
  });

  const plazaStoneMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#cfd5d8'),
    roughness: 0.84,
    metalness: 0.02,
  });
  const tropicalFoliageMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2c6d42'),
    roughness: 0.85,
    metalness: 0.02,
  });

  addContactShadow(group, shadowMap, 0.62, 0.78);

  // Manicured compound plaza & stepped sanctuary plinth
  const courtyard = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.02, 0.68),
    plazaStoneMat,
  );
  courtyard.position.y = 0.01;
  group.add(courtyard);

  const steps1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.018, 0.52), pristineWhiteMat);
  steps1.position.set(0, 0.028, 0.02);
  group.add(steps1);

  const steps2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.018, 0.48), pristineWhiteMat);
  steps2.position.set(0, 0.044, 0.01);
  group.add(steps2);

  // Main Sanctuary Nave Body
  const naveW = 0.24;
  const naveH = 0.165;
  const naveL = 0.4;
  const nave = new THREE.Mesh(new THREE.BoxGeometry(naveW, naveH, naveL), pristineWhiteMat);
  nave.position.set(0, 0.052 + naveH / 2, -0.02);
  group.add(nave);

  // Subtle pastel sage horizontal base plinth & upper frieze along nave
  const sageFrieze = new THREE.Mesh(
    new THREE.BoxGeometry(naveW + 0.008, 0.022, naveL + 0.008),
    sageGreenMat,
  );
  sageFrieze.position.set(0, 0.052 + naveH - 0.022, -0.02);
  group.add(sageFrieze);

  // Pitched Neo-Gothic Sanctuary Gable Roof
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-naveW / 2 - 0.018, 0);
  gableShape.lineTo(0, 0.105);
  gableShape.lineTo(naveW / 2 + 0.018, 0);
  gableShape.closePath();

  const gableGeo = new THREE.ExtrudeGeometry(gableShape, {
    depth: naveL + 0.024,
    bevelEnabled: false,
  });
  gableGeo.translate(0, 0, -(naveL + 0.024) / 2);
  const gableRoof = new THREE.Mesh(gableGeo, roofSageMat);
  gableRoof.position.set(0, 0.052 + naveH, -0.02);
  group.add(gableRoof);

  // Helper to construct iconic slender tapered Iglesia ni Cristo Neo-Gothic Spires
  const buildSpire = (
    x: number,
    z: number,
    baseY: number,
    shaftW: number,
    shaftH: number,
    needleH: number,
  ) => {
    const spire = new THREE.Group();
    spire.position.set(x, baseY, z);

    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(shaftW, shaftH, shaftW),
      pristineWhiteMat,
    );
    shaft.position.y = shaftH / 2;
    spire.add(shaft);

    const sageCollar = new THREE.Mesh(
      new THREE.BoxGeometry(shaftW * 1.14, 0.016, shaftW * 1.14),
      sageGreenMat,
    );
    sageCollar.position.y = shaftH * 0.78;
    spire.add(sageCollar);

    const crownBox = new THREE.Mesh(
      new THREE.BoxGeometry(shaftW * 0.78, shaftH * 0.24, shaftW * 0.78),
      pristineWhiteMat,
    );
    crownBox.position.y = shaftH + shaftH * 0.12;
    spire.add(crownBox);

    const needle = new THREE.Mesh(
      new THREE.ConeGeometry(shaftW * 0.44, needleH, 4),
      pristineWhiteMat,
    );
    needle.rotation.y = Math.PI / 4;
    needle.position.y = shaftH + shaftH * 0.24 + needleH / 2;
    spire.add(needle);

    const tip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0018, 0.0032, needleH * 0.35, 6),
      sageGreenMat,
    );
    tip.position.y = shaftH + shaftH * 0.24 + needleH + needleH * 0.14;
    spire.add(tip);

    return spire;
  };

  // Grand Front Facade: Tall Central Spire + Twin Flanking Main Towers + Outer Corner Pinnacles
  group.add(buildSpire(0, 0.185, 0.052, 0.056, 0.245, 0.175));
  group.add(buildSpire(-0.088, 0.175, 0.052, 0.044, 0.215, 0.135));
  group.add(buildSpire(0.088, 0.175, 0.052, 0.044, 0.215, 0.135));
  group.add(buildSpire(-0.132, 0.145, 0.052, 0.028, 0.17, 0.085));
  group.add(buildSpire(0.132, 0.145, 0.052, 0.028, 0.17, 0.085));

  // Rear Apse Flanking Pinnacles
  group.add(buildSpire(-0.115, -0.215, 0.052, 0.028, 0.175, 0.095));
  group.add(buildSpire(0.115, -0.215, 0.052, 0.028, 0.175, 0.095));

  // Front Pointed Entry Portico & Tall Lancet Sanctuary Windows
  const portico = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.055), pristineWhiteMat);
  portico.position.set(0, 0.106, 0.21);
  group.add(portico);

  const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.095, 0.014), lancetGlassMat);
  frontWindow.position.set(0, 0.205, 0.215);
  group.add(frontWindow);

  // Rhythmic Side Buttress Pilasters + Small Pinnacles + Gothic Lancet Windows
  const buttressGeo = new THREE.BoxGeometry(0.02, naveH + 0.024, 0.02);
  const miniPinGeo = new THREE.ConeGeometry(0.012, 0.055, 4);
  const sideWinGeo = new THREE.BoxGeometry(0.012, 0.092, 0.028);

  for (let i = 0; i < 5; i++) {
    const bz = -0.17 + i * 0.075;
    for (const side of [-1, 1]) {
      const buttress = new THREE.Mesh(buttressGeo, pristineWhiteMat);
      buttress.position.set(side * (naveW / 2 + 0.008), 0.052 + naveH / 2 + 0.01, bz);
      group.add(buttress);

      const pin = new THREE.Mesh(miniPinGeo, sageGreenMat);
      pin.rotation.y = Math.PI / 4;
      pin.position.set(side * (naveW / 2 + 0.008), 0.052 + naveH + 0.048, bz);
      group.add(pin);

      if (i < 4) {
        const win = new THREE.Mesh(sideWinGeo, lancetGlassMat);
        win.position.set(side * (naveW / 2 + 0.003), 0.052 + naveH * 0.56, bz + 0.0375);
        group.add(win);
      }
    }
  }

  // Manicured symmetrical tropical hedges along courtyard edges
  const hedgeGeo = new THREE.BoxGeometry(0.036, 0.028, 0.42);
  for (const side of [-1, 1]) {
    const hedge = new THREE.Mesh(hedgeGeo, tropicalFoliageMat);
    hedge.position.set(side * 0.21, 0.034, 0);
    group.add(hedge);
  }

  enableShadows(group);
  return group;
}

