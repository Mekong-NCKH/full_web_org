import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  fetchDataRange,
  fetchGISReferenceRules,
  fetchObservationHistory,
  fetchSnapshot,
  fetchStations,
  latestObservationAtOrBefore,
  SNAPSHOT_MAX_AGE_HOURS,
} from '@/services/monitoring-api';
import type {
  DataRange,
  GISReferenceStatus,
  GISReferenceRuleSet,
  Observation,
  SelectedStationReading,
  SnapshotResponse,
  Station,
} from '@/types/monitoring.type';

import { evaluateGISReferenceRule } from './gis-reference';

const InteractiveMap = lazy(() => import('./components/interactive-map'));

export const Route = createFileRoute('/home/')({ component: RouteComponent });

const chartColors = ['#0f766e', '#2563eb', '#db4961'];

function formatDateTime(value: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

function formatChartTick(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

function formatMeasurement(
  value: number | null | undefined,
  unit: string,
): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '—';
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${unit}`;
}

function getObservationTone(
  reading: SelectedStationReading,
  loading: boolean,
): {
  label: string;
  className: string;
} {
  if (loading && reading.freshness === 'missing')
    return {
      label: 'Đang tải',
      className: 'bg-slate-100 text-slate-600',
    };
  if (reading.freshness === 'missing')
    return {
      label: 'Không có số liệu',
      className: 'bg-slate-100 text-slate-600',
    };
  if (reading.freshness === 'stale')
    return {
      label: 'Bản ghi cũ',
      className: 'bg-amber-50 text-amber-800',
    };
  return {
    label:
      reading.observation?.quality === 'unverified'
        ? 'Chưa xác minh'
        : 'Có số liệu',
    className: 'bg-slate-100 text-slate-700',
  };
}

function Icon({ kind }: { kind: 'wave' | 'pin' | 'clock' | 'drop' | 'water' }) {
  const paths = {
    wave: (
      <path d="M3 12c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2M3 17c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" />
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    drop: <path d="M12 3s-6 6.6-6 11a6 6 0 1 0 12 0c0-4.4-6-11-6-11Z" />,
    water: (
      <>
        <path d="M3 8c1.8 0 1.8-1.5 3.6-1.5S8.4 8 10.2 8s1.8-1.5 3.6-1.5S15.6 8 17.4 8 19.2 6.5 21 6.5" />
        <path d="M3 14c1.8 0 1.8-1.5 3.6-1.5s1.8 1.5 3.6 1.5 1.8-1.5 3.6-1.5 1.8 1.5 3.6 1.5 1.8-1.5 3.6-1.5M5 19c1.5 0 1.5-1.2 3-1.2S9.5 19 11 19s1.5-1.2 3-1.2 1.5 1.2 3 1.2" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[kind]}
    </svg>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: 'pin' | 'clock' | 'drop' | 'water';
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
      <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
        <Icon kind={icon} />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function ChartPanel({
  title,
  description,
  data,
  stations,
  metric,
  selectedAt,
  loading,
}: {
  title: string;
  description: string;
  data: Array<Record<string, string | number | null>>;
  stations: Station[];
  metric: 'salinity' | 'waterLevel';
  selectedAt: Date | null;
  loading: boolean;
}) {
  const unit = metric === 'salinity' ? 'mg/L' : 'm';
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {unit}
        </span>
      </div>
      {data.length === 0 ? (
        <div
          role="status"
          className="grid h-56 place-items-center rounded-xl bg-slate-50 text-sm text-slate-500"
        >
          {loading
            ? 'Đang tải dữ liệu lịch sử từ API…'
            : 'Không có dữ liệu lịch sử trong khoảng thời gian này.'}
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
            >
              <CartesianGrid
                stroke="#e8edf2"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="at"
                tickFormatter={formatChartTick}
                minTickGap={32}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                width={60}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <Tooltip
                labelFormatter={(value) => formatDateTime(String(value))}
                formatter={(value, name) => [
                  formatMeasurement(
                    typeof value === 'number' ? value : null,
                    unit,
                  ),
                  String(name),
                ]}
                contentStyle={{
                  borderRadius: 12,
                  borderColor: '#e2e8f0',
                  boxShadow: '0 8px 28px rgba(15,23,42,.08)',
                }}
              />
              <Legend
                verticalAlign="top"
                height={30}
                iconType="circle"
                iconSize={7}
              />
              {selectedAt && (
                <ReferenceLine
                  x={selectedAt.toISOString()}
                  stroke="#475569"
                  strokeDasharray="4 4"
                />
              )}
              {stations.map((station, index) => (
                <Line
                  key={station.id}
                  type="monotone"
                  dataKey={station.id}
                  name={station.name}
                  stroke={chartColors[index % chartColors.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function RouteComponent() {
  const [stations, setStations] = useState<Station[]>([]);
  const [dataRange, setDataRange] = useState<DataRange | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<SnapshotResponse | null>(
    null,
  );
  const [history, setHistory] = useState<Record<string, Observation[]>>({});
  const [selectedAt, setSelectedAt] = useState<Date | null>(null);
  const [dataMode, setDataMode] = useState<'historical' | 'replay'>(
    'historical',
  );
  const [isReplaying, setIsReplaying] = useState(false);
  const [referenceRuleSet, setReferenceRuleSet] =
    useState<GISReferenceRuleSet | null>(null);
  const [referenceRulesLoading, setReferenceRulesLoading] = useState(true);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
            : (nextStations[0]?.id ?? null),
        );
        setSelectedAt(nextRange.to ? new Date(nextRange.to) : null);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Không thể kết nối đến API giám sát.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (!dataRange?.to) {
      setLatestSnapshot(null);
      return;
    }
    const controller = new AbortController();
    fetchSnapshot(new Date(dataRange.to), controller.signal)
      .then(setLatestSnapshot)
      .catch(() => {
        if (!controller.signal.aborted) setLatestSnapshot(null);
      });
    return () => controller.abort();
  }, [dataRange]);

  useEffect(() => {
    if (!dataRange?.from || !dataRange.to || stations.length === 0) {
      setHistory({});
      return;
    }

    const controller = new AbortController();
    setHistoryLoading(true);
    Promise.all(
      stations.map(
        async (station) =>
          [
            station.id,
            await fetchObservationHistory(
              station.id,
              dataRange.from!,
              dataRange.to!,
              controller.signal,
            ),
          ] as const,
      ),
    )
      .then((entries) => setHistory(Object.fromEntries(entries)))
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Không thể tải lịch sử quan trắc.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });

    return () => controller.abort();
  }, [dataRange, stations]);

  const observationsAtSelection = useMemo(() => {
    const selectedTime = selectedAt?.getTime();
    if (selectedTime === undefined || !selectedAt)
      return {} as Record<string, SelectedStationReading>;

    const latestAtWindowEnd = dataRange?.to
      ? new Date(dataRange.to).getTime() === selectedTime
      : false;
    const snapshotById = new Map(
      latestSnapshot?.data.map((row) => [row.station.id, row.observation]) ??
        [],
    );
    return Object.fromEntries(
      stations.map((station) => {
        const historicalObservation = latestObservationAtOrBefore(
          history[station.id] ?? [],
          selectedAt,
        );
        const observation = latestAtWindowEnd
          ? (snapshotById.get(station.id) ?? historicalObservation)
          : historicalObservation;
        if (!observation)
          return [
            station.id,
            { observation: null, freshness: 'missing' },
          ];
        const observedAt = new Date(observation.observedAt).getTime();
        if (!Number.isFinite(observedAt) || observedAt > selectedTime)
          return [
            station.id,
            { observation: null, freshness: 'missing' },
          ];
        const ageMs = selectedTime - observedAt;
        return [
          station.id,
          {
            observation,
            freshness:
              ageMs <= SNAPSHOT_MAX_AGE_HOURS * 60 * 60 * 1000
                ? 'fresh'
                : 'stale',
          },
        ];
      }),
    ) as Record<string, SelectedStationReading>;
  }, [dataRange, history, latestSnapshot, selectedAt, stations]);

  const chartData = useMemo(() => {
    const points = new Map<string, Record<string, string | number | null>>();
    for (const station of stations) {
      for (const observation of history[station.id] ?? []) {
        const point = points.get(observation.observedAt) ?? {
          at: observation.observedAt,
        };
        point[station.id] = observation.salinity.value;
        point[`${station.id}_water`] = observation.waterLevel.value;
        points.set(observation.observedAt, point);
      }
    }
    return [...points.values()].sort((left, right) =>
      String(left.at).localeCompare(String(right.at)),
    );
  }, [history, stations]);

  const replayTimes = useMemo(
    () =>
      chartData
        .map((point) => new Date(String(point.at)).getTime())
        .filter((time) => Number.isFinite(time)),
    [chartData],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchGISReferenceRules(controller.signal)
      .then(setReferenceRuleSet)
      .catch(() => {
        if (!controller.signal.aborted) setReferenceRuleSet(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setReferenceRulesLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isReplaying || !selectedAt || replayTimes.length === 0) return;
    const timer = window.setTimeout(() => {
      const nextTime = replayTimes.find(
        (time) => time > selectedAt.getTime(),
      );
      if (nextTime === undefined) {
        setIsReplaying(false);
        return;
      }
      setSelectedAt(new Date(nextTime));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [isReplaying, replayTimes, selectedAt]);

  const referenceStatuses = useMemo(
    () =>
      Object.fromEntries(
        stations.map((station) => [
          station.id,
          evaluateGISReferenceRule(
            referenceRuleSet,
            station.id,
            observationsAtSelection[station.id]?.observation ?? null,
          ),
        ]),
      ) as Record<string, GISReferenceStatus>,
    [observationsAtSelection, referenceRuleSet, stations],
  );

  const salinityChartData = useMemo(
    () =>
      chartData.map((point) => {
        const values = Object.fromEntries(
          stations.map((station) => [station.id, point[station.id] ?? null]),
        );
        return { at: point.at, ...values };
      }),
    [chartData, stations],
  );

  const waterLevelChartData = useMemo(
    () =>
      chartData.map((point) => {
        const values = Object.fromEntries(
          stations.map((station) => [
            station.id,
            point[`${station.id}_water`] ?? null,
          ]),
        );
        return { at: point.at, ...values };
      }),
    [chartData, stations],
  );

  const historyCount = Object.values(history).reduce(
    (total, rows) => total + rows.length,
    0,
  );
  const periodText =
    dataRange?.from && dataRange.to
      ? `${formatDateTime(dataRange.from)} – ${formatDateTime(dataRange.to)}`
      : 'Chưa có khoảng dữ liệu';
  const selectedStation =
    stations.find((station) => station.id === selectedStationId) ?? null;

  return (
    <main className="min-h-screen bg-[#f4f7fa] text-slate-900">
      <header className="sticky top-0 z-[1100] border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <a
            href="#top"
            className="flex items-center gap-3"
            aria-label="Mekong Salinity Monitor, trang đầu"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#0d3b4a] text-teal-100">
              <Icon kind="wave" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-wide text-slate-900">
                MEKONG MONITOR
              </span>
              <span className="block text-[11px] text-slate-500">
                Cổng dữ liệu quan trắc
              </span>
            </span>
          </a>
          <nav
            className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex"
            aria-label="Điều hướng chính"
          >
            <a className="transition hover:text-teal-800" href="#overview">
              Tổng quan
            </a>
            <a className="transition hover:text-teal-800" href="#stations">
              Trạm quan trắc
            </a>
            <a className="transition hover:text-teal-800" href="#history">
              Lịch sử
            </a>
            <a className="transition hover:text-teal-800" href="#about-data">
              Nguồn dữ liệu
            </a>
          </nav>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-amber-800">
            {dataMode === 'replay'
              ? 'PHÁT LẠI DỮ LIỆU LỊCH SỬ'
              : 'BẢN DEMO LỊCH SỬ'}
          </span>
        </div>
      </header>

      <div
        id="top"
        className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8"
      >
        <section
          id="overview"
          className="relative overflow-hidden rounded-[28px] bg-[#0d3542] px-6 py-8 text-white shadow-[0_20px_60px_rgba(13,53,66,0.16)] sm:px-10 sm:py-11"
        >
          <div className="pointer-events-none absolute -right-10 -top-24 size-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-16 size-64 rounded-full border border-white/10" />
          <div className="relative grid items-end gap-8 lg:grid-cols-[1fr_340px]">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-200/10 px-3 py-1.5 text-xs font-medium text-teal-100">
                <span className="size-1.5 rounded-full bg-teal-300" /> Dữ liệu
                lịch sử · 01/06–31/07/2024
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[42px]">
                Theo dõi độ mặn và mực nước tại các cửa sông Mekong
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Bản đồ quan trắc và chuỗi số liệu theo giờ giúp người dân xem
                diễn biến tại từng trạm trong khoảng demo đã chọn.
              </p>
              <a
                href="#stations"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0d3542] transition hover:bg-teal-50"
              >
                Xem dữ liệu trạm <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
                  Cửa sổ dữ liệu
                </p>
                <Icon kind="clock" />
              </div>
              <p className="mt-3 text-lg font-semibold">
                Tháng 6 – tháng 7, 2024
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Múi giờ hiển thị: Việt Nam (UTC+07:00)
              </p>
              <div className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-slate-300">
                Đây là dữ liệu lịch sử phục vụ demo, không phải số đo thời gian
                thực.
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800"
          >
            <span>Không tải được dữ liệu từ backend: {error}</span>
            <button
              onClick={() => setReloadKey((key) => key + 1)}
              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold hover:bg-rose-100"
            >
              Thử lại
            </button>
          </div>
        )}

        <section
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Chỉ số tổng quan"
        >
          <MetricCard
            icon="pin"
            label="Trạm có dữ liệu công khai"
            value={loading ? '…' : String(stations.length)}
            detail="Chỉ gồm trạm có vị trí đã xác định"
          />
          <MetricCard
            icon="clock"
            label="Khoảng demo"
            value="61 ngày"
            detail="01/06/2024 đến 31/07/2024"
          />
          <MetricCard
            icon="drop"
            label="Quan trắc độ mặn"
            value={historyLoading ? '…' : historyCount.toLocaleString('vi-VN')}
            detail="Giá trị chuẩn hóa sang mg/L"
          />
          <MetricCard
            icon="water"
            label="Mực nước"
            value={stations.length ? 'Theo giờ' : '—'}
            detail="Mét, theo mốc mực nước biển của nguồn"
          />
        </section>

        <section id="stations" className="mt-10 scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                Giám sát theo vị trí
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Bản đồ trạm quan trắc
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Nguồn tọa độ: cong_locations.csv
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(310px,0.75fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:p-3">
              <Suspense
                fallback={
                  <div className="grid h-[500px] place-items-center text-sm text-slate-500">
                    Đang tải bản đồ…
                  </div>
                }
              >
                <InteractiveMap
                  stations={stations}
                  observations={observationsAtSelection}
                  referenceStatuses={referenceStatuses}
                  ruleSetVersion={referenceRuleSet?.version ?? null}
                  dataMode={dataMode}
                  selectedStationId={selectedStationId}
                  onStationSelect={setSelectedStationId}
                  loading={loading}
                  loadError={Boolean(error && stations.length === 0)}
                  readingLoading={historyLoading}
                />
              </Suspense>
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Tình hình tại trạm
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedAt
                      ? formatDateTime(selectedAt)
                      : 'Chưa chọn thời điểm'}
                  </p>
                </div>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                  UTC+7
                </span>
              </div>

              <label
                htmlFor="demo-time"
                className="mt-5 block text-xs font-medium text-slate-600"
              >
                Chọn thời điểm trong dữ liệu
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsReplaying(false);
                    setDataMode('historical');
                  }}
                  aria-pressed={dataMode === 'historical'}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${dataMode === 'historical' ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-600'}`}
                >
                  Lịch sử
                </button>
                <button
                  type="button"
                  disabled={historyLoading || replayTimes.length === 0}
                  onClick={() => {
                    setDataMode('replay');
                    if (
                      !selectedAt ||
                      selectedAt.getTime() >=
                        replayTimes[replayTimes.length - 1]
                    ) {
                      setSelectedAt(new Date(replayTimes[0]));
                    }
                    setIsReplaying(true);
                  }}
                  className="rounded-lg border border-teal-700 bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Phát lại
                </button>
                <button
                  type="button"
                  disabled={!isReplaying}
                  onClick={() => setIsReplaying(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tạm dừng
                </button>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                  Live: chưa cấu hình
                </span>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                  Forecast: chưa cấu hình
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Replay phát tuần tự các quan trắc lịch sử theo thời gian. Đây là
                mô phỏng, không phải luồng dữ liệu trực tiếp.
              </p>
              <input
                id="demo-time"
                className="mt-3 h-2 w-full cursor-pointer accent-teal-700"
                type="range"
                min={dataRange?.from ? new Date(dataRange.from).getTime() : 0}
                max={dataRange?.to ? new Date(dataRange.to).getTime() : 0}
                step={60 * 60 * 1000}
                value={selectedAt?.getTime() ?? 0}
                disabled={!dataRange?.from || !dataRange.to || loading}
                onChange={(event) => {
                  setIsReplaying(false);
                  setDataMode('historical');
                  setSelectedAt(new Date(Number(event.target.value)));
                }}
              />
              <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                <span>
                  {dataRange?.from ? formatDateTime(dataRange.from) : '—'}
                </span>
                <span>
                  {dataRange?.to ? formatDateTime(dataRange.to) : '—'}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                    Đang tải danh sách trạm…
                  </div>
                ) : stations.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                    Chưa có trạm trong cửa sổ dữ liệu.
                  </div>
                ) : (
                  stations.map((station) => {
                    const reading = observationsAtSelection[station.id] ?? {
                      observation: null,
                      freshness: 'missing',
                    };
                    const observation = reading.observation;
                    const salinity = observation?.salinity.value ?? null;
                    const referenceStatus = referenceStatuses[station.id];
                    const tone = getObservationTone(
                      reading,
                      historyLoading,
                    );
                    const active = station.id === selectedStationId;
                    const freshnessNote =
                      reading.freshness === 'stale'
                        ? ` · cách thời điểm chọn hơn ${SNAPSHOT_MAX_AGE_HOURS} giờ`
                        : '';
                    const recordLabel =
                      reading.freshness === 'stale'
                        ? 'Bản ghi cũ'
                        : 'Bản ghi';
                    const recordTimestamp = observation
                      ? formatDateTime(observation.observedAt)
                      : null;
                    const recordDescription = recordTimestamp
                      ? `${recordLabel}: ${recordTimestamp}${freshnessNote}`
                      : historyLoading
                        ? 'Đang tải số liệu lịch sử…'
                        : 'Không có bản ghi trước thời điểm đã chọn';
                    return (
                      <button
                        key={station.id}
                        onClick={() => setSelectedStationId(station.id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${active ? 'border-teal-700/40 bg-teal-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex items-center gap-2 font-semibold text-slate-900">
                            <span
                              className={`size-2 rounded-full ${active ? 'bg-teal-700' : 'bg-slate-300'}`}
                            />
                            {station.name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${tone.className}`}
                          >
                            {tone.label}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[11px] text-slate-500">Độ mặn</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-900">
                              {formatMeasurement(salinity, 'mg/L')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500">
                              Mực nước
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-900">
                              {formatMeasurement(
                                observation?.waterLevel.value,
                                'm',
                              )}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-[10px] text-slate-500">
                          {recordDescription}
                        </p>
                        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-800">
                              Mô phỏng tham khảo v
                              {referenceRuleSet?.version ?? '…'}
                            </span>
                            <span className="text-xs font-semibold text-indigo-950">
                              {referenceStatus?.label ??
                                (referenceRulesLoading
                                  ? 'Đang tải quy tắc'
                                  : 'Không có kết quả')}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] leading-4 text-indigo-800">
                            Chưa xác nhận vận hành; không phải trạng thái thực
                            tế của cửa.
                          </p>
                          {referenceStatus?.basis && (
                            <p className="mt-1 text-[10px] leading-4 text-indigo-700">
                              Căn cứ: {referenceStatus.basis}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        </section>

        <section id="history" className="mt-10 scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                Chuỗi quan trắc
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Diễn biến theo thời gian
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {historyLoading
                ? 'Đang tải lịch sử…'
                : `${historyCount.toLocaleString('vi-VN')} bản ghi đã tải`}
            </span>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartPanel
              title="Độ mặn"
              description="So sánh chuỗi theo giờ tại các trạm công khai."
              data={salinityChartData}
              stations={stations}
              metric="salinity"
              selectedAt={selectedAt}
              loading={historyLoading}
            />
            <ChartPanel
              title="Mực nước"
              description="Giá trị mét theo mốc mực nước biển của nguồn."
              data={waterLevelChartData}
              stations={stations}
              metric="waterLevel"
              selectedAt={selectedAt}
              loading={historyLoading}
            />
          </div>
        </section>

        <section
          id="about-data"
          className="mt-10 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:p-7"
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                Minh bạch dữ liệu
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Nguồn và cách đọc số liệu
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Màn hình lấy danh sách trạm, ảnh chụp theo thời điểm và chuỗi
                lịch sử trực tiếp từ Monitoring API. Phạm vi demo dùng
                BaoDinh.csv, giới hạn ở các trạm có tọa độ đã xác định.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs text-slate-500">Độ mặn</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  mg/L · chuẩn hóa từ g/L × 1.000
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs text-slate-500">Mực nước</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  m · theo mốc mực nước biển nguồn
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs text-slate-500">Khoảng thời gian</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {periodText}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs text-slate-500">
                  Trạng thái kiểm chứng
                </dt>
                <dd className="mt-1 text-sm font-semibold text-amber-800">
                  Nguồn và chất lượng: chưa xác minh độc lập
                </dd>
              </div>
            </dl>
          </div>
          {selectedStation && (
            <p className="mt-5 text-[11px] text-slate-500">
              Tọa độ trạm đang chọn ({selectedStation.name}) lấy từ{' '}
              {selectedStation.location.source}.
            </p>
          )}
        </section>

        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 px-1 pt-5 text-xs text-slate-500 sm:flex-row">
          <span>Mekong Monitor · Cổng thông tin dữ liệu quan trắc</span>
          <span>
            Demo lịch sử · Không đại diện cho cảnh báo hoặc số liệu thời gian
            thực
          </span>
        </footer>
      </div>
    </main>
  );
}
