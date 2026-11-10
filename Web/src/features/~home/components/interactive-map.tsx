import L from 'leaflet';
import { useEffect } from 'react';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

import { SNAPSHOT_MAX_AGE_HOURS } from '@/services/monitoring-api';
import type {
  GISReferenceStatus,
  SelectedStationReading,
  Station,
} from '@/types/monitoring.type';
import 'leaflet/dist/leaflet.css';

type InteractiveMapProps = {
  stations: Station[];
  observations: Record<string, SelectedStationReading>;
  referenceStatuses: Record<string, GISReferenceStatus>;
  ruleSetVersion: string | null;
  dataMode: 'historical' | 'replay';
  selectedStationId: string | null;
  onStationSelect: (stationId: string) => void;
  loading: boolean;
  loadError: boolean;
  readingLoading: boolean;
};

function StationBounds({ stations }: { stations: Station[] }) {
  const map = useMap();

  useEffect(() => {
    if (stations.length === 0) return;
    const bounds = L.latLngBounds(
      stations.map(({ location }) => [location.latitude, location.longitude]),
    );
    map.fitBounds(bounds, {
      padding: [44, 44],
      maxZoom: stations.length === 1 ? 11 : 9,
    });
  }, [map, stations]);

  return null;
}

function formatValue(value: number | null, unit: string): string {
  return value === null
    ? 'Chưa có dữ liệu'
    : `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${unit}`;
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return 'Không có bản ghi';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

export default function InteractiveMap({
  stations,
  observations,
  referenceStatuses,
  ruleSetVersion,
  dataMode,
  selectedStationId,
  onStationSelect,
  loading,
  loadError,
  readingLoading,
}: InteractiveMapProps) {
  return (
    <div className="relative h-[440px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-[540px]">
      <MapContainer
        center={[10.36, 106.48]}
        zoom={8}
        minZoom={7}
        maxZoom={14}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <StationBounds stations={stations} />
        {stations.map((station) => {
          const reading = observations[station.id] ?? {
            observation: null,
            freshness: 'missing',
          };
          const observation = reading.observation;
          const referenceStatus = referenceStatuses[station.id];
          const salinity = observation?.salinity.value ?? null;
          const selected = station.id === selectedStationId;
          const color =
            reading.freshness === 'fresh'
              ? '#168c79'
              : reading.freshness === 'stale'
                ? '#d97706'
                : readingLoading
                  ? '#cbd5e1'
                  : '#94a3b8';
          const readingDescription =
            reading.freshness === 'stale'
              ? `Bản ghi cũ hơn ${SNAPSHOT_MAX_AGE_HOURS} giờ`
              : reading.freshness === 'fresh'
                ? `Bản ghi trong ${SNAPSHOT_MAX_AGE_HOURS} giờ`
                : readingLoading
                  ? 'Đang tải lịch sử…'
                  : 'Không có bản ghi trước thời điểm đã chọn';

          return (
            <CircleMarker
              key={station.id}
              center={[station.location.latitude, station.location.longitude]}
              radius={selected ? 12 : 9}
              pathOptions={{
                color: selected ? '#134e4a' : color,
                fillColor: color,
                fillOpacity: 0.88,
                weight: selected ? 4 : 2,
              }}
              eventHandlers={{ click: () => onStationSelect(station.id) }}
            >
              <Popup>
                <div className="min-w-52 space-y-1.5 text-sm">
                  <div className="font-semibold text-slate-900">
                    {station.name}
                  </div>
                  <div className="text-slate-600">
                    Độ mặn: {formatValue(salinity, 'mg/L')}
                  </div>
                  <div className="text-slate-600">
                    Mực nước:{' '}
                    {formatValue(observation?.waterLevel.value ?? null, 'm')}
                  </div>
                  <div className="text-xs text-slate-500">
                    {observation
                      ? `${readingDescription}: ${formatTimestamp(observation.observedAt)}`
                      : readingDescription}
                  </div>
                  <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 p-2">
                    <div className="font-medium text-indigo-900">
                      Mô phỏng tham khảo v{ruleSetVersion ?? '…'}:{' '}
                      {referenceStatus?.label ?? 'Đang tải quy tắc'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-indigo-800">
                      {dataMode === 'replay'
                        ? 'Phát lại dữ liệu lịch sử'
                        : 'Dữ liệu lịch sử'}{' '}
                      · Chưa xác nhận vận hành; không phải trạng thái thực tế.
                    </div>
                    {referenceStatus?.basis && (
                      <div className="mt-1 text-[10px] text-indigo-700">
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

      {loading && stations.length === 0 && (
        <div
          role="status"
          className="absolute inset-0 z-[500] grid place-items-center bg-slate-50/90 p-6 text-center text-sm text-slate-600"
        >
          Đang tải danh sách trạm…
        </div>
      )}

      {!loading && loadError && stations.length === 0 && (
        <div
          role="alert"
          className="absolute inset-0 z-[500] grid place-items-center bg-slate-50/90 p-6 text-center text-sm text-rose-700"
        >
          Không thể tải danh sách trạm. Hãy kiểm tra kết nối API và thử lại.
        </div>
      )}

      {!loading && !loadError && stations.length === 0 && (
        <div className="absolute inset-0 z-[500] grid place-items-center bg-slate-50/90 p-6 text-center text-sm text-slate-600">
          Không có trạm công khai trong khoảng dữ liệu đã chọn.
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-[500] flex flex-wrap gap-x-3 gap-y-1 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-full bg-[#168c79]" />
          Bản ghi ≤ {SNAPSHOT_MAX_AGE_HOURS} giờ
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-full bg-[#d97706]" />
          Quá {SNAPSHOT_MAX_AGE_HOURS} giờ
        </span>
        <span className="flex items-center gap-1.5">
          <i
            className={`size-2.5 rounded-full ${readingLoading ? 'bg-slate-300' : 'bg-[#94a3b8]'}`}
          />
          {readingLoading ? 'Đang tải số liệu…' : 'Chưa có bản ghi'}
        </span>
      </div>
    </div>
  );
}
