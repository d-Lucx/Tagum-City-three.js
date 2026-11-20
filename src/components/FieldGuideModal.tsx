import { Check, Copy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  buildPythonPipelineScript,
  GEOSPATIAL_DATASETS,
  PRINT_SCALE_SPECS,
  PrintScaleSpec,
  TAGUM_CITY_FACTS,
  TagumTileInfo,
} from '../data/tagumData';

type GuideSection = 'scales' | 'datasets' | 'pipeline';

interface FieldGuideModalProps {
  open: boolean;
  onClose: () => void;
  selectedScale: PrintScaleSpec;
  selectedTile: TagumTileInfo;
  verticalBoost: number;
}

export function FieldGuideModal({
  open,
  onClose,
  selectedScale,
  selectedTile,
  verticalBoost,
}: FieldGuideModalProps) {
  const [section, setSection] = useState<GuideSection>('scales');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const pythonScript = buildPythonPipelineScript(selectedScale, selectedTile, verticalBoost);

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(pythonScript);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Tagum City 3D Modeling and Printing Field Guide"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[86vh] flex flex-col rounded-xl border border-white/12 bg-[#111720] text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Tagum City 3D Modeling & Printing Field Guide
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {TAGUM_CITY_FACTS.areaKm2} km² · {TAGUM_CITY_FACTS.barangays} Barangays ·{' '}
              {TAGUM_CITY_FACTS.population2024.toLocaleString()} Residents (2024 Census) · Center{' '}
              {TAGUM_CITY_FACTS.centerLat}°N, {TAGUM_CITY_FACTS.centerLon}°E
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close field guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 px-6 py-2.5 border-b border-white/10 bg-[#0d1219] overflow-x-auto">
          {(
            [
              { id: 'scales', label: '01. Print Scales & Tiling' },
              { id: 'datasets', label: '02. Geospatial Datasets' },
              { id: 'pipeline', label: '03. Workflows & Python Script' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                section === tab.id
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/6'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto studio-scroll px-6 py-5 text-sm leading-relaxed text-slate-300">
          {section === 'scales' && (
            <div className="space-y-5">
              <p className="max-w-3xl text-slate-300">
                Partition Tagum City strictly by uniform spatial area (metric grid squares) rather
                than arbitrary file size so buildings are never sliced diagonally across joints.
                Assuming a modular <strong className="text-white">200 × 200 mm</strong> tile (fits
                220 × 220 mm and 256 × 256 mm FDM beds) with a 0.4 mm nozzle requiring at least{' '}
                <strong className="text-white">0.8 mm</strong> wall thickness:
              </p>

              <div className="overflow-x-auto border border-white/10 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400">
                      <th className="py-2.5 px-3 font-medium">Scale</th>
                      <th className="py-2.5 px-3 font-medium">Ground / 200 mm Tile</th>
                      <th className="py-2.5 px-3 font-medium">4 × 4 km Core</th>
                      <th className="py-2.5 px-3 font-medium">Full 195.8 km²</th>
                      <th className="py-2.5 px-3 font-medium">Min. Feature (0.8 mm)</th>
                      <th className="py-2.5 px-3 font-medium">10 m Bldg</th>
                      <th className="py-2.5 px-3 font-medium">Best Use Case</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {PRINT_SCALE_SPECS.map((row) => {
                      const active = row.key === selectedScale.key;
                      return (
                        <tr
                          key={row.key}
                          className={active ? 'bg-amber-500/12 text-white' : 'hover:bg-white/[0.02]'}
                        >
                          <td className="py-2.5 px-3 font-mono-tabular font-semibold text-amber-300 whitespace-nowrap">
                            {row.label}
                          </td>
                          <td className="py-2.5 px-3 font-mono-tabular whitespace-nowrap">
                            {row.groundAreaLabel}
                          </td>
                          <td className="py-2.5 px-3 font-mono-tabular whitespace-nowrap">
                            {row.coreTiles} tiles ({row.coreGridNote})
                          </td>
                          <td className="py-2.5 px-3 font-mono-tabular whitespace-nowrap">
                            ~{row.fullCityTiles.toLocaleString()} tiles
                          </td>
                          <td className="py-2.5 px-3 font-mono-tabular whitespace-nowrap">
                            {row.minFeatureM.toFixed(1)} m
                          </td>
                          <td className="py-2.5 px-3 font-mono-tabular whitespace-nowrap">
                            {row.tenMeterBuildingMm.toFixed(1)} mm
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{row.bestUseCase}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs text-slate-300">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-white">PC & Browser Streaming Strategy</h3>
                  <p>
                    Desktop editing tools like Blender hit 2.5M+ triangles across just 2.3 × 1.5 km
                    of dense city blocks. Work in 1 × 1 km tiles locally, or convert to{' '}
                    <strong className="text-white">OGC 3D Tiles</strong> for CesiumJS / deck.gl so
                    distant barangays stream coarse untextured LODs while near-camera blocks load
                    detailed meshes and baked texture atlases.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-white">Interlocking 4 mm Base Skirts</h3>
                  <p>
                    Printing the central 4 × 4 km Magugpo core at{' '}
                    <strong className="text-white">1:5,000</strong> produces 16 tiles (80 × 80 cm).
                    Adding a 4 mm-thick watertight baseplate with chamfered zipper joints locks
                    adjacent tiles mechanically across X/Y/Z axes without glue alignment drift.
                  </p>
                </div>
              </div>
            </div>
          )}

          {section === 'datasets' && (
            <div className="space-y-4">
              <p className="max-w-3xl text-slate-300">
                Tagum spans 0 m along the Davao Gulf to 1,167 m inland, with Magugpo center near
                24.0 m ASL. Combine <strong className="text-white">Overture Maps / OSM</strong> for
                roads and structures with{' '}
                <strong className="text-white">Google Open Buildings 2.5D Temporal</strong> height
                rasters and <strong className="text-white">Copernicus DEM GLO-30</strong> (or
                requested UP DREAM Phil-LiDAR / NAMRIA IfSAR) for terrain.
              </p>

              <div className="overflow-x-auto border border-white/10 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400">
                      <th className="py-2.5 px-3 font-medium">Dataset</th>
                      <th className="py-2.5 px-3 font-medium">Content & Resolution</th>
                      <th className="py-2.5 px-3 font-medium">Tagum Availability</th>
                      <th className="py-2.5 px-3 font-medium">Access & License</th>
                      <th className="py-2.5 px-3 font-medium">Key 3D Modeling Caveat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {GEOSPATIAL_DATASETS.map((ds) => (
                      <tr key={ds.name} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-semibold text-white align-top whitespace-nowrap">
                          {ds.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 align-top">{ds.resolution}</td>
                        <td className="py-2.5 px-3 text-slate-300 align-top">{ds.coverage}</td>
                        <td className="py-2.5 px-3 text-slate-400 align-top">{ds.license}</td>
                        <td className="py-2.5 px-3 text-slate-300 align-top">{ds.limitation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'pipeline' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div className="space-y-1.5 border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                  <h3 className="text-sm font-semibold text-white">Digital Rendering</h3>
                  <p>
                    <strong className="text-slate-100">Blender + Blosm:</strong> OSM buildings,
                    roads, and 30 m terrain with procedural facades.
                  </p>
                  <p>
                    <strong className="text-slate-100">QGIS + Qgis2threejs:</strong> Exports web
                    scenes and glTF (STL/OBJ removed in v2.0).
                  </p>
                  <p>
                    <strong className="text-slate-100">CesiumJS / deck.gl:</strong> Streams OGC 3D
                    Tiles across all 195.8 km².
                  </p>
                </div>

                <div className="space-y-1.5 border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                  <h3 className="text-sm font-semibold text-white">Watertight 3D Printing</h3>
                  <p>
                    <strong className="text-slate-100">Mini Skyline (miniskyline.com):</strong>{' '}
                    Recommended successor after map2model.com shutdown; exports multi-color tiled
                    3MF for Bambu/PrusaSlicer.
                  </p>
                  <p>
                    <strong className="text-slate-100">QGIS + DEMto3D:</strong> Turns Copernicus
                    GLO-30 or Phil-LiDAR GeoTIFF into solid manifold STLs.
                  </p>
                </div>

                <div className="space-y-1.5 border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                  <h3 className="text-sm font-semibold text-white">City-Scale Automation</h3>
                  <p>
                    <strong className="text-slate-100">osm_quick_3d (QGIS):</strong> Automatically
                    chunks Overpass downloads into 100 km² cached cells without timeouts.
                  </p>
                  <p>
                    <strong className="text-slate-100">lxie-leo/map2model:</strong> Self-hosted
                    FastAPI/Vue3 stack exporting layered GLBs with preserved TERRAIN/BUILDING nodes.
                  </p>
                </div>
              </div>

              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.04] border-b border-white/10">
                  <span className="text-xs font-medium text-slate-200">
                    Python Vector-to-STL Script — Pre-configured for Tile {selectedTile.id} (
                    {selectedTile.barangay}) at {selectedScale.label}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono-tabular text-slate-200 bg-[#0b0f16] overflow-x-auto leading-relaxed">
                  {pythonScript}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
