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
    opacity: 0.42,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.025;
  mesh.userData.skipStl = true;
  group.add(mesh);
}

/**
 * 1. New Tagum City Hall (Apokon Civic Center)
 * 11-part composite architectural model: stepped civic plinth, semicircular beveled podium,
 * double-height glazed rotunda drum, sweeping winged canopy roof, twin colonnades,
 * central lantern spire, flagpole, and forecourt reflecting basin.
 */
export function buildTagumCityHall(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'New_Tagum_City_Hall';
  addContactShadow(group, shadowMap, 6.2, 5.4);

  // Part 1: Stepped civic granite plinth (embedded slightly downward for terrain grounding)
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.36, 3.8),
    materials.landmarkConcrete,
  );
  plinth.position.set(0, 0.04, 0);
  group.add(plinth);

  // Part 2: Grand front entrance steps
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(2.1 - i * 0.14, 0.08, 0.72 - i * 0.16),
      materials.landmarkConcrete,
    );
    step.position.set(0, 0.16 + i * 0.07, 1.85 - i * 0.12);
    group.add(step);
  }

  // Part 3: Curved semicircular civic wing body (ExtrudeGeometry with bevel)
  const wingShape = new THREE.Shape();
  wingShape.absarc(0, 0, 2.25, Math.PI * 0.12, Math.PI * 0.88, false);
  wingShape.absarc(0, 0, 1.35, Math.PI * 0.88, Math.PI * 0.12, true);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.78,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 24,
  });
  wingGeo.rotateX(-Math.PI / 2);
  const wingMesh = new THREE.Mesh(wingGeo, materials.landmarkConcrete);
  wingMesh.position.set(0, 0.22, 0.9);
  group.add(wingMesh);

  // Part 4: Central double-height glazed rotunda drum
  const rotundaGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.0, 1.18, 24),
    materials.landmarkGlass,
  );
  rotundaGlass.position.set(0, 0.8, 0.1);
  group.add(rotundaGlass);

  // Part 5: Architectural vertical mullion ribs around rotunda
  const ribGeo = new THREE.BoxGeometry(0.07, 1.24, 0.09);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const rib = new THREE.Mesh(ribGeo, materials.landmarkConcrete);
    rib.position.set(Math.cos(angle) * 0.98, 0.81, 0.1 + Math.sin(angle) * 0.98);
    rib.rotation.y = -angle;
    group.add(rib);
  }

  // Part 6: Sweeping overhanging wing canopy roof (beveled extrusion)
  const roofShape = new THREE.Shape();
  roofShape.absarc(0, 0, 2.52, Math.PI * 0.09, Math.PI * 0.91, false);
  roofShape.absarc(0, 0, 1.15, Math.PI * 0.91, Math.PI * 0.09, true);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.05,
    bevelSegments: 2,
    curveSegments: 24,
  });
  roofGeo.rotateX(-Math.PI / 2);
  const roofCanopy = new THREE.Mesh(roofGeo, materials.landmarkRoofAccent);
  roofCanopy.position.set(0, 1.02, 0.9);
  group.add(roofCanopy);

  // Part 7: Sculpted central dome & tiered lantern roof (LatheGeometry)
  const domePts = [
    new THREE.Vector2(1.25, 0.0),
    new THREE.Vector2(1.18, 0.14),
    new THREE.Vector2(0.85, 0.36),
    new THREE.Vector2(0.42, 0.52),
    new THREE.Vector2(0.32, 0.68),
    new THREE.Vector2(0.06, 0.82),
    new THREE.Vector2(0.0, 0.84),
  ];
  const domeMesh = new THREE.Mesh(
    new THREE.LatheGeometry(domePts, 24),
    materials.landmarkRoofAccent,
  );
  domeMesh.position.set(0, 1.36, 0.1);
  group.add(domeMesh);

  // Part 8: Brushed gold crown finial
  const finial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.06, 0.45, 10),
    materials.landmarkGold,
  );
  finial.position.set(0, 2.36, 0.1);
  group.add(finial);

  // Part 9: Front portico columns (6 classical-modern piers)
  const colGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.86, 12);
  for (let i = -2.5; i <= 2.5; i += 1) {
    const col = new THREE.Mesh(colGeo, materials.landmarkConcrete);
    col.position.set(i * 0.38, 0.65, 1.38);
    group.add(col);
  }

  // Part 10: Civic forecourt reflecting pool & gold flagpole
  const poolRim = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.12, 0.72),
    materials.landmarkConcrete,
  );
  poolRim.position.set(0, 0.16, 2.22);
  group.add(poolRim);

  const poolWater = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.08, 0.54),
    materials.water,
  );
  poolWater.position.set(0, 0.2, 2.22);
  poolWater.userData.skipStl = true;
  group.add(poolWater);

  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 1.65, 8),
    materials.landmarkSteel,
  );
  flagPole.position.set(1.65, 0.92, 2.1);
  group.add(flagPole);

  enableShadows(group);
  return group;
}

/**
 * 2. Christ the King Cathedral (Magugpo West)
 * 9-part composite model: elevated sanctuary plinth, nave with side aisles,
 * iconic soaring flared A-frame/peaked roof, glazed clerestory band,
 * bell tower spire, and brushed gold cross finial.
 */
export function buildChristTheKingCathedral(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Christ_The_King_Cathedral';
  addContactShadow(group, shadowMap, 5.4, 5.4);

  // Part 1: Masonry sanctuary terrace
  const terrace = new THREE.Mesh(
    new THREE.BoxGeometry(4.1, 0.36, 4.4),
    materials.landmarkConcrete,
  );
  terrace.position.set(0, 0.04, 0);
  group.add(terrace);

  // Part 2: Main nave volume
  const nave = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.92, 3.2),
    materials.landmarkConcrete,
  );
  nave.position.set(0, 0.66, -0.1);
  group.add(nave);

  // Part 3: Recessed stained-glass clerestory band on east & west facades
  const clerestory = new THREE.Mesh(
    new THREE.BoxGeometry(2.44, 0.32, 2.5),
    materials.landmarkGlass,
  );
  clerestory.position.set(0, 0.94, -0.1);
  group.add(clerestory);

  // Part 4: Soaring flared peaked cathedral roof (ExtrudeGeometry)
  const peakShape = new THREE.Shape();
  peakShape.moveTo(-1.68, 0);
  peakShape.quadraticCurveTo(-0.55, 0.65, 0, 1.85);
  peakShape.quadraticCurveTo(0.55, 0.65, 1.68, 0);
  peakShape.lineTo(1.38, -0.12);
  peakShape.quadraticCurveTo(0.45, 0.45, 0, 1.48);
  peakShape.quadraticCurveTo(-0.45, 0.45, -1.38, -0.12);
  peakShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(peakShape, {
    depth: 3.45,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  roofGeo.translate(0, 0, -1.725);
  const cathedralRoof = new THREE.Mesh(roofGeo, materials.landmarkRoofAccent);
  cathedralRoof.position.set(0, 1.06, -0.1);
  group.add(cathedralRoof);

  // Part 5: Front triangular glazed narthex facade
  const narthexGlass = new THREE.Mesh(
    new THREE.ConeGeometry(0.92, 1.35, 3),
    materials.landmarkGlass,
  );
  narthexGlass.rotation.y = Math.PI / 6;
  narthexGlass.scale.set(1.15, 1, 0.25);
  narthexGlass.position.set(0, 1.62, 1.54);
  group.add(narthexGlass);

  // Part 6: Entrance portico canopy & columns
  const porticoRoof = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.14, 0.95),
    materials.landmarkConcrete,
  );
  porticoRoof.position.set(0, 0.94, 1.85);
  group.add(porticoRoof);

  const colGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.74, 10);
  for (const cx of [-0.75, -0.25, 0.25, 0.75]) {
    const c = new THREE.Mesh(colGeo, materials.landmarkConcrete);
    c.position.set(cx, 0.54, 2.12);
    group.add(c);
  }

  // Part 7: Tall slender belfry bell tower
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 2.55, 0.68),
    materials.landmarkConcrete,
  );
  tower.position.set(1.52, 1.44, 1.15);
  group.add(tower);

  // Part 8: Belfry louvered cap
  const belfryCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.56, 0.78, 4),
    materials.landmarkRoofAccent,
  );
  belfryCap.rotation.y = Math.PI / 4;
  belfryCap.position.set(1.52, 3.06, 1.15);
  group.add(belfryCap);

  // Part 9: Brushed gold cross spire atop the belfry & apex
  const crossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.68, 0.07),
    materials.landmarkGold,
  );
  crossV.position.set(1.52, 3.66, 1.15);
  group.add(crossV);

  const crossH = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.07, 0.07),
    materials.landmarkGold,
  );
  crossH.position.set(1.52, 3.78, 1.15);
  group.add(crossH);

  enableShadows(group);
  return group;
}

/**
 * 3. Freedom Park & Tagum Historical & Cultural Center (Magugpo Poblacion)
 * 8-part composite civic plaza: circular stepped amphitheater, central obelisk crest,
 * multi-tiered Mindanao pitched cultural pavilion, veranda colonnade, and circular fountain.
 */
export function buildFreedomParkComplex(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Freedom_Park_Historical_Center';
  addContactShadow(group, shadowMap, 6.0, 5.8);

  // Part 1: Circular ceremonial plaza disc
  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(2.65, 2.75, 0.28, 32),
    materials.landmarkConcrete,
  );
  plaza.position.set(0, 0.02, 0);
  group.add(plaza);

  // Part 2: Stepped amphitheater ring (LatheGeometry)
  const ampPts = [
    new THREE.Vector2(1.25, 0.14),
    new THREE.Vector2(1.65, 0.14),
    new THREE.Vector2(1.65, 0.28),
    new THREE.Vector2(1.95, 0.28),
    new THREE.Vector2(1.95, 0.42),
    new THREE.Vector2(2.25, 0.42),
    new THREE.Vector2(2.25, 0.14),
  ];
  const amphitheater = new THREE.Mesh(
    new THREE.LatheGeometry(ampPts, 28, Math.PI * 0.15, Math.PI * 0.7),
    materials.landmarkConcrete,
  );
  amphitheater.position.set(0, 0, -0.35);
  group.add(amphitheater);

  // Part 3: Tagum Historical & Cultural Center Pavilion body (north quadrant)
  const hallBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.72, 1.55),
    materials.landmarkConcrete,
  );
  hallBody.position.set(0, 0.5, -1.25);
  group.add(hallBody);

  const hallGlass = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.44, 1.6),
    materials.landmarkGlass,
  );
  hallGlass.position.set(0, 0.54, -1.25);
  group.add(hallGlass);

  // Part 4 & 5: Double-tiered Mindanao pitched cultural roof
  const lowerRoof = new THREE.Mesh(
    new THREE.ConeGeometry(1.95, 0.55, 4),
    materials.landmarkRoofAccent,
  );
  lowerRoof.rotation.y = Math.PI / 4;
  lowerRoof.scale.set(1.15, 1, 0.85);
  lowerRoof.position.set(0, 1.12, -1.25);
  group.add(lowerRoof);

  const upperRoof = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 0.48, 4),
    materials.landmarkRoofAccent,
  );
  upperRoof.rotation.y = Math.PI / 4;
  upperRoof.scale.set(1.1, 1, 0.82);
  upperRoof.position.set(0, 1.52, -1.25);
  group.add(upperRoof);

  // Part 6: Central Freedom Monument tiered pedestal & obelisk spire
  const monBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.62, 0.36, 8),
    materials.landmarkConcrete,
  );
  monBase.position.set(0, 0.32, 0.75);
  group.add(monBase);

  const obelisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.24, 1.65, 4),
    materials.landmarkConcrete,
  );
  obelisk.rotation.y = Math.PI / 4;
  obelisk.position.set(0, 1.28, 0.75);
  group.add(obelisk);

  // Part 7: Sculptural bronze-gold crest ring atop monument
  const crestRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.045, 10, 20),
    materials.landmarkGold,
  );
  crestRing.position.set(0, 2.24, 0.75);
  group.add(crestRing);

  // Part 8: Circular fountain water basin around monument
  const fountainWater = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 1.05, 24),
    materials.water,
  );
  fountainWater.rotation.x = -Math.PI / 2;
  fountainWater.position.set(0, 0.19, 0.75);
  fountainWater.userData.skipStl = true;
  group.add(fountainWater);

  enableShadows(group);
  return group;
}

/**
 * 4. Gaisano Mall & Daang Maharlika Commercial Complex (Apokon Highway)
 * 8-part commercial hub: retail podium, curved corner glass atrium, horizontal louvers,
 * cantilevered entrance canopy, upper cinema volume, rooftop mechanical penthouse & HVAC drums.
 */
export function buildGaisanoCommercialHub(
  materials: TagumMaterialSet,
  shadowMap: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Gaisano_Commercial_Hub';
  addContactShadow(group, shadowMap, 5.4, 4.6);

  // Part 1: Ground retail podium
  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.98, 2.9),
    materials.landmarkConcrete,
  );
  podium.position.set(0, 0.38, 0);
  group.add(podium);

  // Part 2: Curved corner glazed atrium drum
  const atrium = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 0.92, 1.24, 20, 1, false, 0, Math.PI * 1.2),
    materials.landmarkGlass,
  );
  atrium.rotation.y = -Math.PI * 0.15;
  atrium.position.set(-1.55, 0.56, 0.92);
  group.add(atrium);

  // Part 3: Architectural brise-soleil fascia bands
  for (const yOff of [0.58, 0.96]) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(4.32, 0.09, 3.02),
      materials.landmarkRoofAccent,
    );
    band.position.set(0, yOff, 0);
    group.add(band);
  }

  // Part 4: Upper cinema & commercial mezzanine block
  const upperBlock = new THREE.Mesh(
    new THREE.BoxGeometry(2.75, 0.68, 2.15),
    materials.landmarkConcrete,
  );
  upperBlock.position.set(0.45, 1.2, -0.15);
  group.add(upperBlock);

  // Part 5: Cantilevered porte-cochère entry canopy
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.12, 0.85),
    materials.landmarkSteel,
  );
  canopy.position.set(-0.35, 0.56, 1.72);
  group.add(canopy);

  // Part 6 & 7: Rooftop mechanical penthouse & HVAC cooling drums
  const mechBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.32, 0.85),
    materials.landmarkSteel,
  );
  mechBox.position.set(0.7, 1.7, -0.3);
  group.add(mechBox);

  const hvacGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.22, 12);
  for (const dx of [-0.55, -0.1]) {
    const unit = new THREE.Mesh(hvacGeo, materials.landmarkSteel);
    unit.position.set(dx, 1.65, 0.25);
    group.add(unit);
  }

  enableShadows(group);
  return group;
}

/**
 * 5. Libuganon River Steel Arch Bridge (Canocotan Crossing)
 * 7-part structural bridge: dual abutments, arched roadway deck, twin parabolic steel
 * arch ribs (TubeGeometry), suspender cables, and guard parapets.
 */
export function buildLibuganonBridge(materials: TagumMaterialSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Libuganon_River_Bridge';

  // Part 1 & 2: Concrete riverbank abutments
  const abutGeo = new THREE.BoxGeometry(1.35, 0.72, 0.88);
  for (const zPos of [-2.45, 2.45]) {
    const abut = new THREE.Mesh(abutGeo, materials.landmarkConcrete);
    abut.position.set(0, 0.1, zPos);
    group.add(abut);
  }

  // Part 3: Highway deck spanning the river
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.18, 5.2),
    materials.landmarkConcrete,
  );
  deck.position.set(0, 0.48, 0);
  group.add(deck);

  // Part 4: Asphalt roadway strip
  const asphalt = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.04, 5.24),
    materials.roadPrimary,
  );
  asphalt.position.set(0, 0.58, 0);
  group.add(asphalt);

  // Part 5 & 6: Twin parabolic steel arch ribs via TubeGeometry
  const makeArch = (xOffset: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const z = -2.2 + t * 4.4;
      const h = Math.sin(t * Math.PI) * 1.15;
      pts.push(new THREE.Vector3(xOffset, 0.52 + h, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 24, 0.065, 8, false);
    return new THREE.Mesh(tube, materials.landmarkRoofAccent);
  };
  group.add(makeArch(-0.56));
  group.add(makeArch(0.56));

  // Part 7: Vertical steel suspender cables + top cross-braces
  const cableGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 6);
  for (let i = 2; i <= 14; i += 2) {
    const t = i / 16;
    const z = -2.2 + t * 4.4;
    const h = Math.sin(t * Math.PI) * 1.15;
    for (const xOff of [-0.56, 0.56]) {
      const cable = new THREE.Mesh(cableGeo, materials.landmarkSteel);
      cable.scale.set(1, h, 1);
      cable.position.set(xOff, 0.52 + h / 2, z);
      group.add(cable);
    }
    if (i >= 4 && i <= 12) {
      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(1.12, 0.045, 0.045),
        materials.landmarkSteel,
      );
      brace.position.set(0, 0.52 + h, z);
      group.add(brace);
    }
  }

  enableShadows(group);
  return group;
}

/**
 * 6. Composite 10-Part Photogrammetry Mapping Drone (RTK Quadcopter + 45° Oblique Camera Frustum)
 */
export function buildPhotogrammetryDrone(materials: TagumMaterialSet): {
  group: THREE.Group;
  rotors: THREE.Mesh[];
  frustum: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.name = 'Photogrammetry_RTK_Drone';

  // Aerodynamic central fuselage
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.16, 0.62),
    materials.droneBody,
  );
  group.add(body);

  // RTK GNSS dome mushroom antenna on top
  const rtkStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.14, 8),
    materials.landmarkSteel,
  );
  rtkStem.position.set(0, 0.14, -0.06);
  group.add(rtkStem);

  const rtkDome = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.1, 0.06, 14),
    materials.droneAccent,
  );
  rtkDome.position.set(0, 0.22, -0.06);
  group.add(rtkDome);

  // 4 angled arms + motor bells + spinning rotor discs
  const rotors: THREE.Mesh[] = [];
  const armAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const armGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.62, 8);
  armGeo.rotateZ(Math.PI / 2);
  const motorGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10);
  const rotorGeo = new THREE.CircleGeometry(0.28, 18);
  rotorGeo.rotateX(-Math.PI / 2);

  for (const ang of armAngles) {
    const arm = new THREE.Mesh(armGeo, materials.droneBody);
    arm.position.set(Math.cos(ang) * 0.32, 0.02, Math.sin(ang) * 0.32);
    arm.rotation.y = -ang;
    group.add(arm);

    const mx = Math.cos(ang) * 0.56;
    const mz = Math.sin(ang) * 0.56;
    const motor = new THREE.Mesh(motorGeo, materials.droneAccent);
    motor.position.set(mx, 0.06, mz);
    group.add(motor);

    const rotor = new THREE.Mesh(rotorGeo, materials.droneRotor);
    rotor.position.set(mx, 0.11, mz);
    group.add(rotor);
    rotors.push(rotor);
  }

  // Underside 45° oblique gimbal camera housing + glass lens
  const gimbal = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.14, 0.2),
    materials.landmarkSteel,
  );
  gimbal.position.set(0, -0.14, 0.14);
  gimbal.rotation.x = Math.PI * 0.25; // 45-degree oblique tilt
  group.add(gimbal);

  // Semi-transparent 45-degree oblique photogrammetry FOV frustum cone
  const frustumGeo = new THREE.ConeGeometry(1.45, 3.6, 4, 1, true);
  frustumGeo.rotateY(Math.PI / 4);
  frustumGeo.translate(0, -1.8, 0);
  const frustum = new THREE.Mesh(frustumGeo, materials.droneFrustum);
  frustum.position.set(0, -0.18, 0.16);
  frustum.rotation.x = -Math.PI * 0.18;
  group.add(frustum);

  return { group, rotors, frustum };
}
