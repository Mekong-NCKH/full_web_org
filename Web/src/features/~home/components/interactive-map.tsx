import L from 'leaflet';
import { useEffect } from 'react';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

import type { Observation, Station } from '@/types/monitoring.type';
import 'leaflet/dist/leaflet.css';

type InteractiveMapProps = {
  stations: Station[];
  observations: Record<string, Observation | null>;
  selectedStationId: string | null;
  onStationSelect: (stationId: string) => void;
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

function markerColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '#94a3b8';
  if (value >= 4000) return '#dc3d53';
  if (value >= 1000) return '#e89b32';
  return '#168c79';
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
  selectedStationId,
  onStationSelect,
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
          const observation = observations[station.id] ?? null;
          const salinity = observation?.salinity.value ?? null;
          const color = markerColor(salinity);
          const selected = station.id === selectedStationId;

          return (
            <CircleMarker
              key={station.id}
              center={[station.location.latitude, station.location.longitude]}
              radius={selected ? 12 : 9}
              pathOptions={{
                color,
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
                    {formatTimestamp(observation?.observedAt)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {stations.length === 0 && (
        <div className="absolute inset-0 z-[500] grid place-items-center bg-slate-50/90 p-6 text-center text-sm text-slate-600">
          Không có trạm công khai trong khoảng dữ liệu đã chọn.
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-[500] flex gap-3 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-full bg-[#168c79]" />
          &lt; 1.000 mg/L
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-full bg-[#e89b32]" />
          1.000–3.999 mg/L
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-full bg-[#dc3d53]" />≥ 4.000 mg/L
        </span>
      </div>
    </div>
  );
}
