import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react';

import { fetchDataRange, fetchObservationSeries, fetchStations } from '@/services/monitoring-api';
import type { DataRange, Observation, Station } from '@/types/monitoring.type';

export const Route = createFileRoute('/_private/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [stations, setStations] = useState<Station[]>([]);
  const [dataRange, setDataRange] = useState<DataRange | null>(null);
  const [selectedStationId, setSelectedStationId] = useState('');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateTime = (value: string | Date | null) => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);
  };

  const formatValue = (value: number | null, unit: string) => {
    if (value === null || !Number.isFinite(value)) return '—';
    return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${unit}`;
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      fetchStations(controller.signal),
      fetchDataRange(controller.signal),
    ])
      .then(([nextStations, nextRange]) => {
        setStations(nextStations);
        setDataRange(nextRange);
        setSelectedStationId((current) =>
          current && nextStations.some((station) => station.id === current)
            ? current
            : (nextStations[0]?.id ?? ''),
        );
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Không thể tải danh sách trạm.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedStationId || !dataRange?.from || !dataRange.to) {
      setObservations([]);
      return;
    }
    const controller = new AbortController();
    const end = new Date(dataRange.to);
    const start = new Date(
      Math.max(
        new Date(dataRange.from).getTime(),
        end.getTime() - 23 * 60 * 60 * 1000,
      ),
    );
    setSeriesLoading(true);
    setObservations([]);
    fetchObservationSeries(selectedStationId, start, end, controller.signal)
      .then(setObservations)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Không thể tải quan trắc của trạm.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setSeriesLoading(false);
      });
    return () => controller.abort();
  }, [dataRange, selectedStationId]);

  const selectedStation = stations.find(
    (station) => station.id === selectedStationId,
  );

  return (
    <main className="min-h-[70vh] bg-[#f5f8fc] text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-9">
        <section className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-t-4 border-blue-100 border-t-[#069843] bg-white p-5 shadow-[0_8px_28px_rgba(0,86,179,0.08)] sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#118642]">
              Bảng quan trắc
            </p>
            <h1 className="mt-1 text-2xl font-black text-[#075fc5]">
              {selectedStation?.name ?? 'Dữ liệu theo trạm'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Dữ liệu lịch sử · 24 giờ cuối của cửa sổ công khai · UTC+7
            </p>
          </div>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Chọn trạm
            <select
              value={selectedStationId}
              onChange={(event) => setSelectedStationId(event.target.value)}
              disabled={loading || stations.length === 0}
              className="min-w-52 rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#075fc5] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Không tải được dữ liệu: {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 p-4 sm:px-5">
            <div>
              <h2 className="font-bold text-[#075fc5]">Quan trắc theo giờ</h2>
              <p className="mt-1 text-xs text-slate-500">
                {dataRange?.to
                  ? `Khoảng dữ liệu kết thúc ${formatDateTime(dataRange.to)}`
                  : 'Đang tải khoảng dữ liệu…'}
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              Chất lượng nguồn: chưa xác minh độc lập
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-[#075fc5] text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Thời điểm (UTC+7)</th>
                  <th className="px-4 py-3 text-right font-semibold">Mực nước (m)</th>
                  <th className="px-4 py-3 text-right font-semibold">Độ mặn (mg/L)</th>
                  <th className="px-4 py-3 font-semibold">Chất lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {observations.map((observation) => (
                  <tr key={observation.id} className="hover:bg-blue-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatDateTime(observation.observedAt)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatValue(observation.waterLevel.value, 'm')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#075fc5]">
                      {formatValue(observation.salinity.value, 'mg/L')}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-amber-800">
                      {observation.quality === 'unverified'
                        ? 'Chưa xác minh'
                        : observation.quality}
                    </td>
                  </tr>
                ))}
                {(loading || seriesLoading) && observations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      Đang tải quan trắc…
                    </td>
                  </tr>
                )}
                {!loading && !seriesLoading && observations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      Không có bản ghi trong khoảng thời gian này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-blue-50 px-4 py-3 text-xs text-slate-500 sm:px-5">
            BaoDinh.csv · Độ mặn đã chuẩn hóa sang mg/L · Không phải dữ liệu thời gian thực.
          </div>
        </section>
      </div>
    </main>
  )
}
