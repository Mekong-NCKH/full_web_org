import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Metric = {
  n: number;
  mae: number;
  rmse: number;
  bias: number;
  normalizedMae: number;
  normalizedRmse: number;
};

type ForecastModel = {
  name: string;
  normalizedMae: number;
  normalizedRmse: number;
  bestEpoch: number;
  rank: number;
};

type ForecastBaseline = {
  name: string;
  label: string;
  normalizedMae: number;
  normalizedRmse: number;
};

type ForecastSeries = {
  stationId: string;
  stationLabel: string;
  target: 'salinity' | 'water_level';
  targetLabel: string;
  unit: string;
  forecastModels: Record<string, Metric>;
  forecastBaselines: Record<string, Metric>;
};

type ResearchReport = {
  source: {
    filename: string;
    sha256: string;
    from: string;
    to: string;
    timezone: string;
    stations: string[];
    seriesCount: number;
    observationCountPerSeries: number;
  };
  protocol: {
    lookbackHours: number;
    forecastHorizonHours: number;
    forecastHoldoutStart: string;
    forecastOriginCount: number;
    forecastScoredPointsPerSeries: number;
    holdoutHours: number;
    metric: string;
  };
  qualityFlags: {
    sourceHasNoMissingValuesInSelectedWindow: boolean;
    negativeSalinityObservationsByStation: Record<string, number>;
    negativeValuesPreserved: boolean;
  };
  forecastModels: ForecastModel[];
  forecastBaselines: ForecastBaseline[];
  series: ForecastSeries[];
  useBoundary: string;
};

const MODEL_COLORS: Record<string, string> = {
  PatchTST: '#2878b5',
  DLinear: '#d68a25',
  iTransformer: '#718096',
  TimesNet: '#0c766e',
  persistence: '#a5afb7',
  daily_seasonal_naive_24h: '#c4cbd0',
  dlinear_univariate: '#8c989f',
};

function formatScore(value: number, digits = 4): string {
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatNumber(value: number, unit: string): string {
  const formatted = value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

export default function ForecastResearchPanel() {
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [stationId, setStationId] = useState('baodinh');
  const [target, setTarget] = useState<'salinity' | 'water_level'>('salinity');

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL(
      `${import.meta.env.BASE_URL}research/imputation-benchmark.json`,
      window.location.origin,
    );

    setLoading(true);
    setError(null);
    fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Không tải được báo cáo (${response.status}).`);
        }
        return (await response.json()) as ResearchReport;
      })
      .then(setReport)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(
          reason instanceof Error
            ? reason.message
            : 'Không tải được báo cáo nghiên cứu.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const selectedSeries = report?.series.find(
    (item) => item.stationId === stationId && item.target === target,
  );
  const comparison = useMemo(() => {
    if (!report || !selectedSeries) return [];
    const rows = [
      ...report.forecastModels.map((model) => ({
        key: model.name,
        label: model.name,
        metric: selectedSeries.forecastModels[model.name],
      })),
      ...report.forecastBaselines.map((baseline) => ({
        key: baseline.name,
        label: baseline.label,
        metric: selectedSeries.forecastBaselines[baseline.name],
      })),
    ].filter((row) => row.metric);
    return rows.sort(
      (left, right) => left.metric.normalizedMae - right.metric.normalizedMae,
    );
  }, [report, selectedSeries]);

  return (
    <section id="forecast-research" className="mt-10 scroll-mt-24">
      <div className="relative overflow-hidden rounded-[28px] bg-[#0d3542] px-6 py-7 text-white shadow-[0_20px_60px_rgba(13,53,66,0.16)] sm:p-9">
        <div className="pointer-events-none absolute -right-10 -top-24 size-80 rounded-full border border-white/10" />
        <div className="relative grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-200/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-teal-100">
              <span className="size-1.5 rounded-full bg-amber-300" />
              THỬ NGHIỆM NGHIÊN CỨU · DỰ BÁO 24 GIỜ
            </p>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              Đánh giá mô hình dự báo độ mặn và mực nước
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              So sánh bốn mô hình Time-Series-Library với các mốc dự báo đơn giản
              trên sáu chuỗi quan trắc. Bài báo tải về phân tích riêng cả dự báo
              lẫn nội suy và giải thích cách chọn ba mô hình nghiên cứu.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#forecast-results"
                className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0d3542] transition hover:bg-teal-50"
              >
                Xem kết quả dự báo <span className="ml-2" aria-hidden="true">↓</span>
              </a>
              <a
                href={`${import.meta.env.BASE_URL}research/imputation-assessment.md`}
                download="mekong-forecast-imputation-assessment.md"
                className="inline-flex items-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Bài báo: dự báo & nội suy{' '}
                <span className="ml-2" aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-100">
              Thiết kế dự báo
            </p>
            <p className="mt-3 text-lg font-semibold">96 giờ → 24 giờ</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Cửa sổ tháng 6–7/2024 · 3 trạm · 6 chuỗi
            </p>
            <div className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-slate-300">
              Chỉ số nghiên cứu ngoại tuyến; dự báo chưa được công bố như số đo
              quan trắc trên bản đồ.
            </div>
          </div>
        </div>
      </div>

      {loading && !report && (
        <div
          className="mt-5 rounded-2xl border border-slate-200 bg-white p-7 text-center text-sm text-slate-500"
          role="status"
        >
          Đang tải kết quả tái lập…
        </div>
      )}
      {error && (
        <div
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold hover:bg-rose-100"
          >
            Tải lại
          </button>
        </div>
      )}

      {report && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Thiết kế đánh giá dự báo">
            <ProtocolCard
              label="Dự báo"
              value={`${report.protocol.forecastHorizonHours} giờ kế tiếp`}
              detail={`${report.protocol.lookbackHours} giờ lịch sử làm ngữ cảnh`}
            />
            <ProtocolCard
              label="Backtest"
              value={`${report.protocol.forecastOriginCount} mốc dự báo`}
              detail="Mỗi mốc dự báo 24 giờ không chồng lấp"
            />
            <ProtocolCard
              label="Điểm được chấm"
              value={`${report.protocol.forecastScoredPointsPerSeries} giờ / chuỗi`}
              detail="8 giờ cuối holdout không đủ một khối 24 giờ"
            />
          </div>

          <section id="forecast-results" className="mt-8 scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-800">
                  Kết quả chính
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  So sánh khả năng dự báo
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Điểm thấp hơn là tốt hơn. Thứ hạng mô hình dựa trên nMAE macro
                  cân bằng sáu chuỗi; biểu đồ dưới đây cho phép kiểm tra riêng
                  từng trạm và chỉ tiêu.
                </p>
              </div>
              <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900">
                Holdout từ {formatDate(report.protocol.forecastHoldoutStart)}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {report.forecastModels.map((model) => (
                <article
                  key={model.name}
                  className={`rounded-2xl border bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.04)] ${model.rank === 1 ? 'border-teal-700/30 ring-1 ring-teal-700/10' : 'border-slate-200'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-teal-800">
                        Dự báo · hạng {model.rank}
                      </p>
                      <h4 className="mt-1.5 text-lg font-semibold text-slate-900">
                        {model.name}
                      </h4>
                    </div>
                    <span className="grid size-8 place-items-center rounded-full bg-[#eaf4f2] text-xs font-bold text-teal-900">
                      0{model.rank}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-500">nMAE</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-[#0d3542]">
                        {formatScore(model.normalizedMae)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">nRMSE</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-slate-800">
                        {formatScore(model.normalizedRmse)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500">
                    Checkpoint tốt nhất: epoch {model.bestEpoch}/40. Một lần chạy;
                    độ hội tụ và độ ổn định chưa được xác nhận.
                  </p>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-800">
                  Kiểm tra theo trạm
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                  Sai số trên chuỗi đã chọn
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  nMAE được chuẩn hóa theo độ lệch chuẩn của tập huấn luyện; bảng
                  kèm sai số ở đơn vị quan trắc.
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Trạm
                  <select
                    value={stationId}
                    onChange={(event) => setStationId(event.target.value)}
                    className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-700 focus:ring-teal-700"
                  >
                    {report.source.stations.map((id) => {
                      const row = report.series.find((item) => item.stationId === id);
                      return (
                        <option key={id} value={id}>
                          {row?.stationLabel ?? id}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Chỉ tiêu
                  <select
                    value={target}
                    onChange={(event) =>
                      setTarget(event.target.value as 'salinity' | 'water_level')
                    }
                    className="mt-1.5 block w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-700 focus:ring-teal-700"
                  >
                    <option value="salinity">Độ mặn (mg/L)</option>
                    <option value="water_level">Mực nước (m)</option>
                  </select>
                </label>
              </div>

              {selectedSeries && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f1f6f5] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedSeries.stationLabel} · {selectedSeries.targetLabel}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      18 backtest origins · 432 target points · đơn vị {selectedSeries.unit}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-teal-900">
                    nMAE thấp hơn là tốt hơn
                  </span>
                </div>
              )}

              <div className="mt-3 h-[300px] w-full" aria-label="Biểu đồ so sánh nMAE dự báo">
                {selectedSeries && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                    <BarChart
                      data={comparison}
                      layout="vertical"
                      margin={{ top: 6, right: 22, bottom: 6, left: 4 }}
                    >
                      <CartesianGrid
                        stroke="#e8eef0"
                        horizontal={false}
                        strokeDasharray="3 4"
                      />
                      <XAxis
                        type="number"
                        domain={[0, 'dataMax + 0.12']}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(value: number) => value.toFixed(2)}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={150}
                        tick={{ fill: '#475569', fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          typeof value === 'number' ? value.toFixed(4) : value,
                          'nMAE',
                        ]}
                      />
                      <Bar
                        dataKey="metric.normalizedMae"
                        name="nMAE"
                        barSize={24}
                        radius={[0, 7, 7, 0]}
                      >
                        {comparison.map((row) => (
                          <Cell
                            key={row.key}
                            fill={MODEL_COLORS[row.key] ?? '#8c989f'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {selectedSeries && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-3 font-semibold">Phương pháp</th>
                        <th className="py-2 pr-3 text-right font-semibold">MAE ({selectedSeries.unit})</th>
                        <th className="py-2 pr-3 text-right font-semibold">RMSE ({selectedSeries.unit})</th>
                        <th className="py-2 pr-3 text-right font-semibold">Bias ({selectedSeries.unit})</th>
                        <th className="py-2 text-right font-semibold">nMAE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((row) => (
                        <tr key={row.key} className="border-b border-slate-100 last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-slate-700">{row.label}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">
                            {formatNumber(row.metric.mae, '')}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">
                            {formatNumber(row.metric.rmse, '')}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500">
                            {formatNumber(row.metric.bias, '')}
                          </td>
                          <td className="py-2.5 text-right font-semibold tabular-nums text-slate-800">
                            {formatScore(row.metric.normalizedMae)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <aside className="rounded-2xl border border-amber-200 bg-[#fffaf0] p-5 sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800">
                Giới hạn cần đọc cùng kết quả
              </p>
              <h3 className="mt-2 text-xl font-semibold leading-7 text-slate-900">
                Dự báo nghiên cứu chưa phải dữ liệu vận hành.
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <li>
                  <strong>{report.protocol.forecastOriginCount} mốc</strong> trên
                  một holdout duy nhất; chưa có kiểm tra theo mùa hoặc nhiều năm.
                </li>
                <li>
                  Cả bốn checkpoint tốt nhất đều chạm giới hạn huấn luyện 40 epoch;
                  cần kiểm tra hội tụ trước khi kết luận mô hình ổn định.
                </li>
                <li>
                  Kết quả nội suy được đánh giá riêng trong bài báo bằng các điểm
                  bị che nhân tạo; không điền giá trị khuyết vào nguồn quan trắc.
                </li>
              </ul>
              <div className="mt-5 rounded-xl border border-amber-200/80 bg-white/70 p-4">
                <p className="text-xs font-bold text-amber-900">
                  Cờ dữ liệu nguồn · số đo độ mặn âm được giữ nguyên
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {report.source.stations.map((id) => (
                    <div key={id} className="rounded-lg bg-amber-50 px-3 py-2">
                      <p className="text-[10px] font-medium text-amber-800">
                        {id === 'baodinh' ? 'Bao Dinh' : id === 'gocat' ? 'Go Cat' : 'Vam Kenh'}
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-amber-950">
                        {report.qualityFlags.negativeSalinityObservationsByStation[id] ?? 0}
                      </p>
                      <p className="text-[10px] text-amber-800">điểm âm</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-5 text-amber-900">
                  Cần xác minh quy ước và chất lượng đo trước khi diễn giải các giá
                  trị này theo nghĩa vật lý.
                </p>
              </div>
            </aside>
          </div>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-800">
                  Nguồn và protocol
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                  Bằng chứng có thể truy vết
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Bảng chỉ chứa sai số tổng hợp; không chứa giá trị quan trắc hoặc
                  dự báo theo giờ.
                </p>
                <dl className="mt-5 space-y-3 text-xs">
                  <EvidenceRow label="Tệp nguồn" value={report.source.filename} />
                  <EvidenceRow
                    label="Khoảng dữ liệu"
                    value={`${formatDate(report.source.from)} – ${formatDate(report.source.to)} · UTC+07`}
                  />
                  <EvidenceRow
                    label="Chuỗi"
                    value={`${report.source.seriesCount} chuỗi · ${report.source.stations.length} trạm · ${report.source.observationCountPerSeries.toLocaleString('vi-VN')} giờ`}
                  />
                  <EvidenceRow
                    label="Holdout"
                    value={`${report.protocol.holdoutHours} giờ · bắt đầu ${formatDate(report.protocol.forecastHoldoutStart)}`}
                  />
                  <EvidenceRow label="SHA-256" value={`${report.source.sha256.slice(0, 16)}…`} mono />
                </dl>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">
                  Mốc so sánh dự báo
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {report.forecastBaselines.map((baseline) => (
                    <div key={baseline.name} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-800">{baseline.label}</p>
                      <p className="mt-2 text-[11px] text-slate-500">nMAE</p>
                      <p className="font-semibold tabular-nums text-slate-900">
                        {formatScore(baseline.normalizedMae)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        nRMSE {formatScore(baseline.normalizedRmse)}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                  Macro score là trung bình không trọng số của sáu chuỗi; MAE/RMSE
                  trong bảng chi tiết giữ nguyên đơn vị mg/L hoặc m.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function ProtocolCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.03)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-[#0d3542]">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function EvidenceRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`break-words text-right font-semibold text-slate-800 ${mono ? 'font-mono text-[10px]' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
