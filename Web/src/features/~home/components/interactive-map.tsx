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
import type {
  GISReferenceStatus,
  SelectedStationReading,
  Station,
} from '@/types/monitoring.type';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(workerUrl);

const openFreeMapAttribution =
  '<a href="https://openfreemap.org/">OpenFreeMap</a>, <a href="https://www.openmaptiles.org/">© OpenMapTiles</a>, Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const riskColors = {
  danger: '#df4b4b',
  caution: '#e8b529',
  safe: '#24965c',
  unknown: '#94a3b8',
} as const;

type RiskLevel = keyof typeof riskColors;
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
  regions: string[];
  risk: RiskLevel;
  sampleCount: number;
  stationCount: number;
  worstSample: StationSample | null;
  samples: StationSample[];
};

type InteractiveMapProps = {
  stations: Station[];
  observations: Record<string, SelectedStationReading>;
  referenceStatuses: Record<string, GISReferenceStatus>;
  ruleSetVersion: string | null;
  dataMode: 'historical' | 'replay';
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

function classifySalinity(value: number | null): RiskLevel {
  if (value === null || !Number.isFinite(value) || value < 0) return 'unknown';
  if (value >= 4000) return 'danger';
  if (value >= 1000) return 'caution';
  return 'safe';
}

function riskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'danger':
      return 'Nguy cơ cao';
    case 'caution':
      return 'Cần chú ý';
    case 'safe':
      return 'An toàn theo mốc tham khảo';
    default:
      return 'Chưa có số đo hợp lệ';
  }
}

function formatValue(value: number | null, unit: string): string {
  return value === null
    ? 'Chưa có dữ liệu'
    : value.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' ' + unit;
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

function buildZoneSummaries(
  geoData: GeoFeatureCollection | null,
  stations: Station[],
  observations: Record<string, SelectedStationReading>,
): ZoneSummary[] {
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
      if (!feature) return;

      const name = districtName(feature);
      const zone = zoneForDistrict(name, zones);
      if (!zone) return;

      const reading = observations[station.id] ?? {
        observation: null,
        freshness: 'missing' as const,
      };
      const salinity = reading.observation?.salinity.value ?? null;
      samples.push({
        station,
        districtName: name,
        zoneName: zone.zoneName,
        reading,
        salinity,
        risk: classifySalinity(salinity),
      });
    });
  }

  return zones.map((zone) => {
    const zoneSamples = samples.filter(
      (sample) => sample.zoneName === zone.zoneName,
    );
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
      regions: zone.regions,
      risk: worstSample?.risk ?? 'unknown',
      sampleCount: measuredSamples.length,
      stationCount: zoneSamples.length,
      worstSample,
      samples: zoneSamples,
    };
  });
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

function DistrictLayer({
  geoData,
  zoneSummaries,
  selectedAt,
}: {
  geoData: GeoFeatureCollection;
  zoneSummaries: ZoneSummary[];
  selectedAt: Date | null;
}) {
  const layerRef = useRef<L.GeoJSON | null>(null);
  const zones = regionContext.zones as ZoneType[];

  const styleFeature = useMemo(
    () => (feature?: RegionFeature) => {
      const zone = feature
        ? zoneForDistrict(districtName(feature), zones)
        : undefined;
      const summary = zoneSummaries.find(
        (item) => item.zoneName === zone?.zoneName,
      );
      const risk = summary?.risk ?? 'unknown';

      return {
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.95,
        fillColor: riskColors[risk],
        fillOpacity: risk === 'unknown' ? 0.25 : 0.58,
      };
    },
    [zoneSummaries, zones],
  );

  useEffect(() => {
    layerRef.current?.eachLayer((layer) => {
      const districtLayer = layer as L.Path & {
        feature?: RegionFeature;
      };
      const feature = districtLayer.feature;
      if (!feature) return;

      const name = districtName(feature);
      const zone = zoneForDistrict(name, zones);
      const summary = zoneSummaries.find(
        (item) => item.zoneName === zone?.zoneName,
      );
      const sample = summary?.worstSample;
      const dateText = escapeHtml(formatTimestamp(selectedAt ?? undefined));
      const sampleDetails = sample
        ? '<div>Trạm: ' +
          escapeHtml(sample.station.name) +
          ' · ' +
          escapeHtml(sample.districtName) +
          '</div><div>Ghi nhận: ' +
          escapeHtml(formatTimestamp(sample.reading.observation?.observedAt)) +
          '</div>'
        : summary?.stationCount
          ? '<div>Đã có trạm trong vùng nhưng chưa có số đo hợp lệ để phân loại.</div>'
          : '<div>Chưa có trạm đo đã xác minh trong vùng.</div>';
      const content = [
        '<div style="min-width:220px;font-size:13px;line-height:1.55">',
        '<strong style="font-size:15px">',
        escapeHtml(name),
        '</strong>',
        '<div style="color:#475569">',
        escapeHtml(zone?.zoneName ?? 'Chưa phân vùng'),
        '</div>',
        '<div style="margin-top:6px"><b>',
        escapeHtml(riskLabel(summary?.risk ?? 'unknown')),
        '</b></div>',
        '<div>Độ mặn cao nhất trong vùng: ',
        escapeHtml(formatValue(sample?.salinity ?? null, 'mg/L')),
        '</div>',
        sampleDetails,
        '<div style="margin-top:6px;color:#64748b;font-size:11px">Thời điểm chọn: ',
        dateText,
        '</div>',
        '<div style="margin-top:6px;color:#64748b;font-size:11px">Màu toàn vùng theo số đo cao nhất của các trạm trong vùng; chỉ mang tính tham khảo, không phải cảnh báo vận hành.</div>',
        '</div>',
      ].join('');
      districtLayer.bindPopup(content);
    });
  }, [geoData, selectedAt, zoneSummaries, zones]);

  return <GeoJSON ref={layerRef} data={geoData} style={styleFeature} />;
}

function MapLegend({ readingLoading }: { readingLoading: boolean }) {
  return (
    <div className="absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-1.5 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] text-slate-700 shadow-sm backdrop-blur sm:text-[11px]">
      <span className="flex items-center gap-1.5">
        <i className="size-2.5 rounded-full bg-[#df4b4b]" />
        Đỏ ≥ 4.000 mg/L
      </span>
      <span className="flex items-center gap-1.5">
        <i className="size-2.5 rounded-full bg-[#e8b529]" />
        Vàng 1.000–&lt;4.000
      </span>
      <span className="flex items-center gap-1.5">
        <i className="size-2.5 rounded-full bg-[#24965c]" />
        Xanh &lt;1.000
      </span>
      <span className="flex items-center gap-1.5">
        <i className="size-2.5 rounded-full bg-slate-400" />
        Xám: chưa có số đo
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
  referenceStatuses,
  ruleSetVersion,
  dataMode,
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

  const zoneSummaries = useMemo(
    () => buildZoneSummaries(geoData, stations, observations),
    [geoData, observations, stations],
  );

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
            zoneSummaries={zoneSummaries}
            selectedAt={selectedAt}
          />
        )}
        {stations.map((station) => {
          const reading = observations[station.id] ?? {
            observation: null,
            freshness: 'missing',
          };
          const observation = reading.observation;
          const referenceStatus = referenceStatuses[station.id];
          const salinity = observation?.salinity.value ?? null;
          const risk = classifySalinity(salinity);
          const color = riskColors[risk];
          const selected = station.id === selectedStationId;
          const readingDescription =
            reading.freshness === 'stale'
              ? 'Bản ghi cũ hơn ' + SNAPSHOT_MAX_AGE_HOURS + ' giờ'
              : reading.freshness === 'fresh'
                ? 'Bản ghi trong ' + SNAPSHOT_MAX_AGE_HOURS + ' giờ'
                : readingLoading
                  ? 'Đang tải lịch sử…'
                  : 'Không có bản ghi trước thời điểm đã chọn';

          return (
            <CircleMarker
              key={station.id}
              center={[station.location.latitude, station.location.longitude]}
              radius={selected ? 11 : 8}
              pathOptions={{
                color: selected ? '#064f9f' : '#ffffff',
                fillColor: color,
                fillOpacity: 0.98,
                weight: selected ? 4 : 2.5,
              }}
              eventHandlers={{ click: () => onStationSelect(station.id) }}
            >
              <Popup>
                <div className="min-w-52 space-y-1.5 text-sm">
                  <div className="font-semibold text-slate-900">
                    {station.name}
                  </div>
                  <div className="font-medium" style={{ color }}>
                    {riskLabel(risk)} · {formatValue(salinity, 'mg/L')}
                  </div>
                  <div className="text-slate-600">
                    Mực nước:{' '}
                    {formatValue(observation?.waterLevel.value ?? null, 'm')}
                  </div>
                  <div className="text-xs text-slate-500">
                    {observation
                      ? readingDescription +
                        ': ' +
                        formatTimestamp(observation.observedAt)
                      : readingDescription}
                  </div>
                  <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-2">
                    <div className="font-medium text-blue-900">
                      Mô phỏng tham khảo v{ruleSetVersion ?? '…'}:{' '}
                      {referenceStatus?.label ?? 'Đang tải quy tắc'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-blue-800">
                      {dataMode === 'replay'
                        ? 'Phát lại dữ liệu lịch sử'
                        : 'Dữ liệu lịch sử'}{' '}
                      · Chưa xác nhận vận hành; không phải trạng thái thực tế.
                    </div>
                    {referenceStatus?.basis && (
                      <div className="mt-1 text-[10px] text-blue-700">
                        Căn cứ: {referenceStatus.basis}
                      </div>
                    )}
                  </div>
                </div>
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
                  style={{ backgroundColor: riskColors[zone.risk] }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-semibold text-slate-800">
                    {zone.zoneName}
                  </span>
                  <span className="block truncate text-[9px] text-slate-500">
                    {zone.sampleCount > 0
                      ? zone.sampleCount +
                        ' trạm có số liệu · ' +
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
