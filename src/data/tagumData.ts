import { getTileBBox, latLonToScene, tileCenterScene } from '../scene/geoProjection';

export type MaterialMode =
  | 'satelliteOsm'
  | 'streetMapOsm'
  | 'architecturalPla'
  | 'lidarHypsometric';

export type ActiveLandmarkId =
  | 'freedomPark'
  | 'cityHall'
  | 'cathedral'
  | 'gaisanoMall'
  | 'robinsonsPlace'
  | 'big8Hotel'
  | 'tradeCenter'
  | 'incTagum';

export type CameraPresetId =
  | 'overview'
  | 'freedomPark'
  | 'cityHall'
  | 'cathedral'
  | 'gaisanoMall'
  | 'robinsonsPlace'
  | 'big8Hotel'
  | 'tradeCenter'
  | 'incTagum'
  | 'topGrid'
  | 'printBed';

export type ScaleKey = '1:1000' | '1:2000' | '1:2500' | '1:5000' | '1:10000';

export interface VerifiedLandmark {
  id: ActiveLandmarkId;
  name: string;
  tileId: string;
  lat: number;
  lon: number;
  barangay: string;
  architecturalNotes: string;
  osmMatchPattern: RegExp;
  footprintRadiusScene: number;
}

export interface TagumTileInfo {
  id: string;
  col: number; // 0..3 (West to East)
  row: number; // 0..3 (North to South)
  barangay: string;
  zoneType: 'civic' | 'cathedral' | 'commercial' | 'residential' | 'river' | 'coastal' | 'upland';
  latCenter: number;
  lonCenter: number;
  bbox: { south: number; west: number; north: number; east: number };
  avgElevationM: number;
  buildingCount: number;
  estFilamentG: number;
  estPrintHours: number;
  landmarkId?: ActiveLandmarkId;
  landmarkName?: string;
  landmarkSummary?: string;
}

export interface PrintScaleSpec {
  key: ScaleKey;
  ratio: number;
  label: string;
  groundAreaLabel: string;
  groundSideM: number;
  coreTiles: number;
  coreGridNote: string;
  fullCityTiles: number;
  minFeatureM: number;
  tenMeterBuildingMm: number;
  bestUseCase: string;
  recommendedBoost: string;
}

export interface GeospatialDataset {
  name: string;
  resolution: string;
  coverage: string;
  license: string;
  limitation: string;
}

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  landmarkId?: ActiveLandmarkId;
}

export const TAGUM_CITY_FACTS = {
  name: 'Tagum City',
  province: 'Davao del Norte',
  areaKm2: 195.8,
  barangays: 23,
  population2024: 300042,
  centerLat: 7.445,
  centerLon: 125.812,
  centerElevationM: 24.0,
  minElevationM: 0,
  maxElevationM: 1167,
  dvoAirportDistanceKm: 40.0,
  coreAreaKm: 4,
};

// Exact OSM-measured centroids, footprints, and photo-referenced architectural summaries
export const VERIFIED_LANDMARKS: VerifiedLandmark[] = [
  {
    id: 'freedomPark',
    name: 'Tagum City Historical & Cultural Center & Freedom Park',
    tileId: 'B2',
    lat: 7.44759,
    lon: 125.80412,
    barangay: 'Magugpo Poblacion',
    architecturalNotes:
      'Inaugurated 2021 · Contemporary white arched colonnade along Rizal St, Tagumpay Theater & Freedom Park plaza (64 × 36 m)',
    osmMatchPattern: /Historical & Cultural Center/i,
    footprintRadiusScene: 0.44,
  },
  {
    id: 'gaisanoMall',
    name: 'Gaisano Mall of Tagum',
    tileId: 'C2',
    lat: 7.44929,
    lon: 125.81203,
    barangay: 'Magugpo East / Briz',
    architecturalNotes:
      'Dual-building commercial hub (Buildings A & B) linked by an elevated glazed skybridge along Daang Maharlika',
    osmMatchPattern: /^Gaisano Mall of Tagum$/i,
    footprintRadiusScene: 1.15,
  },
  {
    id: 'cathedral',
    name: 'Christ the King Cathedral',
    tileId: 'A3',
    lat: 7.44102,
    lon: 125.79995,
    barangay: 'Magugpo West',
    architecturalNotes:
      'Medieval castle-fortress cathedral (1993–2005) with twin crenellated towers, Kublai fountain & 85.5 m Wooden Rosary Garden',
    osmMatchPattern: /Christ the King Cathedral/i,
    footprintRadiusScene: 0.45,
  },
  {
    id: 'cityHall',
    name: 'New Tagum City Hall',
    tileId: 'D3',
    lat: 7.4408,
    lon: 125.82648,
    barangay: 'Apokon Civic Center',
    architecturalNotes:
      'Designed by Sol Flores · Contemporary steel-and-glass executive & legislative wings with sweeping curved atrium roof (114 × 81 m)',
    osmMatchPattern: /^City Hall of Tagum$/i,
    footprintRadiusScene: 0.72,
  },
  {
    id: 'robinsonsPlace',
    name: 'Robinsons Place Tagum',
    tileId: 'A4',
    lat: 7.42958,
    lon: 125.79719,
    barangay: 'Visayan Village West',
    architecturalNotes:
      'Designed by Jonathan O. Gan · "Green City Malling" 3-level complex with clerestory glass atrium, blue/orange fascia & 6 m illuminated Supertrees',
    osmMatchPattern: /Robinsons Place Tagum/i,
    footprintRadiusScene: 1.05,
  },
  {
    id: 'big8Hotel',
    name: 'Big 8 Corporate Hotel',
    tileId: 'B3',
    lat: 7.44168,
    lon: 125.80618,
    barangay: 'Magugpo South',
    architecturalNotes:
      'Flagship 8-storey modern neo-classical luxury hotel along National Highway with vertical pilasters, crowned cornice & resort pool deck',
    osmMatchPattern: /Big 8 Corporate Hotel/i,
    footprintRadiusScene: 0.62,
  },
  {
    id: 'tradeCenter',
    name: 'Tagum City Trade & Cultural Center Pavilion',
    tileId: 'B2',
    lat: 7.44934,
    lon: 125.80408,
    barangay: 'Magugpo Poblacion',
    architecturalNotes:
      'Expansive tropical wide-span arched steel-truss trade halls and civic pavilion along Quezon Street north of Freedom Park (52 × 108 m)',
    osmMatchPattern: /^(Cultural Center|Trade and|Tagum City Pavillion)/i,
    footprintRadiusScene: 0.56,
  },
  {
    id: 'incTagum',
    name: 'Iglesia ni Cristo — Locale of Tagum City',
    tileId: 'D4',
    lat: 7.42773,
    lon: 125.8254,
    barangay: 'Apokon South',
    architecturalNotes:
      'Iconic pristine white & sage neo-Gothic house of worship crowned by towering slender vertical spires, lancet windows & grand sanctuary steps',
    osmMatchPattern: /Iglesia ni Cristo/i,
    footprintRadiusScene: 0.42,
  },
];

export const PRINT_SCALE_SPECS: PrintScaleSpec[] = [
  {
    key: '1:1000',
    ratio: 1000,
    label: '1:1,000',
    groundAreaLabel: '200 × 200 m (0.04 km²)',
    groundSideM: 200,
    coreTiles: 400,
    coreGridNote: '20 × 20 grid (4.0 × 4.0 m)',
    fullCityTiles: 4895,
    minFeatureM: 0.8,
    tenMeterBuildingMm: 10.0,
    bestUseCase: 'Single landmark, civic center, or school campus',
    recommendedBoost: '1.0× (true scale)',
  },
  {
    key: '1:2000',
    ratio: 2000,
    label: '1:2,000',
    groundAreaLabel: '400 × 400 m (0.16 km²)',
    groundSideM: 400,
    coreTiles: 100,
    coreGridNote: '10 × 10 grid (2.0 × 2.0 m)',
    fullCityTiles: 1224,
    minFeatureM: 1.6,
    tenMeterBuildingMm: 5.0,
    bestUseCase: 'Detailed downtown block series (Magugpo Poblacion)',
    recommendedBoost: '1.0×–1.15×',
  },
  {
    key: '1:2500',
    ratio: 2500,
    label: '1:2,500',
    groundAreaLabel: '500 × 500 m (0.25 km²)',
    groundSideM: 500,
    coreTiles: 64,
    coreGridNote: '8 × 8 grid (1.6 × 1.6 m)',
    fullCityTiles: 783,
    minFeatureM: 2.0,
    tenMeterBuildingMm: 4.0,
    bestUseCase: 'Multi-block urban corridor display',
    recommendedBoost: '1.1×–1.25×',
  },
  {
    key: '1:5000',
    ratio: 5000,
    label: '1:5,000',
    groundAreaLabel: '1,000 × 1,000 m (1.00 km²)',
    groundSideM: 1000,
    coreTiles: 16,
    coreGridNote: '4 × 4 grid (80 × 80 cm)',
    fullCityTiles: 196,
    minFeatureM: 4.0,
    tenMeterBuildingMm: 2.0,
    bestUseCase: 'Balanced Magugpo urban core wall or table display',
    recommendedBoost: '1.2×–1.5× vertical',
  },
  {
    key: '1:10000',
    ratio: 10000,
    label: '1:10,000',
    groundAreaLabel: '2,000 × 2,000 m (4.00 km²)',
    groundSideM: 2000,
    coreTiles: 4,
    coreGridNote: '2 × 2 grid (40 × 40 cm)',
    fullCityTiles: 49,
    minFeatureM: 8.0,
    tenMeterBuildingMm: 1.0,
    bestUseCase: 'Whole-city overview (requires building height/width boost)',
    recommendedBoost: '1.6×–2.2× vertical',
  },
];

const COL_LETTERS = ['A', 'B', 'C', 'D'] as const;

const RAW_TILE_META: Array<{
  col: number;
  row: number;
  barangay: string;
  zoneType: TagumTileInfo['zoneType'];
  avgElevationM: number;
  estFilamentG: number;
  estPrintHours: number;
}> = [
  { col: 0, row: 0, barangay: 'Mankilam North', zoneType: 'residential', avgElevationM: 25, estFilamentG: 112, estPrintHours: 4.6 },
  { col: 1, row: 0, barangay: 'Magugpo North', zoneType: 'commercial', avgElevationM: 27, estFilamentG: 126, estPrintHours: 5.2 },
  { col: 2, row: 0, barangay: 'La Filipina South', zoneType: 'upland', avgElevationM: 38, estFilamentG: 138, estPrintHours: 5.7 },
  { col: 3, row: 0, barangay: 'San Miguel West', zoneType: 'upland', avgElevationM: 52, estFilamentG: 152, estPrintHours: 6.1 },

  { col: 0, row: 1, barangay: 'Magugpo West North', zoneType: 'residential', avgElevationM: 21, estFilamentG: 122, estPrintHours: 5.1 },
  { col: 1, row: 1, barangay: 'Magugpo Poblacion', zoneType: 'civic', avgElevationM: 24, estFilamentG: 146, estPrintHours: 6.4 },
  { col: 2, row: 1, barangay: 'Magugpo East / Briz', zoneType: 'commercial', avgElevationM: 28, estFilamentG: 136, estPrintHours: 5.7 },
  { col: 3, row: 1, barangay: 'Apokon North', zoneType: 'residential', avgElevationM: 35, estFilamentG: 124, estPrintHours: 5.1 },

  { col: 0, row: 2, barangay: 'Magugpo West', zoneType: 'cathedral', avgElevationM: 20, estFilamentG: 134, estPrintHours: 5.8 },
  { col: 1, row: 2, barangay: 'Magugpo South', zoneType: 'commercial', avgElevationM: 21, estFilamentG: 132, estPrintHours: 5.6 },
  { col: 2, row: 2, barangay: 'Apokon West', zoneType: 'residential', avgElevationM: 25, estFilamentG: 120, estPrintHours: 4.9 },
  { col: 3, row: 2, barangay: 'Apokon Civic Center', zoneType: 'civic', avgElevationM: 30, estFilamentG: 142, estPrintHours: 6.2 },

  { col: 0, row: 3, barangay: 'Visayan Village West', zoneType: 'commercial', avgElevationM: 15, estFilamentG: 118, estPrintHours: 4.8 },
  { col: 1, row: 3, barangay: 'Visayan Village East', zoneType: 'residential', avgElevationM: 16, estFilamentG: 110, estPrintHours: 4.5 },
  { col: 2, row: 3, barangay: 'Apokon South', zoneType: 'river', avgElevationM: 18, estFilamentG: 104, estPrintHours: 4.3 },
  { col: 3, row: 3, barangay: 'Apokon / Energy Park N.', zoneType: 'residential', avgElevationM: 22, estFilamentG: 108, estPrintHours: 4.4 },
];

export const TAGUM_TILES: TagumTileInfo[] = RAW_TILE_META.map((m) => {
  const id = `${COL_LETTERS[m.col]}${m.row + 1}`;
  const bbox = getTileBBox(m.col, m.row);
  const landmark = VERIFIED_LANDMARKS.find((l) => l.tileId === id);
  return {
    id,
    col: m.col,
    row: m.row,
    barangay: m.barangay,
    zoneType: m.zoneType,
    latCenter: (bbox.south + bbox.north) / 2,
    lonCenter: (bbox.west + bbox.east) / 2,
    bbox,
    avgElevationM: m.avgElevationM,
    buildingCount: 0,
    estFilamentG: m.estFilamentG,
    estPrintHours: m.estPrintHours,
    landmarkId: landmark?.id,
    landmarkName: landmark?.name,
    landmarkSummary: landmark?.architecturalNotes,
  };
});

export function getTileInfoByGrid(col: number, row: number): TagumTileInfo {
  const id = `${COL_LETTERS[col]}${row + 1}`;
  return TAGUM_TILES.find((t) => t.id === id) ?? TAGUM_TILES[0];
}

export const GEOSPATIAL_DATASETS: GeospatialDataset[] = [
  {
    name: 'OpenStreetMap (OSM) — Live Active',
    resolution: 'Real vector building footprints, roads, waterways & tags',
    coverage: 'Live OSM 0.6 REST API query per 1 km × 1 km Tagum tile',
    license: 'ODbL · Live via /api/geo/osm proxy',
    limitation: 'Height tags are sparse outside Magugpo center; fallback height rules applied',
  },
  {
    name: 'AWS Mapzen Terrarium DEM — Live Active',
    resolution: 'Global elevation mosaic (~30 m Copernicus / SRTM derived)',
    coverage: 'Live RGB-encoded elevation PNG tiles across Greater Tagum',
    license: 'Open public AWS S3 terrain tiles',
    limitation: '30 m spacing smooths minor drainage canals; request Phil-LiDAR for 1 m DTM',
  },
  {
    name: 'Esri World Imagery & Carto OSM — Live Active',
    resolution: 'Zoom-17 core (~1.18 m/px) + Zoom-18 focused tile (~0.59 m/px) orthophotos',
    coverage: 'Exact Web Mercator UV alignment onto every 1 km Tagum tile',
    license: 'Reference basemap overlay',
    limitation: '2D orthophoto draping; pair with OSM/Overture footprints for 3D extrusion',
  },
  {
    name: 'Google Open Buildings v3 & 2.5D Temporal',
    resolution: 'v3 polygons (1.8B) + 2.5D 4 m height raster (2016–2023)',
    coverage: 'South & Southeast Asia including Davao del Norte (OneGeo Feb 2026)',
    license: 'CC BY 4.0 / ODbL 1.0 · Earth Engine / S2 / HDX',
    limitation: 'Dense tin roofs can merge into single polygons (16% >0.5 IoU in dense settlements)',
  },
  {
    name: 'Microsoft Global ML Building Footprints',
    resolution: '1.4B AI-detected footprints (Aug 2026 refresh)',
    coverage: 'Global zoom-9 quadkey .csv.gz (2014–2024 imagery)',
    license: 'CDLA Permissive 2.0 · dataset-links.csv',
    limitation: 'Heights on select subsets only; may miss newest subdivisions',
  },
  {
    name: 'Overture Maps (Buildings)',
    resolution: 'Conflated OSM + Google/Microsoft polygons with merged heights',
    coverage: 'Global open schema',
    license: 'Open data · Overture CLI / QGIS plugin',
    limitation: 'Inherits missing heights where base datasets lack vertical tags',
  },
  {
    name: 'Phil-LiDAR 1 & 2 (DOST-UP DREAM)',
    resolution: '1 m LiDAR bare-earth DTM and DSM',
    coverage: 'Tagum-Libuganon floodplain; verify urban tile coverage via AOI',
    license: 'Manual letter + AOI shapefile via lipad.dream.upd.edu.ph',
    limitation: 'Automated portal under maintenance; administrative processing wait',
  },
  {
    name: 'NAMRIA Airborne IfSAR & 1:10,000 DEM',
    resolution: 'Airborne IfSAR DEM & upgraded 1:10,000-scale DEM',
    coverage: 'Tagum-Libuganon River Basin (documented in eFOI & JICA)',
    license: 'Formal government request (NAMRIA / eFOI)',
    limitation: 'Requires request workflow; exact pixel spacing varies by sheet',
  },
];

function landmarkScenePos(id: ActiveLandmarkId): {
  x: number;
  z: number;
  tileId: string;
  name: string;
} {
  const lm = VERIFIED_LANDMARKS.find((l) => l.id === id)!;
  const pt = latLonToScene(lm.lat, lm.lon);
  return { x: pt.x, z: pt.z, tileId: lm.tileId, name: lm.name };
}

const fpPos = landmarkScenePos('freedomPark');
const chPos = landmarkScenePos('cityHall');
const catPos = landmarkScenePos('cathedral');
const gmPos = landmarkScenePos('gaisanoMall');
const robPos = landmarkScenePos('robinsonsPlace');
const b8Pos = landmarkScenePos('big8Hotel');
const tcPos = landmarkScenePos('tradeCenter');
const incPos = landmarkScenePos('incTagum');

// Close architectural framing camera presets so true-scale 1:1 landmarks inspect crisply!
export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'overview',
    label: 'City Core',
    position: [24, 22, 28],
    target: [-2, 0.4, -1],
  },
  {
    id: 'freedomPark',
    label: 'Freedom Park',
    position: [fpPos.x + 1.05, 1.35, fpPos.z + 1.65],
    target: [fpPos.x, 0.52, fpPos.z + 0.14],
    landmarkId: 'freedomPark',
  },
  {
    id: 'cityHall',
    label: 'City Hall',
    position: [chPos.x + 1.35, 1.55, chPos.z + 1.75],
    target: [chPos.x, 0.62, chPos.z],
    landmarkId: 'cityHall',
  },
  {
    id: 'cathedral',
    label: 'Cathedral',
    position: [catPos.x + 1.15, 1.45, catPos.z + 1.55],
    target: [catPos.x, 0.55, catPos.z - 0.05],
    landmarkId: 'cathedral',
  },
  {
    id: 'gaisanoMall',
    label: 'Gaisano Mall',
    position: [gmPos.x + 1.95, 2.05, gmPos.z + 2.35],
    target: [gmPos.x, 0.6, gmPos.z],
    landmarkId: 'gaisanoMall',
  },
  {
    id: 'robinsonsPlace',
    label: 'Robinsons Place',
    position: [robPos.x + 1.85, 1.85, robPos.z + 2.15],
    target: [robPos.x, 0.5, robPos.z],
    landmarkId: 'robinsonsPlace',
  },
  {
    id: 'big8Hotel',
    label: 'Big 8 Hotel',
    position: [b8Pos.x + 1.25, 1.55, b8Pos.z + 1.55],
    target: [b8Pos.x, 0.6, b8Pos.z],
    landmarkId: 'big8Hotel',
  },
  {
    id: 'tradeCenter',
    label: 'Trade Center',
    position: [tcPos.x + 1.35, 1.45, tcPos.z + 1.55],
    target: [tcPos.x, 0.55, tcPos.z],
    landmarkId: 'tradeCenter',
  },
  {
    id: 'incTagum',
    label: 'INC Tagum',
    position: [incPos.x + 1.05, 1.4, incPos.z + 1.45],
    target: [incPos.x, 0.55, incPos.z],
    landmarkId: 'incTagum',
  },
  {
    id: 'topGrid',
    label: 'Top Map',
    position: [0, 48, 0.01],
    target: [0, 0, 0],
  },
  {
    id: 'printBed',
    label: 'Print Bed',
    position: [22, 18, 24],
    target: [0, 0, 0],
  },
];

export function buildPythonPipelineScript(
  scaleSpec: PrintScaleSpec,
  selectedTile: TagumTileInfo,
  verticalBoost: number,
): string {
  const b = selectedTile.bbox;
  const center = tileCenterScene(selectedTile.col, selectedTile.row);
  return `# Automated Tagum City Real-OSM Vector-to-STL Pipeline
# Tile ${selectedTile.id} (${selectedTile.barangay}) · Exact WGS84 BBox:
#   S=${b.south.toFixed(6)}, W=${b.west.toFixed(6)}, N=${b.north.toFixed(6)}, E=${b.east.toFixed(6)}
# Dependencies: pip install osmnx shapely trimesh geopandas numpy
import osmnx as ox
import shapely.geometry as geom
import trimesh

BBOX = (${b.west.toFixed(6)}, ${b.south.toFixed(6)}, ${b.east.toFixed(6)}, ${b.north.toFixed(6)})  # (west, south, east, north)
MAP_SCALE = ${scaleSpec.ratio}                 # ${scaleSpec.label}
TILE_PRINT_MM = 200.0             # Fits 220x220 / 256x256 mm FDM beds
BASE_SKIRT_MM = 4.0               # Solid base + chamfered zipper joint margin
VERTICAL_BOOST = ${verticalBoost.toFixed(2)}             # Scene center (${center.x.toFixed(1)}, ${center.z.toFixed(1)})

def export_tagum_real_osm_tile(tile_id: str):
    gdf_bldg = ox.features_from_bbox(bbox=BBOX, tags={"building": True})
    gdf_proj = ox.projection.project_gdf(gdf_bldg)
    bounds = gdf_proj.total_bounds  # minx, miny, maxx, maxy
    cx, cy = (bounds[0] + bounds[2]) / 2.0, (bounds[1] + bounds[3]) / 2.0
    half_m = (TILE_PRINT_MM / 1000.0) * MAP_SCALE / 2.0
    clip_box = geom.box(cx - half_m, cy - half_m, cx + half_m, cy + half_m)

    meshes = []
    base = trimesh.creation.box(extents=[TILE_PRINT_MM, TILE_PRINT_MM, BASE_SKIRT_MM])
    base.apply_translation([0.0, 0.0, BASE_SKIRT_MM / 2.0])
    meshes.append(base)

    mm_per_m = 1000.0 / MAP_SCALE
    for _, row in gdf_proj.iterrows():
        poly = row.geometry.intersection(clip_box)
        if poly.is_empty or poly.geom_type != "Polygon":
            continue
        raw_h = float(row.get("height") or (float(row.get("building:levels") or 2) * 3.4))
        extrude_mm = max(0.8, raw_h * mm_per_m * VERTICAL_BOOST)
        coords = [((x - cx) * mm_per_m, (y - cy) * mm_per_m) for x, y in poly.exterior.coords]
        local_poly = geom.Polygon(coords).buffer(0)
        if local_poly.is_valid and local_poly.area > 0.64:
            mesh = trimesh.creation.extrude_polygon(local_poly, height=extrude_mm)
            mesh.apply_translation([0.0, 0.0, BASE_SKIRT_MM])
            meshes.append(mesh)

    combined = trimesh.util.concatenate(meshes)
    out_file = f"tagum_{tile_id}_{MAP_SCALE}_real_osm.stl"
    combined.export(out_file)
    print(f"Exported real OSM watertight tile {out_file} ({len(combined.faces)} triangles)")

if __name__ == "__main__":
    export_tagum_real_osm_tile("${selectedTile.id}")
`;
}
