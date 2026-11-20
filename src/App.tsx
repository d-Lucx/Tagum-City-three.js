import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlDock } from './components/ControlDock';
import { FieldGuideModal } from './components/FieldGuideModal';
import { GeoSyncStatus, TagumViewport, TagumViewportHandle } from './components/TagumViewport';
import {
  ActiveLandmarkId,
  CAMERA_PRESETS,
  CameraPresetId,
  MaterialMode,
  PRINT_SCALE_SPECS,
  ScaleKey,
  TAGUM_CITY_FACTS,
  TAGUM_TILES,
  VERIFIED_LANDMARKS,
} from './data/tagumData';
import { fetchRealOsmForTile, TileOsmPayload } from './scene/realGeoLoader';
import { StlExportResult } from './scene/stlExporter';

export default function App() {
  const viewportRef = useRef<TagumViewportHandle | null>(null);

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Start in Real Satellite + Live OpenStreetMap 3D mode with 0% tile explode!
  const [materialMode, setMaterialMode] = useState<MaterialMode>('satelliteOsm');
  const [explodeAmount, setExplodeAmount] = useState<number>(0);
  const [verticalBoost, setVerticalBoost] = useState<number>(1.35);
  // Jump-only landmark reveal: null on startup so pure real OSM footprints display until jumped to
  const [activeLandmarkId, setActiveLandmarkId] = useState<ActiveLandmarkId | null>(null);

  // Default to B2 — Magugpo Poblacion (Freedom Park, Trade Center, Rizal St, dense downtown OSM footprints!)
  const [selectedTileId, setSelectedTileId] = useState<string>('B2');
  const [hoveredTileId, setHoveredTileId] = useState<string | null>(null);

  const [scaleKey, setScaleKey] = useState<ScaleKey>('1:5000');
  const [lastExport, setLastExport] = useState<StlExportResult | null>(null);

  // Live OpenStreetMap per-tile cache & loading state
  const [osmByTile, setOsmByTile] = useState<Record<string, TileOsmPayload>>({});
  const [loadingTileIds, setLoadingTileIds] = useState<Set<string>>(() => new Set());
  const [loadingAllOsm, setLoadingAllOsm] = useState<boolean>(false);
  const [osmError, setOsmError] = useState<string | null>(null);

  const [geoStatus, setGeoStatus] = useState<GeoSyncStatus>({
    demReady: false,
    demRangeLabel: 'Syncing DEM...',
    basemapReady: false,
  });

  const verticalBoostRef = useRef(verticalBoost);
  verticalBoostRef.current = verticalBoost;

  const osmLoadedRef = useRef<Set<string>>(new Set());
  const osmInFlightRef = useRef<Set<string>>(new Set());

  const selectedTile = useMemo(
    () => TAGUM_TILES.find((t) => t.id === selectedTileId) ?? TAGUM_TILES[5],
    [selectedTileId],
  );
  const hoveredTile = useMemo(
    () => (hoveredTileId ? TAGUM_TILES.find((t) => t.id === hoveredTileId) ?? null : null),
    [hoveredTileId],
  );
  const selectedScale = useMemo(
    () => PRINT_SCALE_SPECS.find((s) => s.key === scaleKey) ?? PRINT_SCALE_SPECS[3],
    [scaleKey],
  );
  const activeLandmark = useMemo(
    () =>
      activeLandmarkId
        ? VERIFIED_LANDMARKS.find((l) => l.id === activeLandmarkId) ?? null
        : null,
    [activeLandmarkId],
  );

  const loadOsmTile = useCallback(async (tileId: string, force = false) => {
    if (!force && (osmLoadedRef.current.has(tileId) || osmInFlightRef.current.has(tileId))) {
      return;
    }
    const tile = TAGUM_TILES.find((t) => t.id === tileId);
    if (!tile) return;

    osmInFlightRef.current.add(tileId);
    setLoadingTileIds((prev) => new Set(prev).add(tileId));
    setOsmError(null);

    try {
      const payload = await fetchRealOsmForTile(tile.col, tile.row);
      osmLoadedRef.current.add(tileId);
      setOsmByTile((prev) => ({ ...prev, [tileId]: payload }));
      viewportRef.current?.applyOsmToTile(tileId, payload, verticalBoostRef.current);
    } catch (err) {
      setOsmError(err instanceof Error ? err.message : 'OSM Overpass request failed');
    } finally {
      osmInFlightRef.current.delete(tileId);
      setLoadingTileIds((prev) => {
        const next = new Set(prev);
        next.delete(tileId);
        return next;
      });
    }
  }, []);

  // Automatically load the 4 core downtown Tagum tiles on startup (B2, C2, A3, D3) so real buildings appear immediately!
  useEffect(() => {
    const initialPriorityTiles = ['B2', 'C2', 'A3', 'D3'];
    let cancelled = false;

    const runInitial = async () => {
      for (const id of initialPriorityTiles) {
        if (cancelled) return;
        await loadOsmTile(id);
      }
    };
    runInitial();

    return () => {
      cancelled = true;
    };
  }, [loadOsmTile]);

  // Auto-load real OSM whenever the user clicks a tile that hasn't been fetched yet
  useEffect(() => {
    loadOsmTile(selectedTileId);
  }, [selectedTileId, loadOsmTile]);

  // Batch chunked loader for all 16 tiles (mirrors osm_quick_3d chunked workflow!)
  const handleLoadAllTilesOsm = async () => {
    if (loadingAllOsm) return;
    setLoadingAllOsm(true);
    try {
      for (const tile of TAGUM_TILES) {
        if (!osmLoadedRef.current.has(tile.id)) {
          await loadOsmTile(tile.id);
        }
      }
    } finally {
      setLoadingAllOsm(false);
    }
  };

  // Keyboard shortcut 'H' to toggle Zen/Cinema mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (guideOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [guideOpen]);

  const handleSelectCamera = (presetId: CameraPresetId) => {
    const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
    if (preset?.landmarkId) {
      const lm = VERIFIED_LANDMARKS.find((l) => l.id === preset.landmarkId);
      setActiveLandmarkId(preset.landmarkId);
      setExplodeAmount(0);
      if (lm) setSelectedTileId(lm.tileId);
      viewportRef.current?.flyToPreset(presetId);
      return;
    }

    // Jumping to overview / topGrid / printBed clears active 3D landmarks back to pure OSM view
    setActiveLandmarkId(null);
    if (presetId === 'printBed') {
      setExplodeAmount(0.82);
    } else if (presetId === 'overview' && explodeAmount > 0.01) {
      setExplodeAmount(0);
    }
    viewportRef.current?.flyToPreset(presetId);
  };

  const handleClearLandmark = () => {
    setActiveLandmarkId(null);
    setExplodeAmount(0);
    viewportRef.current?.flyToPreset('overview');
  };

  const handleSelectTile = (tileId: string) => {
    // Avoid snapping away if clicking the ground of the tile whose landmark is actively being inspected
    if (activeLandmark && activeLandmark.tileId === tileId) {
      return;
    }
    if (activeLandmarkId) {
      setActiveLandmarkId(null);
    }
    setSelectedTileId(tileId);
    viewportRef.current?.focusTile(tileId);
  };

  const handleExportSelectedStl = () => {
    const result = viewportRef.current?.exportTileStl(selectedTile.id, selectedScale);
    if (result) setLastExport(result);
  };

  const handleExportCoreStl = () => {
    const result = viewportRef.current?.exportFullCoreStl(selectedScale);
    if (result) setLastExport(result);
  };

  const selectedTileOsm = osmByTile[selectedTile.id] ?? null;
  const loadedOsmCount = Object.keys(osmByTile).length;

  const namedSampleText = selectedTileOsm?.stats.namedSample
    ?.slice(0, 3)
    .map((n) => n.name)
    .join(' · ');

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-[#0d1117]">
      {/* Full-Bleed 100vw x 100vh Geographically Referenced Three.js Viewport */}
      <TagumViewport
        ref={viewportRef}
        materialMode={materialMode}
        explodeAmount={explodeAmount}
        verticalBoost={verticalBoost}
        activeLandmarkId={activeLandmarkId}
        selectedTileId={selectedTileId}
        onSelectTile={handleSelectTile}
        onHoverTile={(id) => setHoveredTileId(id)}
        onGeoStatusChange={setGeoStatus}
      />

      {/* Minimal Top-Left Real-World Geospatial Header (Zero-Pill, No Backdrop Filter) */}
      <header className="fixed top-4 left-4 z-10 pointer-events-none px-4 py-2.5 rounded-xl border border-white/14 bg-[#10151d]/90 text-slate-100 max-w-[min(560px,92vw)]">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white leading-tight">
            {activeLandmark ? activeLandmark.name : 'Tagum City 3D'}
          </h1>
          <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
            WGS84{' '}
            {(activeLandmark ? activeLandmark.lat : selectedTile.latCenter).toFixed(4)}°N,{' '}
            {(activeLandmark ? activeLandmark.lon : selectedTile.lonCenter).toFixed(4)}°E
          </span>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-300 font-mono-tabular">
          <span>{activeLandmark ? '1:1 Photo-Referenced Landmark' : 'Live OpenStreetMap + Real DEM'}</span>
          <span className="text-slate-500" aria-hidden="true">
            ·
          </span>
          <span>{activeLandmark ? `Tile ${activeLandmark.tileId} · ${activeLandmark.barangay}` : `${TAGUM_CITY_FACTS.areaKm2} km²`}</span>
          {!activeLandmark && (
            <>
              <span className="text-slate-500" aria-hidden="true">
                ·
              </span>
              <span>4×4 km Core ({selectedScale.label})</span>
            </>
          )}
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[11px]">
          {activeLandmark ? (
            <span className="text-amber-300/95 leading-snug block">
              {activeLandmark.architecturalNotes}
            </span>
          ) : hoveredTile ? (
            <span className="text-amber-300">
              Click Tile {hoveredTile.id} — {hoveredTile.barangay}
              {hoveredTile.landmarkName ? ` (${hoveredTile.landmarkName})` : ''}
            </span>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className="text-amber-300">
                Tile {selectedTile.id} · {selectedTile.barangay}
                {selectedTile.landmarkName ? ` — ${selectedTile.landmarkName}` : ''}
              </span>
              {namedSampleText ? (
                <span className="text-slate-400 truncate">
                  OSM Structures: {namedSampleText}
                </span>
              ) : loadingTileIds.has(selectedTile.id) ? (
                <span className="text-slate-400">Streaming live OSM footprints & roads...</span>
              ) : null}
            </div>
          )}
        </div>
      </header>

      {/* Unified Collapsible Bottom Control Dock */}
      <ControlDock
        collapsed={dockCollapsed}
        onToggleCollapsed={() => setDockCollapsed((c) => !c)}
        materialMode={materialMode}
        onChangeMaterialMode={setMaterialMode}
        explodeAmount={explodeAmount}
        onChangeExplodeAmount={setExplodeAmount}
        verticalBoost={verticalBoost}
        onChangeVerticalBoost={setVerticalBoost}
        activeLandmarkId={activeLandmarkId}
        onClearLandmark={handleClearLandmark}
        selectedTile={selectedTile}
        selectedTileOsm={selectedTileOsm}
        loadedOsmCount={loadedOsmCount}
        loadingTileIds={loadingTileIds}
        osmError={osmError}
        geoStatus={geoStatus}
        onLoadSelectedTileOsm={() => loadOsmTile(selectedTile.id, true)}
        onLoadAllTilesOsm={handleLoadAllTilesOsm}
        loadingAllOsm={loadingAllOsm}
        onSelectCamera={handleSelectCamera}
        onFocusSelectedTile={() => viewportRef.current?.focusTile(selectedTile.id)}
        scaleKey={scaleKey}
        onChangeScaleKey={setScaleKey}
        onExportSelectedStl={handleExportSelectedStl}
        onExportCoreStl={handleExportCoreStl}
        lastExport={lastExport}
        onOpenFieldGuide={() => setGuideOpen(true)}
      />

      {/* On-Demand Engineering Field Guide & Python Pipeline Modal */}
      <FieldGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        selectedScale={selectedScale}
        selectedTile={selectedTile}
        verticalBoost={verticalBoost}
      />
    </main>
  );
}
