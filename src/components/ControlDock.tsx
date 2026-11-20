import {
  BookOpen,
  Building2,
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  Globe,
  Layers,
  Loader2,
  Map as MapIcon,
  Printer,
  RefreshCw,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  ActiveLandmarkId,
  CAMERA_PRESETS,
  CameraPresetId,
  MaterialMode,
  PRINT_SCALE_SPECS,
  ScaleKey,
  TagumTileInfo,
} from '../data/tagumData';
import { TileOsmPayload } from '../scene/realGeoLoader';
import { StlExportResult } from '../scene/stlExporter';
import { GeoSyncStatus } from './TagumViewport';

type DockTab = 'map' | 'print';

interface ControlDockProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  materialMode: MaterialMode;
  onChangeMaterialMode: (mode: MaterialMode) => void;
  explodeAmount: number;
  onChangeExplodeAmount: (v: number) => void;
  verticalBoost: number;
  onChangeVerticalBoost: (v: number) => void;
  activeLandmarkId: ActiveLandmarkId | null;
  onClearLandmark: () => void;
  selectedTile: TagumTileInfo;
  selectedTileOsm: TileOsmPayload | null;
  loadedOsmCount: number;
  loadingTileIds: Set<string>;
  osmError: string | null;
  geoStatus: GeoSyncStatus;
  onLoadSelectedTileOsm: () => void;
  onLoadAllTilesOsm: () => void;
  loadingAllOsm: boolean;
  onSelectCamera: (preset: CameraPresetId) => void;
  onFocusSelectedTile: () => void;
  scaleKey: ScaleKey;
  onChangeScaleKey: (key: ScaleKey) => void;
  onExportSelectedStl: () => void;
  onExportCoreStl: () => void;
  lastExport: StlExportResult | null;
  onOpenFieldGuide: () => void;
}

export function ControlDock({
  collapsed,
  onToggleCollapsed,
  materialMode,
  onChangeMaterialMode,
  explodeAmount,
  onChangeExplodeAmount,
  verticalBoost,
  onChangeVerticalBoost,
  activeLandmarkId,
  onClearLandmark,
  selectedTile,
  selectedTileOsm,
  loadedOsmCount,
  loadingTileIds,
  osmError,
  geoStatus,
  onLoadSelectedTileOsm,
  onLoadAllTilesOsm,
  loadingAllOsm,
  onSelectCamera,
  onFocusSelectedTile,
  scaleKey,
  onChangeScaleKey,
  onExportSelectedStl,
  onExportCoreStl,
  lastExport,
  onOpenFieldGuide,
}: ControlDockProps) {
  const [activeTab, setActiveTab] = useState<DockTab>('map');

  const scaleSpec = PRINT_SCALE_SPECS.find((s) => s.key === scaleKey) ?? PRINT_SCALE_SPECS[3];
  const isSelectedLoading = loadingTileIds.has(selectedTile.id);

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
      style={{ width: 'min(1000px, 95vw)' }}
    >
      {/* Collapse / Expand Handle */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/15 bg-[#10151d]/94 text-xs font-medium text-slate-200 hover:text-white hover:border-amber-400/50 transition-colors shadow-lg whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
        title="Toggle control dock (H)"
      >
        {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{collapsed ? 'Show Controls' : 'Hide Controls'}</span>
        <span className="text-slate-500 font-mono-tabular ml-1">H</span>
      </button>

      {/* Main Collapsible Dock Container (No backdrop-filter over WebGL) */}
      <div
        className={`w-full rounded-xl border border-white/14 bg-[#10151d]/94 text-slate-100 shadow-2xl transition-all duration-200 ease-out origin-bottom overflow-hidden ${
          collapsed
            ? 'pointer-events-none opacity-0 translate-y-6 max-h-0 border-transparent'
            : 'pointer-events-auto opacity-100 translate-y-0 max-h-[380px]'
        }`}
      >
        {/* Top Bar Inside Dock */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'map'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Real Map & OSM</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('print')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'print'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>3D Print & STL</span>
            </button>
          </div>

          {/* Selected Tile Quiet Inline Readout (Zero Pills) */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300">
            <button
              type="button"
              onClick={onFocusSelectedTile}
              className="hover:text-amber-300 transition-colors font-medium text-white whitespace-nowrap shrink-0"
              title="Focus camera on selected tile"
            >
              Tile {selectedTile.id} · {selectedTile.barangay}
            </button>
            <span className="text-slate-600" aria-hidden="true">
              /
            </span>
            <span className="font-mono-tabular text-slate-400">
              {selectedTileOsm
                ? `${selectedTileOsm.stats.buildingCount.toLocaleString()} OSM bldgs · ${selectedTileOsm.stats.roadCount} roads`
                : isSelectedLoading || loadingAllOsm
                ? 'Streaming live OSM...'
                : 'Queued for OSM'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onLoadAllTilesOsm}
              disabled={loadingAllOsm || loadedOsmCount >= 16}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/35 bg-amber-500/12 hover:bg-amber-500/20 disabled:opacity-50 text-xs font-medium text-amber-200 transition-colors whitespace-nowrap shrink-0"
              title="Stream real OpenStreetMap buildings & roads for all 16 tiles"
            >
              {loadingAllOsm ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Layers className="w-3.5 h-3.5" />
              )}
              <span>
                {loadedOsmCount >= 16
                  ? 'All 16 OSM Tiles Loaded'
                  : loadingAllOsm
                  ? `Loading OSM (${loadedOsmCount}/16)`
                  : `Load All 16 OSM (${loadedOsmCount}/16)`}
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenFieldGuide}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Field Guide</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="px-4 py-3">
          {activeTab === 'map' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                {/* Exploded Interlocking Tile Grid Slider */}
                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="explode-slider" className="text-slate-300 font-medium">
                      Explode 16 Tiles
                    </label>
                    <span className="font-mono-tabular text-amber-400 font-medium">
                      {Math.round(explodeAmount * 100)}%
                    </span>
                  </div>
                  <input
                    id="explode-slider"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={explodeAmount}
                    onChange={(e) => onChangeExplodeAmount(parseFloat(e.target.value))}
                    className="studio-slider w-full"
                  />
                </div>

                {/* Vertical Building Boost Slider */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="boost-slider" className="text-slate-300 font-medium">
                      Height Boost
                    </label>
                    <span className="font-mono-tabular text-amber-400 font-medium">
                      {verticalBoost.toFixed(2)}×
                    </span>
                  </div>
                  <input
                    id="boost-slider"
                    type="range"
                    min={1.0}
                    max={2.5}
                    step={0.05}
                    value={verticalBoost}
                    onChange={(e) => onChangeVerticalBoost(parseFloat(e.target.value))}
                    className="studio-slider w-full"
                  />
                </div>

                {/* Surface Finish / Basemap Layer Selector */}
                <div className="md:col-span-5 flex flex-col gap-1.5">
                  <span className="text-xs text-slate-400 font-medium">
                    Real Map & Surface Layer
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'satelliteOsm', label: 'Satellite', swatch: '#3d5e43' },
                        { id: 'streetMapOsm', label: 'Street Map', swatch: '#cbd8e2' },
                        { id: 'architecturalPla', label: 'Matte PLA', swatch: '#ebe6dc' },
                        { id: 'lidarHypsometric', label: 'Real DEM', swatch: '#10b981' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onChangeMaterialMode(m.id)}
                        className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                          materialMode === m.id
                            ? 'border-amber-400 bg-amber-500/15 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-sm shrink-0 border border-black/30"
                          style={{ backgroundColor: m.swatch }}
                        />
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Jump-Only Landmark Inspector Status / Exit Action */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <span className="text-xs text-slate-400 font-medium">3D Landmark</span>
                  {activeLandmarkId ? (
                    <button
                      type="button"
                      onClick={onClearLandmark}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-amber-400/70 bg-amber-500/18 text-amber-200 hover:bg-amber-500/28 transition-colors whitespace-nowrap shrink-0"
                      title="Hide active 3D landmark and return to pure OpenStreetMap view"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Exit Landmark</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectCamera('cityHall')}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0"
                      title="Jump to a landmark below to reveal its photo-referenced 1:1 3D architecture"
                    >
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Jump to View</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Camera Presets + 8 Clickable Landmarks + Real Geo Status Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-1.5 overflow-x-auto studio-scroll pb-0.5 max-w-full flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap shrink-0 mr-0.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Jump</span>
                  </span>
                  {CAMERA_PRESETS.map((preset) => {
                    const isActiveLandmark =
                      Boolean(preset.landmarkId) && preset.landmarkId === activeLandmarkId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onSelectCamera(preset.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                          isActiveLandmark
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                            : preset.landmarkId
                            ? 'text-amber-100/90 bg-amber-500/10 hover:bg-amber-500/20 hover:text-white border-amber-400/25'
                            : 'text-slate-300 bg-white/5 hover:bg-white/12 hover:text-white border-white/8'
                        }`}
                        title={
                          preset.landmarkId
                            ? `Jump to ${preset.label} and reveal detailed 1:1 3D landmark`
                            : `Switch camera to ${preset.label}`
                        }
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-tabular shrink-0">
                  <span>
                    {geoStatus.demReady ? `DEM ${geoStatus.demRangeLabel}` : geoStatus.demRangeLabel}
                    {geoStatus.basemapReady && geoStatus.satTierLabel ? ` · ${geoStatus.satTierLabel}` : ''}
                  </span>
                  {osmError && (
                    <button
                      type="button"
                      onClick={onLoadSelectedTileOsm}
                      className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry OSM</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'print' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-xs text-slate-400 font-medium mr-1 whitespace-nowrap shrink-0">
                    200 mm Tile Scale
                  </span>
                  {PRINT_SCALE_SPECS.map((spec) => (
                    <button
                      key={spec.key}
                      type="button"
                      onClick={() => onChangeScaleKey(spec.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono-tabular font-medium border transition-colors whitespace-nowrap shrink-0 ${
                        scaleKey === spec.key
                          ? 'border-amber-400 bg-amber-500/18 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {spec.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onExportSelectedStl}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Tile {selectedTile.id} Real STL</span>
                  </button>
                  <button
                    type="button"
                    onClick={onExportCoreStl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/12 text-slate-100 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Export 4×4 Core STL</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-white/10 text-xs">
                <div>
                  <div className="text-slate-400">Ground / Tile</div>
                  <div className="font-mono-tabular text-slate-100 font-medium mt-0.5">
                    {scaleSpec.groundSideM} × {scaleSpec.groundSideM} m
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">4×4 km Core</div>
                  <div className="font-mono-tabular text-slate-100 font-medium mt-0.5">
                    {scaleSpec.coreTiles} tiles
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Full 195.8 km²</div>
                  <div className="font-mono-tabular text-slate-100 font-medium mt-0.5">
                    ~{scaleSpec.fullCityTiles.toLocaleString()} tiles
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">0.8 mm Wall Min</div>
                  <div className="font-mono-tabular text-amber-300 font-medium mt-0.5">
                    {scaleSpec.minFeatureM.toFixed(1)} m feature
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Tile {selectedTile.id} Geometry</div>
                  <div className="font-mono-tabular text-slate-100 font-medium mt-0.5">
                    {selectedTileOsm
                      ? `${selectedTileOsm.stats.buildingCount} real OSM`
                      : 'DEM Terrain'}
                  </div>
                </div>
              </div>

              {lastExport && (
                <div className="flex items-center justify-between text-xs text-emerald-300 bg-emerald-950/50 border border-emerald-500/25 rounded-lg px-3 py-1.5">
                  <span className="truncate">
                    Exported manifold binary STL:{' '}
                    <strong className="font-mono-tabular">{lastExport.filename}</strong>
                  </span>
                  <span className="font-mono-tabular shrink-0 ml-3 text-emerald-200">
                    {lastExport.triangleCount.toLocaleString()} tris ·{' '}
                    {(lastExport.byteSize / 1024).toFixed(0)} KB
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
