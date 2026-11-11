import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import type { Feature, Geometry, Position } from 'geojson';
import L from 'leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';

import regionContext from '@/components/data/context.json';
import geoJsonUrl from '@/components/data/tien_giang.geojson?url';
import { SNAPSHOT_MAX_AGE_HOURS } from '@/services/monitoring-api';
import type {
  GeoFeatureCollection,
  GeoFeatureProperties,
  ZoneType,
} from '@/types/home.type';
import type { SelectedStationReading, Station } from '@/types/monitoring.type';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(workerUrl);

const openFreeMapAttribution =
  '<a href="https://openfreemap.org/">OpenFreeMap</a>, <a href="https://www.openmaptiles.org/">© OpenMapTiles</a>, Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const riskPalette = {
  danger: {
    fill: '#f2c4d0',
    stroke: '#c43c61',
    header: '#c43c61',
    surface: '#fff3f6',
    label: 'VƯỢT MỐC CAO',
    message: 'Độ mặn đạt từ 4 g/L theo mốc tham khảo.',
    mark: '!',
  },
  caution: {
    fill: '#fff0b3',
    stroke: '#d4aa26',
    header: '#d4aa26',
    surface: '#fffbed',
    label: 'CẦN CHÚ Ý',
    message: 'Độ mặn từ 1 đến dưới 4 g/L theo mốc tham khảo.',
    mark: '!',
  },
  safe: {
    fill: '#cfe8d4',
    stroke: '#3f9659',
    header: '#3f9659',
    surface: '#f1f9f2',
    label: 'DƯỚI MỐC',
    message: 'Độ mặn dưới 1 g/L theo mốc tham khảo.',
    mark: '✓',
  },
  unknown: {
    fill: '#e2e8f0',
    stroke: '#94a3b8',
    header: '#64748b',
    surface: '#f8fafc',
    label: 'CHƯA CÓ SỐ LIỆU',
    message: 'Chưa có độ mặn hợp lệ để phân loại.',
    mark: '·',
  },
} as const;

type RiskLevel = keyof typeof riskPalette;
type RegionFeature = Feature<Geometry, GeoFeatureProperties>;

type StationSample = {
  station: Station;
  districtName: string;
  zoneName: string;
  reading: SelectedStationReading;
  salinity: number | null;
  risk: RiskLevel;
};

type ZoneSummary = {
  zoneName: string;
  risk: RiskLevel;
  sampleCount: number;
  stationCount: number;
  worstSample: StationSample | null;
};

type RegionSummary = {
  districtName: string;
  zoneName: string | null;
  risk: RiskLevel;
  sampleCount: number;
  stationCount: number;
  distanceKm: number | null;
  worstSample: StationSample | null;
  samples: StationSample[];
};

type InteractiveMapProps = {
  stations: Station[];
  observations: Record<string, SelectedStationReading>;
  selectedAt: Date | null;
  selectedStationId: string | null;
  onStationSelect: (stationId: string) => void;
  loading: boolean;
  loadError: boolean;
  readingLoading: boolean;
};

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^a-z0-9]/g, '');
}

function districtName(feature: RegionFeature): string {
  return feature.properties?.NAME_3 ?? 'Khu vực chưa đặt tên';
}

function zoneForDistrict(
  name: string,
  zones: ZoneType[],
): ZoneType | undefined {
  const normalizedDistrictName = normalizeName(name);
  return zones.find((zone) =>
    zone.regions.some(
      (region) => normalizeName(region) === normalizedDistrictName,
    ),
  );
}

function pointInRing(point: Position, ring: Position[]): boolean {
  const longitude = point[0];
  const latitude = point[1];
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const cross = (latitude - yi) * (xj - xi) - (longitude - xi) * (yj - yi);
    const withinSegment =
      Math.abs(cross) < 1e-10 &&
      longitude >= Math.min(xi, xj) - 1e-10 &&
      longitude <= Math.max(xi, xj) + 1e-10 &&
      latitude >= Math.min(yi, yj) - 1e-10 &&
      latitude <= Math.max(yi, yj) + 1e-10;
    if (withinSegment) return true;

    const crossesLatitude = yi > latitude !== yj > latitude;
    if (
      crossesLatitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygon(point: Position, rings: Position[][]): boolean {
  if (rings.length === 0 || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointInRing(point, hole));
}

function featureContainsPoint(
  feature: RegionFeature,
  longitude: number,
  latitude: number,
): boolean {
  const point: Position = [longitude, latitude];
  if (feature.geometry.type === 'Polygon') {
    return pointInPolygon(point, feature.geometry.coordinates);
  }
  if (feature.geometry.type === 'MultiPolygon') {
    return feature.geometry.coordinates.some((polygon) =>
      pointInPolygon(point, polygon),
    );
  }
  return false;
}

function distanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(fromLatitude)) *
      Math.cos(radians(toLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function classifySalinity(value: number | null): RiskLevel {
  if (value === null || !Number.isFinite(value) || value < 0) return 'unknown';
  if (value >= 4000) return 'danger';
  if (value >= 1000) return 'caution';
  return 'safe';
}

function riskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'danger':
      return 'Vượt mốc cao';
    case 'caution':
      return 'Cần chú ý';
    case 'safe':
      return 'Dưới mốc tham khảo';
    default:
      return 'Chưa có số liệu';
  }
}

function formatValue(value: number | null, unit: string): string {
  return value === null
    ? 'Chưa có dữ liệu'
    : value.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' ' + unit;
}

function formatSalinity(value: number | null): string {
  return value === null ? '—' : formatValue(value / 1000, 'g/L');
}

function formatTimestamp(value: string | Date | undefined): string {
  if (!value) return 'Không có bản ghi';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Không có bản ghi';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

function SalinityStatusCard({
  station,
  reading,
}: {
  station: Station;
  reading: SelectedStationReading;
}) {
  const observation = reading.observation;
  const salinity = observation?.salinity.value ?? null;
  const risk = classifySalinity(salinity);
  const palette = riskPalette[risk];

  return (
    <div
      className="relative w-[236px] overflow-hidden rounded-xl border shadow-lg"
      style={{ borderColor: palette.stroke, backgroundColor: palette.surface }}
    >
      <div
        className="px-3 py-1.5 text-center text-[10px] font-bold tracking-wide text-white"
        style={{ backgroundColor: palette.header }}
      >
        {station.name.toLocaleUpperCase('vi-VN')}
      </div>
      <div className="relative px-3 py-2.5 pr-10 text-[11px] text-slate-800">
        <div className="grid grid-cols-[56px_1fr] gap-1">
          <span className="font-semibold">Độ mặn</span>
          <span>{formatSalinity(salinity)}</span>
          <span className="font-semibold">Mực nước</span>
          <span>{formatValue(observation?.waterLevel.value ?? null, 'm')}</span>
        </div>
        <span
          aria-hidden="true"
          className="absolute right-2 top-0 text-[38px] font-black leading-none"
          style={{ color: palette.header }}
        >
          {palette.mark}
        </span>
        <p
          className="mt-2 max-w-[176px] text-[10px] font-semibold leading-4"
          style={{ color: palette.header }}
        >
          {palette.message}
        </p>
        <p className="mt-1 text-[9px] leading-3 text-slate-500">
          {observation
            ? 'Ghi nhận: ' +
              formatTimestamp(observation.observedAt) +
              (reading.freshness === 'stale'
                ? ' · cũ hơn ' + SNAPSHOT_MAX_AGE_HOURS + ' giờ'
                : '')
            : 'Chưa có bản ghi tại thời điểm chọn'}
        </p>
      </div>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return replacements[character];
  });
}

function buildMapSummaries(
  geoData: GeoFeatureCollection | null,
  stations: Station[],
  observations: Record<string, SelectedStationReading>,
): { regions: RegionSummary[]; zones: ZoneSummary[] } {
  const zones = regionContext.zones as ZoneType[];
  const samples: StationSample[] = [];

  if (geoData) {
    stations.forEach((station) => {
      const feature = geoData.features.find((candidate) =>
        featureContainsPoint(
          candidate as RegionFeature,
          station.location.longitude,
          station.location.latitude,
        ),
      ) as RegionFeature | undefined;

      const name = feature ? districtName(feature) : 'Chưa gán huyện';
      const zone = feature ? zoneForDistrict(name, zones) : undefined;

      const reading = observations[station.id] ?? {
        observation: null,
        freshness: 'missing' as const,
      };
      const salinity = reading.observation?.salinity.value ?? null;
      samples.push({
        station,
        districtName: name,
        zoneName: zone?.zoneName ?? 'Chưa phân vùng',
        reading,
        salinity,
        risk: classifySalinity(salinity),
      });
    });
  }

  const regions = (geoData?.features ?? []).map((feature) => {
    const name = districtName(feature as RegionFeature);
    const bounds = L.geoJSON(feature as RegionFeature).getBounds();
    const center = bounds.getCenter();
    const nearest = samples.reduce<{
      sample: StationSample;
      distance: number;
    } | null>((closest, sample) => {
      const distance = distanceKm(
        center.lat,
        center.lng,
        sample.station.location.latitude,
        sample.station.location.longitude,
      );
      return !closest || distance < closest.distance
        ? { sample, distance }
        : closest;
    }, null);
    const nearestSample = nearest?.sample ?? null;
    const risk = nearestSample?.risk ?? 'unknown';

    return {
      districtName: name,
      zoneName: zoneForDistrict(name, zones)?.zoneName ?? null,
      risk,
      sampleCount: risk === 'unknown' ? 0 : 1,
      stationCount: nearestSample ? 1 : 0,
      distanceKm: nearest?.distance ?? null,
      worstSample: nearestSample,
      samples: nearestSample ? [nearestSample] : [],
    };
  });

  const zoneSummaries = zones.map((zone) => {
    const zoneRegions = regions.filter(
      (region) => region.zoneName === zone.zoneName,
    );
    const zoneSamples = zoneRegions
      .map((region) => region.worstSample)
      .filter((sample): sample is StationSample => sample !== null);
    const measuredSamples = zoneSamples.filter(
      (sample) => sample.risk !== 'unknown',
    );
    const worstSample = measuredSamples.reduce<StationSample | null>(
      (worst, sample) =>
        !worst || (sample.salinity ?? -Infinity) > (worst.salinity ?? -Infinity)
          ? sample
          : worst,
      null,
    );

    return {
      zoneName: zone.zoneName,
      risk: worstSample?.risk ?? 'unknown',
      sampleCount: zoneRegions.filter((region) => region.sampleCount > 0)
        .length,
      stationCount: new Set(zoneSamples.map((sample) => sample.station.id))
        .size,
      worstSample,
    };
  });

  return { regions, zones: zoneSummaries };
}

function BaseMap() {
  const map = useMap();

  useEffect(() => {
    const baseMap = maplibreGL({
      attributionControl: false,
      style: 'https://tiles.openfreemap.org/styles/positron',
    }).addTo(map);
    map.attributionControl.addAttribution(openFreeMapAttribution);

    return () => {
      map.removeLayer(baseMap);
      map.attributionControl.removeAttribution(openFreeMapAttribution);
    };
  }, [map]);

  return null;
}

function FitProvinceOrZone({
  geoData,
  focusedZone,
}: {
  geoData: GeoFeatureCollection | null;
  focusedZone: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!geoData) return;
    const zones = regionContext.zones as ZoneType[];
    const zone = zones.find((item) => item.zoneName === focusedZone);
    const features = zone
      ? geoData.features.filter((feature) =>
          zone.regions.some(
            (region) =>
              normalizeName(region) ===
              normalizeName(districtName(feature as RegionFeature)),
          ),
        )
      : geoData.features;
    const boundsSource: GeoFeatureCollection = {
      type: 'FeatureCollection',
      features,
    };
    const bounds = L.geoJSON(boundsSource).getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [52, 52],
        maxZoom: focusedZone ? 10 : 8,
        animate: true,
      });
    }
  }, [focusedZone, geoData, map]);

  return null;
}

function regionHoverCard(
  region: RegionSummary,
  selectedAt: Date | null,
): string {
  const palette = riskPalette[region.risk];
  const sample = region.worstSample;
  const sampleInfo = sample
    ? '<div style="margin-top:7px;color:#475569">Trạm gần nhất: ' +
      escapeHtml(sample.station.name) +
      '</div><div style="color:#64748b">Ghi nhận: ' +
      escapeHtml(formatTimestamp(sample.reading.observation?.observedAt)) +
      '</div><div style="color:#64748b">Cách tâm huyện khoảng ' +
      (region.distanceKm?.toLocaleString('vi-VN', {
        maximumFractionDigits: 1,
      }) ?? '—') +
      ' km</div>'
    : region.stationCount > 0
      ? '<div style="margin-top:7px;color:#64748b">Trạm có trong khu vực nhưng chưa có số đo hợp lệ.</div>'
      : '<div style="margin-top:7px;color:#64748b">Chưa có trạm đo xác minh trong khu vực này.</div>';
  const border = escapeHtml(palette.stroke);
  const background = escapeHtml(palette.surface);
  const header = escapeHtml(palette.header);

  return [
    '<div style="width:228px;overflow:hidden;border:1px solid ',
    border,
    ';border-radius:12px;background:',
    background,
    ';box-shadow:0 10px 24px rgba(15,23,42,.18);font:12px/1.45 Arial,sans-serif">',
    '<div style="padding:5px 10px;background:',
    header,
    ';color:#fff;text-align:center;font-size:10px;font-weight:700;letter-spacing:.04em">',
    escapeHtml(region.zoneName ?? 'TIỀN GIANG'),
    '</div>',
    '<div style="position:relative;padding:9px 12px">',
    '<strong style="font-size:14px;color:#0f172a">',
    escapeHtml(region.districtName),
    '</strong>',
    '<div style="margin-top:4px;color:',
    header,
    ';font-weight:700">',
    escapeHtml(riskLabel(region.risk)),
    '</div>',
    '<div style="margin-top:4px">Độ mặn: ',
    escapeHtml(formatSalinity(sample?.salinity ?? null)),
    '</div>',
    sampleInfo,
    '<div style="margin-top:7px;color:#64748b;font-size:10px">Chọn mốc: ',
    escapeHtml(formatTimestamp(selectedAt ?? undefined)),
    ' · Màu ước tính theo trạm gần nhất, không phải số đo trực tiếp tại huyện.</div>',
    '</div></div>',
  ].join('');
}

function findRegionSummary(
  feature: RegionFeature | undefined,
  summaries: RegionSummary[],
): RegionSummary | undefined {
  if (!feature) return undefined;
  const name = normalizeName(districtName(feature));
  return summaries.find((item) => normalizeName(item.districtName) === name);
}

function DistrictLayer({
  geoData,
  regionSummaries,
  selectedAt,
}: {
  geoData: GeoFeatureCollection;
  regionSummaries: RegionSummary[];
  selectedAt: Date | null;
}) {
  const layerRef = useRef<L.GeoJSON | null>(null);

  const styleFeature = useMemo(
    () =>
      (feature?: RegionFeature): L.PathOptions => {
        const summary = findRegionSummary(feature, regionSummaries);
        const palette = riskPalette[summary?.risk ?? 'unknown'];
        return {
          color: palette.stroke,
          weight: 1.7,
          opacity: 0.96,
          fillColor: palette.fill,
          fillOpacity: summary?.risk === 'unknown' ? 0.34 : 0.88,
        };
      },
    [regionSummaries],
  );

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    layerRef.current?.eachLayer((layer) => {
      const districtLayer = layer as L.Path & { feature?: RegionFeature };
      const feature = districtLayer.feature;
      if (!feature) return;

      const region = findRegionSummary(feature, regionSummaries);
      if (!region) return;
      const baseStyle = styleFeature(feature);
      districtLayer.bindTooltip(regionHoverCard(region, selectedAt), {
        className: 'salinity-hover-tooltip',
        direction: 'top',
        opacity: 1,
        sticky: true,
      });
      districtLayer.bindPopup(regionHoverCard(region, selectedAt));

      const handleMouseOver = () => {
        districtLayer.setStyle({
          ...baseStyle,
          weight: 3,
          fillOpacity: 0.98,
        });
        districtLayer.bringToFront();
      };
      const handleMouseOut = () => districtLayer.setStyle(baseStyle);
      districtLayer.on('mouseover', handleMouseOver);
      districtLayer.on('mouseout', handleMouseOut);
      cleanups.push(() => {
        districtLayer.off('mouseover', handleMouseOver);
        districtLayer.off('mouseout', handleMouseOut);
        districtLayer.unbindTooltip();
        districtLayer.unbindPopup();
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [geoData, regionSummaries, selectedAt, styleFeature]);

  return <GeoJSON ref={layerRef} data={geoData} style={styleFeature} />;
}

function RegionSwatch({ risk }: { risk: RiskLevel }) {
  const palette = riskPalette[risk];
  return (
    <svg aria-hidden="true" className="h-3.5 w-5 shrink-0" viewBox="0 0 24 16">
      <path
        d="M2 5 7 4 9 1 20 3 21 11 23 14 12 15 7 12 3 12Z"
        fill={palette.fill}
        stroke={palette.stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MapLegend({ readingLoading }: { readingLoading: boolean }) {
  return (
    <div className="absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-1.5 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] text-slate-700 shadow-sm backdrop-blur sm:text-[11px]">
      <span className="flex items-center gap-1.5">
        <RegionSwatch risk="danger" />
        Đỏ ≥ 4 g/L
      </span>
      <span className="flex items-center gap-1.5">
        <RegionSwatch risk="caution" />
        Vàng 1–&lt;4 g/L
      </span>
      <span className="flex items-center gap-1.5">
        <RegionSwatch risk="safe" />
        Xanh &lt;1 g/L
      </span>
      <span className="flex items-center gap-1.5">
        <RegionSwatch risk="unknown" />
        Xám: trạm gần nhất chưa có số đo
      </span>
      {readingLoading && (
        <span className="text-slate-500">Đang tải số liệu…</span>
      )}
    </div>
  );
}

export default function InteractiveMap({
  stations,
  observations,
  selectedAt,
  selectedStationId,
  onStationSelect,
  loading,
  loadError,
  readingLoading,
}: InteractiveMapProps) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [geoLoadError, setGeoLoadError] = useState(false);
  const [focusedZone, setFocusedZone] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(geoJsonUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok)
          throw new Error('Không tải được ranh giới Tiền Giang.');
        return response.json() as Promise<GeoFeatureCollection>;
      })
      .then((data) => setGeoData(data))
      .catch(() => {
        if (!controller.signal.aborted) setGeoLoadError(true);
      });
    return () => controller.abort();
  }, []);

  const mapSummaries = useMemo(
    () => buildMapSummaries(geoData, stations, observations),
    [geoData, observations, stations],
  );
  const { regions: regionSummaries, zones: zoneSummaries } = mapSummaries;

  return (
    <div className="relative h-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-[560px]">
      <MapContainer
        center={[10.36, 106.48]}
        zoom={8}
        minZoom={7}
        maxZoom={14}
        maxBounds={[
          [-85.05112878, -180],
          [85.05112878, 180],
        ]}
        maxBoundsViscosity={1}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <BaseMap />
        <FitProvinceOrZone geoData={geoData} focusedZone={focusedZone} />
        {geoData && (
          <DistrictLayer
            geoData={geoData}
            regionSummaries={regionSummaries}
            selectedAt={selectedAt}
          />
        )}
        {stations.map((station) => {
          const reading = observations[station.id] ?? {
            observation: null,
            freshness: 'missing',
          };
          const observation = reading.observation;
          const salinity = observation?.salinity.value ?? null;
          const risk = classifySalinity(salinity);
          const palette = riskPalette[risk];
          const selected = station.id === selectedStationId;

          return (
            <CircleMarker
              key={station.id}
              center={[station.location.latitude, station.location.longitude]}
              radius={selected ? 11 : 8}
              pathOptions={{
                color: selected ? '#064f9f' : '#ffffff',
                fillColor: palette.stroke,
                fillOpacity: 0.98,
                weight: selected ? 4 : 2.5,
              }}
              eventHandlers={{ click: () => onStationSelect(station.id) }}
            >
              <Tooltip
                direction="top"
                offset={[0, -12]}
                opacity={1}
                className="salinity-hover-tooltip"
              >
                <SalinityStatusCard station={station} reading={reading} />
              </Tooltip>
              <Popup>
                <SalinityStatusCard station={station} reading={reading} />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="absolute left-3 top-3 z-[500] w-[min(25rem,calc(100%-3.5rem))] rounded-xl border border-white/80 bg-white/95 p-2.5 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Phân vùng Tiền Giang
          </p>
          <button
            type="button"
            onClick={() => setFocusedZone(null)}
            className="text-[10px] font-semibold text-[#075fc5] hover:underline"
          >
            Toàn tỉnh
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {zoneSummaries.map((zone) => {
            const active = focusedZone === zone.zoneName;
            return (
              <button
                key={zone.zoneName}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setFocusedZone((current) =>
                    current === zone.zoneName ? null : zone.zoneName,
                  )
                }
                className={
                  'flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ' +
                  (active
                    ? 'border-[#075fc5]/40 bg-[#eaf4ff]'
                    : 'border-slate-200 bg-white hover:border-slate-300')
                }
              >
                <i
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: riskPalette[zone.risk].stroke }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-semibold text-slate-800">
                    {zone.zoneName}
                  </span>
                  <span className="block truncate text-[9px] text-slate-500">
                    {zone.sampleCount > 0
                      ? zone.sampleCount +
                        ' huyện · ' +
                        zone.stationCount +
                        ' trạm gần nhất · ' +
                        riskLabel(zone.risk)
                      : zone.stationCount > 0
                        ? 'Trạm chưa có số đo hợp lệ'
                        : 'Chưa có trạm đo xác minh'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <MapLegend readingLoading={readingLoading} />

      {geoLoadError && (
        <div
          role="alert"
          className="absolute inset-x-3 bottom-16 z-[500] rounded-xl border border-rose-200 bg-rose-50/95 p-3 text-xs text-rose-800 shadow-sm"
        >
          Không tải được ranh giới huyện Tiền Giang; các điểm trạm vẫn hiển thị.
        </div>
      )}

      {loading && stations.length === 0 && (
        <div
          role="status"
          className="absolute inset-0 z-[400] grid place-items-center bg-slate-50/75 p-6 text-center text-sm text-slate-600"
        >
          Đang tải danh sách trạm…
        </div>
      )}

      {!loading && loadError && stations.length === 0 && (
        <div
          role="alert"
          className="absolute inset-0 z-[400] grid place-items-center bg-slate-50/75 p-6 text-center text-sm text-rose-700"
        >
          Không thể tải danh sách trạm. Hãy kiểm tra kết nối API và thử lại.
        </div>
      )}

      {!loading && !loadError && stations.length === 0 && (
        <div className="absolute inset-0 z-[400] grid place-items-center bg-slate-50/75 p-6 text-center text-sm text-slate-600">
          Không có trạm công khai trong khoảng dữ liệu đã chọn.
        </div>
      )}
    </div>
  );
}
