// src/components/sideLineChart.jsx
// (File này được cung cấp ở lượt đầu tiên)

import { useMemo } from 'react';

export default function SideLineChart({
  data = {
    labels: ['0:40', '5:40', '14:10', '20:20'],
    values: [0.44, 1.08, -1.25, 1.08],
  },
  pointName = 'Điểm đo',
  value = null,
  measurementType = 'salinity',
  salinity = undefined,
  distanceKm = 2.5,
  color = '#0ea5e9',
  
  // === PROP MỚI ĐƯỢC THÊM VÀO ===
  // Chỉ số của điểm cần tô vàng (ví dụ: 2)
  highlightedIndex = -1, 
}) {
  const displayValue = (value === null || value === undefined) && (salinity !== undefined) ? salinity : value;

  const svg = useMemo(() => {
    const w = 240;
    const h = 80;
    const padding = { top: 8, right: 12, bottom: 8, left: 12 };
    const innerW = w - padding.left - padding.right;
    const innerH = h - padding.top - padding.bottom;

    const values = data.values || [];
    const len = Math.max(values.length, 1);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const range = max - min || 1;

    const x = (i: number) => padding.left + (i / Math.max(len - 1, 1)) * innerW;
    const y = (val: number) => padding.top + ((max - val) / range) * innerH;

    const path = values.length > 0
      ? values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(' ')
      : '';
      
    // Tính toán tọa độ các điểm
    const points = values.map((v, i) => ({
      cx: x(i),
      cy: y(v),
    }));

    return { w, h, path, points };
  }, [data]);

  return (
    <div className="flex items-stretch overflow-hidden rounded-lg bg-white shadow-sm" style={{ minHeight: '100px' }}>
      {/* Left side: Point info */}
      <div className="flex flex-col justify-center border-r border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-3" style={{ minWidth: '180px' }}>
        <div className="mb-1 text-sm font-semibold text-gray-700">{pointName}</div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <span className="font-medium">{measurementType === 'depth' ? 'Mực nước:' : 'Độ mặn:'}</span>
          <span className="font-semibold text-blue-700">{
            (displayValue === null || displayValue === undefined || Number.isNaN(Number(displayValue)))
              ? '—'
              : `${Number(displayValue).toFixed(2)} ${measurementType === 'depth' ? 'm' : 'g/l'}`
          }</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
          <span className="font-medium">Khoảng cách:</span>
          <span className="font-semibold text-blue-700">{distanceKm.toFixed(1)} km</span>
        </div>
      </div>

      {/* Right side: Minimal line chart */}
      <div className="flex flex-1 items-center justify-center p-2">
        <svg
          viewBox={`0 0 ${svg.w} ${svg.h}`}
          preserveAspectRatio="xMidYMid meet"
          width={svg.w}
          height={svg.h}
          style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
        >
          {/* ... (grid line, path) ... */}
          <line
            x1={12} y1={svg.h / 2} x2={svg.w - 12} y2={svg.h / 2}
            stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4 2"
          />
          <path
            d={svg.path}
            fill="none" stroke={color} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
          />

          {/* Small point markers */}
          {svg.points.map((p, i) => {
            // Sửa lại: Không vẽ điểm highlight ở đây
            if (i === highlightedIndex) return null;
            return (
              <circle
                key={i} cx={p.cx} cy={p.cy} r={3}
                fill={color} stroke="#fff" strokeWidth={1}
              />
            );
          })}
          
          {/* ===>>> ĐIỂM HIGHLIGHT MÀU VÀNG (ĐÃ THÊM) <<<=== */}
          {highlightedIndex !== -1 && svg.points[highlightedIndex] && (
            <circle
              key="highlight"
              cx={svg.points[highlightedIndex].cx}
              cy={svg.points[highlightedIndex].cy}
              r={5} // To hơn một chút
              fill="#FACC15" // Màu vàng
              stroke="#fff"
              strokeWidth={1.5}
            />
          )}
        </svg>
      </div>
    </div>
  );
}