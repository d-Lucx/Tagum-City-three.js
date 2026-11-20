import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  DroneTargetId,
  DRONE_TARGETS,
  MaterialMode,
  PrintScaleSpec,
} from '../data/tagumData';
import { buildPhotogrammetryDrone } from '../scene/landmarks';
import { createTagumMaterials } from '../scene/materials';
import {
  loadRealCoreBasemapTextures,
  loadRealTagumDem,
  RealElevationSampler,
  TileOsmPayload,
} from '../scene/realGeoLoader';
import { exportTilesToBinaryStl, StlExportResult } from '../scene/stlExporter';
import { setActiveRealDem } from '../scene/terrainMath';
import { createProceduralTexturePack } from '../scene/textures';
import {
  buildCrosshatchWaypoints,
  buildTagumCityScene,
  TagumCityRig,
} from '../scene/tileBuilder';

export interface GeoSyncStatus {
  demReady: boolean;
  demRangeLabel: string;
  basemapReady: boolean;
  error?: string;
}

export interface TagumViewportHandle {
  flyToPreset: (presetId: CameraPresetId) => void;
  focusTile: (tileId: string) => void;
  applyOsmToTile: (tileId: string, payload: TileOsmPayload, verticalBoost: number) => void;
  exportTileStl: (tileId: string, scaleSpec: PrintScaleSpec) => StlExportResult | null;
  exportFullCoreStl: (scaleSpec: PrintScaleSpec) => StlExportResult | null;
}

interface TagumViewportProps {
  materialMode: MaterialMode;
  explodeAmount: number;
  verticalBoost: number;
  showHeroLandmarks: boolean;
  selectedTileId: string;
  onSelectTile: (tileId: string) => void;
  onHoverTile: (tileId: string | null) => void;
  onGeoStatusChange: (status: GeoSyncStatus) => void;
  droneActive: boolean;
  droneTarget: DroneTargetId;
  droneAltitudeM: number;
}

const _mouse = new THREE.Vector2();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _dronePos = new THREE.Vector3();
const _droneNextPos = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function getSkyPalette(mode: MaterialMode) {
  if (mode === 'satelliteOsm' || mode === 'streetMapOsm') {
    return {
      bg: mode === 'satelliteOsm' ? 0x1b242d : 0xc6d6e2,
      fogDensity: 0.0072,
      keyColor: 0xfff3de,
      keyIntensity: 2.2,
      hemiSky: mode === 'satelliteOsm' ? 0xa9c8e4 : 0xd0e4f5,
      hemiGround: mode === 'satelliteOsm' ? 0x3b4238 : 0x6b727a,
      hemiIntensity: 1.05,
      rimColor: 0xc2def5,
      rimIntensity: 0.52,
    };
  }
  if (mode === 'lidarHypsometric') {
    return {
      bg: 0x0b121c,
      fogDensity: 0.0088,
      keyColor: 0xfff4e0,
      keyIntensity: 1.9,
      hemiSky: 0x6ba7d6,
      hemiGround: 0x162230,
      hemiIntensity: 0.88,
      rimColor: 0x38bdf8,
      rimIntensity: 0.72,
    };
  }
  return {
    bg: 0x161c24,
    fogDensity: 0.0082,
    keyColor: 0xfff1dc,
    keyIntensity: 2.25,
    hemiSky: 0x9bb8d4,
    hemiGround: 0x2b2926,
    hemiIntensity: 0.92,
    rimColor: 0x8fb8de,
    rimIntensity: 0.65,
  };
}

export const TagumViewport = forwardRef<TagumViewportHandle, TagumViewportProps>(
  function TagumViewport(
    {
      materialMode,
      explodeAmount,
      verticalBoost,
      showHeroLandmarks,
      selectedTileId,
      onSelectTile,
      onHoverTile,
      onGeoStatusChange,
      droneActive,
      droneTarget,
      droneAltitudeM,
    },
    ref,
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [contextLost, setContextLost] = useState(false);

    const propsRef = useRef({
      materialMode,
      explodeAmount,
      verticalBoost,
      showHeroLandmarks,
      selectedTileId,
      onSelectTile,
      onHoverTile,
      onGeoStatusChange,
      droneActive,
      droneTarget,
      droneAltitudeM,
    });
    propsRef.current = {
      materialMode,
      explodeAmount,
      verticalBoost,
      showHeroLandmarks,
      selectedTileId,
      onSelectTile,
      onHoverTile,
      onGeoStatusChange,
      droneActive,
      droneTarget,
      droneAltitudeM,
    };

    const sceneApiRef = useRef<{
      cityRig: TagumCityRig;
      applyMode: (mode: MaterialMode) => void;
      updateBoost: (boost: number) => void;
      setShowLandmarks: (show: boolean) => void;
      updateDronePath: (active: boolean, target: DroneTargetId, altM: number) => void;
      flyTo: (pos: [number, number, number], target: [number, number, number]) => void;
      focusTile: (tileId: string) => void;
      requestRender: () => void;
    } | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        flyToPreset(presetId) {
          const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
          if (preset && sceneApiRef.current) {
            sceneApiRef.current.flyTo(preset.position, preset.target);
          }
        },
        focusTile(tileId) {
          sceneApiRef.current?.focusTile(tileId);
        },
        applyOsmToTile(tileId, payload, boost) {
          const api = sceneApiRef.current;
          if (!api) return;
          api.cityRig.applyRealOsmToTile(tileId, payload, boost);
          api.requestRender();
        },
        exportTileStl(tileId, scaleSpec) {
          const rig = sceneApiRef.current?.cityRig;
          if (!rig) return null;
          const tile = rig.tiles.find((t) => t.info.id === tileId);
          if (!tile) return null;
          return exportTilesToBinaryStl(
            [tile],
            scaleSpec,
            `${tile.info.id}_${tile.info.barangay.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
          );
        },
        exportFullCoreStl(scaleSpec) {
          const rig = sceneApiRef.current?.cityRig;
          if (!rig) return null;
          return exportTilesToBinaryStl(rig.tiles, scaleSpec, 'magugpo_4x4_core');
        },
      }),
      [],
    );

    useEffect(() => {
      sceneApiRef.current?.applyMode(materialMode);
    }, [materialMode]);

    useEffect(() => {
      sceneApiRef.current?.updateBoost(verticalBoost);
    }, [verticalBoost]);

    useEffect(() => {
      sceneApiRef.current?.setShowLandmarks(showHeroLandmarks);
    }, [showHeroLandmarks]);

    useEffect(() => {
      sceneApiRef.current?.requestRender();
    }, [explodeAmount, selectedTileId]);

    useEffect(() => {
      sceneApiRef.current?.updateDronePath(droneActive, droneTarget, droneAltitudeM);
    }, [droneActive, droneTarget, droneAltitudeM]);

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = detectSoftwareWebGL();
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const initialPalette = getSkyPalette(propsRef.current.materialMode);
      scene.background = new THREE.Color(initialPalette.bg);
      scene.fog = new THREE.FogExp2(initialPalette.bg, initialPalette.fogDensity);

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
      pmremGenerator.dispose();

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.25, 360);
      camera.position.set(24, 22, 28);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(-3, 0.5, -2);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.065;
      controls.maxPolarAngle = Math.PI * 0.475;
      controls.minDistance = 4.5;
      controls.maxDistance = 88;
      controls.panSpeed = 0.85;
      controls.rotateSpeed = 0.72;
      controls.update();

      const hemiLight = new THREE.HemisphereLight(
        initialPalette.hemiSky,
        initialPalette.hemiGround,
        initialPalette.hemiIntensity,
      );
      hemiLight.position.set(0, 50, 0);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(
        initialPalette.keyColor,
        initialPalette.keyIntensity,
      );
      keyLight.position.set(28, 38, 22);
      keyLight.castShadow = !isSoftwareGl;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 6;
      keyLight.shadow.camera.far = 115;
      const d = 30;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(
        initialPalette.rimColor,
        initialPalette.rimIntensity,
      );
      rimLight.position.set(-28, 20, -24);
      scene.add(rimLight);

      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const textures = createProceduralTexturePack(maxAniso);
      const materials = createTagumMaterials(textures, isSoftwareGl);
      const cityRig = buildTagumCityScene(
        materials,
        textures.contactShadowMap,
        textures.terrainGridMap,
      );
      scene.add(cityRig.horizonMesh);
      scene.add(cityRig.horizonWater);
      scene.add(cityRig.tilesRoot);

      const bedFloorGeo = new THREE.PlaneGeometry(54, 54);
      bedFloorGeo.rotateX(-Math.PI / 2);
      const bedFloorMat = new THREE.MeshBasicMaterial({
        map: textures.contactShadowMap,
        transparent: true,
        depthWrite: false,
        opacity: 0.4,
      });
      const bedFloor = new THREE.Mesh(bedFloorGeo, bedFloorMat);
      bedFloor.position.y = -1.04;
      scene.add(bedFloor);

      // Drone Photogrammetry Group
      const droneRoot = new THREE.Group();
      droneRoot.visible = false;
      const droneModel = buildPhotogrammetryDrone(materials);
      droneRoot.add(droneModel.group);

      const pathLineMat = new THREE.LineBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.9,
      });
      let pathLine: THREE.Line | null = null;
      let droneWaypoints: THREE.Vector3[] = [];
      let droneSegmentLengths: number[] = [];
      let droneTotalLength = 1;
      let droneProgressDist = 0;

      const gcpGroup = new THREE.Group();
      const gcpGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.07, 12);
      const gcpMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.5,
        roughness: 0.35,
      });
      droneRoot.add(gcpGroup);
      scene.add(droneRoot);

      const rebuildDronePath = (
        active: boolean,
        target: DroneTargetId,
        altM: number,
      ) => {
        droneRoot.visible = active;
        if (pathLine) {
          droneRoot.remove(pathLine);
          pathLine.geometry.dispose();
          pathLine = null;
        }
        while (gcpGroup.children.length > 0) {
          gcpGroup.remove(gcpGroup.children[0]);
        }

        droneWaypoints = buildCrosshatchWaypoints(target, altM);
        droneSegmentLengths = [];
        droneTotalLength = 0;
        for (let i = 0; i < droneWaypoints.length - 1; i++) {
          const len = droneWaypoints[i].distanceTo(droneWaypoints[i + 1]);
          droneSegmentLengths.push(len);
          droneTotalLength += len;
        }
        const geo = new THREE.BufferGeometry().setFromPoints(droneWaypoints);
        pathLine = new THREE.Line(geo, pathLineMat);
        droneRoot.add(pathLine);

        const minX = Math.min(...droneWaypoints.map((w) => w.x));
        const maxX = Math.max(...droneWaypoints.map((w) => w.x));
        const minZ = Math.min(...droneWaypoints.map((w) => w.z));
        const maxZ = Math.max(...droneWaypoints.map((w) => w.z));
        const cx = (minX + maxX) / 2;
        const cz = (minZ + maxZ) / 2;
        const gcpCoords: Array<[number, number]> = [
          [minX, minZ],
          [maxX, minZ],
          [maxX, maxZ],
          [minX, maxZ],
          [cx, cz + 2.2],
        ];
        for (const [gx, gz] of gcpCoords) {
          const marker = new THREE.Mesh(gcpGeo, gcpMat);
          marker.position.set(gx, 0.58, gz);
          gcpGroup.add(marker);
        }
        droneProgressDist = 0;
        requestRender();
      };

      const applyVisualMode = (mode: MaterialMode) => {
        materials.applyMode(mode);
        cityRig.updateVisualMode(mode);
        const pal = getSkyPalette(mode);
        (scene.background as THREE.Color).setHex(pal.bg);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(pal.bg);
          scene.fog.density = pal.fogDensity;
        }
        keyLight.color.setHex(pal.keyColor);
        keyLight.intensity = pal.keyIntensity;
        hemiLight.color.setHex(pal.hemiSky);
        hemiLight.groundColor.setHex(pal.hemiGround);
        hemiLight.intensity = pal.hemiIntensity;
        rimLight.color.setHex(pal.rimColor);
        rimLight.intensity = pal.rimIntensity;
        requestRender();
      };

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      let currentExplode = propsRef.current.explodeAmount;
      const tileLiftMap = new Map<string, number>();
      let hoveredTileId: string | null = null;
      let camTransitionActive = false;

      let frameId = 0;
      let renderBusy = false;
      let renderDirty = false;
      let disposed = false;
      let lastTime = performance.now();

      function afterDraw(cb: () => void) {
        if (disposed) return;
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      function stepScene(dt: number): boolean {
        let stillMoving = false;
        const { explodeAmount: targetExplode, selectedTileId: selId, droneActive: dActive } =
          propsRef.current;

        if (Math.abs(currentExplode - targetExplode) > 0.0008) {
          currentExplode = THREE.MathUtils.damp(currentExplode, targetExplode, 7.5, dt);
          stillMoving = true;
        } else {
          currentExplode = targetExplode;
        }

        const horizonOpacity = THREE.MathUtils.clamp(1 - currentExplode * 1.4, 0, 1);
        materials.horizonTerrain.opacity = horizonOpacity;
        cityRig.horizonMesh.visible = horizonOpacity > 0.02;
        cityRig.horizonWater.visible = horizonOpacity > 0.02;

        const spreadGap = currentExplode * 2.1;
        for (const tile of cityRig.tiles) {
          const offsetX = (tile.info.col - 1.5) * spreadGap;
          const offsetZ = (tile.info.row - 1.5) * spreadGap;

          const isSelected = tile.info.id === selId;
          const isHovered = tile.info.id === hoveredTileId;
          const targetLift = isSelected ? 0.36 : isHovered ? 0.14 : 0;
          const curLift = tileLiftMap.get(tile.info.id) ?? 0;
          let nextLift = curLift;
          if (Math.abs(curLift - targetLift) > 0.001) {
            nextLift = THREE.MathUtils.damp(curLift, targetLift, 9.0, dt);
            stillMoving = true;
          } else {
            nextLift = targetLift;
          }
          tileLiftMap.set(tile.info.id, nextLift);

          tile.group.position.set(tile.baseX + offsetX, nextLift, tile.baseZ + offsetZ);
          tile.selectionFrame.visible = isSelected || isHovered;
        }

        if (camTransitionActive) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 5.5, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 5.5, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 5.5, dt);

          controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, 5.5, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, 5.5, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, 5.5, dt);

          const posDist = camera.position.distanceTo(_camGoalPos);
          const tgtDist = controls.target.distanceTo(_camGoalTarget);
          if (posDist < 0.08 && tgtDist < 0.05) {
            camera.position.copy(_camGoalPos);
            controls.target.copy(_camGoalTarget);
            camTransitionActive = false;
          } else {
            stillMoving = true;
          }
        }

        if (dActive && droneWaypoints.length > 1) {
          stillMoving = true;
          const speedUnitsPerSec = 2.8;
          droneProgressDist = (droneProgressDist + speedUnitsPerSec * dt) % droneTotalLength;

          let acc = 0;
          let segIdx = 0;
          for (let i = 0; i < droneSegmentLengths.length; i++) {
            if (acc + droneSegmentLengths[i] >= droneProgressDist) {
              segIdx = i;
              break;
            }
            acc += droneSegmentLengths[i];
          }
          const segLen = Math.max(0.001, droneSegmentLengths[segIdx]);
          const localT = (droneProgressDist - acc) / segLen;
          const a = droneWaypoints[segIdx];
          const b = droneWaypoints[segIdx + 1];
          _dronePos.lerpVectors(a, b, localT);
          _droneNextPos.copy(b);

          const targetTileId = DRONE_TARGETS[propsRef.current.droneTarget].tileId;
          const underlyingTile = cityRig.tiles.find((t) => t.info.id === targetTileId);
          if (underlyingTile) {
            const tileDx = underlyingTile.group.position.x - underlyingTile.baseX;
            const tileDz = underlyingTile.group.position.z - underlyingTile.baseZ;
            const tileDy = underlyingTile.group.position.y;
            droneRoot.position.set(tileDx, tileDy, tileDz);
          }

          droneModel.group.position.copy(_dronePos);
          droneModel.group.lookAt(_droneNextPos.x, _dronePos.y, _droneNextPos.z);

          for (const rotor of droneModel.rotors) {
            rotor.rotation.y += dt * 28;
          }
        }

        return stillMoving;
      }

      function requestRender() {
        if (disposed) return;
        if (renderBusy) {
          renderDirty = true;
          return;
        }
        renderBusy = true;
        frameId = requestAnimationFrame(() => {
          if (disposed) return;
          renderDirty = false;
          const now = performance.now();
          const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
          lastTime = now;

          const activeAnim = stepScene(dt);
          const dampingMoved = controls.update();
          renderer.render(scene, camera);

          const done = () => {
            renderBusy = false;
            if (!disposed && (renderDirty || activeAnim || dampingMoved)) {
              requestRender();
            }
          };

          if (isSoftwareGl) {
            afterDraw(done);
          } else {
            done();
          }
        });
      }

      const onControlsStart = () => {
        camTransitionActive = false;
      };
      const onControlsChange = () => {
        requestRender();
      };
      controls.addEventListener('start', onControlsStart);
      controls.addEventListener('change', onControlsChange);

      const raycaster = new THREE.Raycaster();
      raycaster.layers.set(1);
      const hitboxes = cityRig.tiles.map((t) => t.hitboxMesh);

      let lastHoverCheck = 0;
      let pointerDownX = 0;
      let pointerDownY = 0;

      const updateMouseCoords = (ev: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        _mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        _mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      };

      const onPointerMove = (ev: PointerEvent) => {
        const now = performance.now();
        if (now - lastHoverCheck < 50) return;
        lastHoverCheck = now;

        updateMouseCoords(ev);
        raycaster.setFromCamera(_mouse, camera);
        const hits = raycaster.intersectObjects(hitboxes, false);
        const nextHover = hits.length > 0 ? String(hits[0].object.userData.tileId) : null;
        if (nextHover !== hoveredTileId) {
          hoveredTileId = nextHover;
          renderer.domElement.style.cursor = nextHover ? 'pointer' : 'grab';
          propsRef.current.onHoverTile(nextHover);
          requestRender();
        }
      };

      const onPointerDown = (ev: PointerEvent) => {
        pointerDownX = ev.clientX;
        pointerDownY = ev.clientY;
      };

      const onPointerUp = (ev: PointerEvent) => {
        const moved = Math.hypot(ev.clientX - pointerDownX, ev.clientY - pointerDownY);
        if (moved > 6) return;

        updateMouseCoords(ev);
        raycaster.setFromCamera(_mouse, camera);
        const hits = raycaster.intersectObjects(hitboxes, false);
        if (hits.length > 0) {
          const tileId = String(hits[0].object.userData.tileId);
          propsRef.current.onSelectTile(tileId);
          requestRender();
        }
      };

      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      const onContextLost = (e: Event) => {
        e.preventDefault();
        setContextLost(true);
      };
      const onContextRestored = () => {
        setContextLost(false);
        requestRender();
      };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

      const onResize = () => {
        if (!container || disposed) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      };
      window.addEventListener('resize', onResize);

      sceneApiRef.current = {
        cityRig,
        applyMode: applyVisualMode,
        updateBoost: (boost: number) => {
          cityRig.updateVerticalBoost(boost);
          requestRender();
        },
        setShowLandmarks: (show: boolean) => {
          cityRig.setShowHeroLandmarks(show);
          requestRender();
        },
        updateDronePath: rebuildDronePath,
        flyTo: (pos, target) => {
          _camGoalPos.set(pos[0], pos[1], pos[2]);
          _camGoalTarget.set(target[0], target[1], target[2]);
          camTransitionActive = true;
          requestRender();
        },
        focusTile: (tileId) => {
          const t = cityRig.tiles.find((entry) => entry.info.id === tileId);
          if (!t) return;
          const tx = t.group.position.x;
          const tz = t.group.position.z;
          _camGoalTarget.set(tx, 0.7, tz);
          _camGoalPos.set(tx + 8.5, 8.8, tz + 9.5);
          camTransitionActive = true;
          requestRender();
        },
        requestRender,
      };

      applyVisualMode(propsRef.current.materialMode);
      cityRig.setShowHeroLandmarks(propsRef.current.showHeroLandmarks);
      cityRig.updateVerticalBoost(propsRef.current.verticalBoost);
      rebuildDronePath(
        propsRef.current.droneActive,
        propsRef.current.droneTarget,
        propsRef.current.droneAltitudeM,
      );
      requestRender();

      // Stream live AWS Terrarium DEM elevation + real Esri Satellite & Carto OSM basemap tiles
      let demDone = false;
      let demLabel = 'Syncing DEM...';
      let baseDone = false;

      const emitStatus = (error?: string) => {
        if (disposed) return;
        propsRef.current.onGeoStatusChange({
          demReady: demDone,
          demRangeLabel: demLabel,
          basemapReady: baseDone,
          error,
        });
      };

      loadRealTagumDem()
        .then((sampler: RealElevationSampler) => {
          if (disposed) return;
          setActiveRealDem(sampler);
          cityRig.applyRealElevationToAllTiles();
          demDone = true;
          demLabel = `${sampler.minElevM}–${sampler.maxElevM} m ASL`;
          emitStatus();
          requestRender();
        })
        .catch(() => {
          if (disposed) return;
          demLabel = 'Approx. elevation';
          emitStatus('Real DEM tiles unreachable; using topographic fallback');
        });

      Promise.all([
        loadRealCoreBasemapTextures('satellite', maxAniso),
        loadRealCoreBasemapTextures('osm', maxAniso),
      ])
        .then(([satMap, osmMap]) => {
          if (disposed) return;
          cityRig.applyBasemapTextures(satMap, osmMap, propsRef.current.materialMode);
          baseDone = true;
          emitStatus();
          requestRender();
        })
        .catch(() => {
          if (disposed) return;
          emitStatus('Basemap tiles unreachable; using grid overlay');
        });

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        sceneApiRef.current = null;
        setActiveRealDem(null);

        window.removeEventListener('resize', onResize);
        controls.removeEventListener('start', onControlsStart);
        controls.removeEventListener('change', onControlsChange);
        controls.dispose();

        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

        if (pathLine) pathLine.geometry.dispose();
        pathLineMat.dispose();
        gcpGeo.dispose();
        gcpMat.dispose();
        bedFloorGeo.dispose();
        bedFloorMat.dispose();
        envTexture.dispose();
        cityRig.dispose();
        materials.dispose();
        textures.dispose();
        renderer.dispose();

        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    return (
      <div className="relative w-full h-full">
        <div
          ref={mountRef}
          className="w-full h-full outline-none"
          aria-label="Geographically accurate interactive 3D map and city model of Tagum City"
        />
        {contextLost && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1117] text-slate-200 p-6">
            <div className="max-w-md border border-slate-700 bg-[#141a23] p-6 rounded-xl">
              <h2 className="text-base font-semibold text-white">WebGL Context Paused</h2>
              <p className="mt-2 text-sm text-slate-400">
                The browser graphics context was interrupted. Reload the page or restore the window
                to resume the 3D Tagum City viewport.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  },
);
