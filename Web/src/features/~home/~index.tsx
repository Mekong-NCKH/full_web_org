import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react';

import LoggedInLayout from '@/components/logged-in-layout'
import type { RawDataRecord } from '@/types/home.type'

// using automatic JSX runtime
import InteractiveMap from './components/interactive-map';
import SalinityNewsSwiper from './components/salinity-news-swipper';
import SideLineChart from './components/side-line-char';
import TimeSelectorContent from './components/time-selector';

export const Route = createFileRoute('/home/')({
  component: RouteComponent,
})


// === CÁC HÀM HELPER (Đưa ra ngoài component) ===

/**
 * Helper to extract salinity value from a record
 */
const getSal = (rec: Record<string, any>) => {
  const keys = ['sal_song_gpl', 'sal_dong_gpl', 'sal_surface_gpl', 'sal_bottom_gpl'];
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null) return Number(rec[k]);
  }
  return null;
};

/**
 * Helper to extract depth (surface) value
 */
const getDepth = (rec: Record<string, any>) => {
  const keys = ['m_song_m', 'm_dong_m', 'depth_surface_m', 'depth_bottom_m'];
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null) return Number(rec[k]);
  }
  return null;
};

/**
 * Helper to parse timestamp from data.json format
 */
const parseTimestamp = (datePart: string, timePart: string) => {
  let ts = null;
  try {
    // Thử chuẩn ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      ts = new Date(datePart + 'T' + (timePart || '00:00') + ':00');
    } else {
      // Thử fallback dd/mm
      const d = (datePart || '').split('/').map(s => s.trim());
      if (d.length >= 2) {
        const day = d[0].padStart(2, '0');
        const month = d[1].padStart(2, '0');
        const iso = `2020-${month}-${day}T${(timePart || '00:00')}:00`;
        ts = new Date(iso);
      } else {
        ts = new Date(); // Fallback
      }
    }
  } catch {
    ts = new Date(); // Lỗi
  }
  return ts.getTime();
};


function RouteComponent() {
  // === STATE QUẢN LÝ THỜI GIAN ===
  const [currentTime] = useState(new Date('2020-01-01T10:00:00'));
  const [selectedTime, setSelectedTime] = useState(currentTime);

  // State để lưu dữ liệu thô (fetch 1 lần)
  const [allRawData, setAllRawData] = useState<RawDataRecord[]>([]);

  // === useEffect===
  // Chỉ dùng để fetch và lưu dữ liệu thô 1 lần
  useEffect(() => {
    fetch('/data/data.json')
      .then((r) => r.json())
      .then((rows) => {
        if (!Array.isArray(rows)) return setAllRawData([]);

        // Thêm trường _ts (timestamp) vào mỗi row để sắp xếp và lọc
        rows.forEach((r) => {
          r._ts = parseTimestamp(r.date, r.time);
        });

        setAllRawData(rows);
      })
      .catch(() => {
        console.error('Failed to load data.json');
        setAllRawData([]);
      });
  }, []); // Chỉ chạy 1 lần khi component mount

  // === useMemo (LOGIC MỚI) ===
  // Tính toán lại dữ liệu cho biểu đồ MỖI KHI selectedTime thay đổi
  const locationCharts = useMemo(() => {
    if (allRawData.length === 0) return [];

    // 1. Group dữ liệu thô theo location
    const groups: Record<string, Record<string, any>[]> = {};
    allRawData.forEach((r: Record<string, any>) => {
      const loc = r.location || 'Unknown';
      groups[loc] = groups[loc] || [];
      groups[loc].push(r);
    });

    // 2. Các địa điểm mong muốn (từ code của bạn)
    const desired = ['Rạch Bùn', 'Cống Gò Công', 'Vàm Kênh', 'Long Hải'];
    const selectedTimeMs = selectedTime.getTime();

    // 3. Xử lý dữ liệu cho từng địa điểm
    const results = desired.map((loc) => {
      const recs = (groups[loc] || []).slice().sort((a, b) => (a._ts || 0) - (b._ts || 0));
      if (recs.length === 0) return null; // Bỏ qua nếu không có data

      /**
       * Hàm helper để xử lý cho 1 loại dữ liệu (salinity hoặc depth)
       * @returns {object} { labels, values, latestValue, highlightedIndex }
       */
      const processChartData = (records: Record<string, any>[], valueGetter: (r: Record<string, any>) => number | null) => {
        // Lọc ra các record có giá trị hợp lệ
        const validRecs: Record<string, any>[] = records
          .map(r => ({ ...r, value: valueGetter(r) }))
          .filter(r => r.value !== null && !Number.isNaN(r.value));

        if (validRecs.length === 0) {
          return { labels: [], values: [], latestValue: null, highlightedIndex: -1 };
        }

        // Tìm điểm gần nhất trong quá khứ so với selectedTime
        let targetIndex = validRecs.findIndex((r: Record<string, any>) => r._ts > selectedTimeMs);
        if (targetIndex === -1) {
          // Mọi điểm đều ở quá khứ -> chọn điểm cuối
          targetIndex = validRecs.length - 1;
        } else if (targetIndex === 0) {
          // Mọi điểm đều ở tương lai -> chọn điểm đầu
          targetIndex = 0;
        } else {
          // targetIndex là điểm *sau* selectedTime, ta lùi 1
          targetIndex = targetIndex - 1;
        }

        const latestValue = validRecs[targetIndex].value;

        // Lấy 5 điểm (2 trước, 1 giữa, 2 sau)
        let sliceStart = Math.max(0, targetIndex - 2);
        let sliceEnd = Math.min(validRecs.length, targetIndex + 3); // +3 vì slice() không bao gồm

        // Điều chỉnh nếu ở 2 đầu
        const sliceLength = sliceEnd - sliceStart;
        if (sliceLength < 5) {
          if (sliceStart === 0) {
            sliceEnd = Math.min(validRecs.length, 5);
          } else if (sliceEnd === validRecs.length) {
            sliceStart = Math.max(0, validRecs.length - 5);
          }
        }

        const chartSlice = validRecs.slice(sliceStart, sliceEnd);

        // Tìm lại index của điểm highlight (bên trong mảng 5 điểm)
        const highlightedIndex = chartSlice.findIndex((r: Record<string, any>) => r._ts === validRecs[targetIndex]._ts);

        return {
          labels: chartSlice.map(r => r.time || ''),
          values: chartSlice.map(r => r.value),
          latestValue, // Giá trị tại điểm được tô vàng
          highlightedIndex, // Vị trí (0-4) của điểm tô vàng
        };
      };

      // Xác định loại chính (từ code của bạn)
      let salCount = 0, depthCount = 0;
      recs.forEach(r => { if (getSal(r) !== null) salCount++; if (getDepth(r) !== null) depthCount++; });
      const type = salCount >= Math.max(1, depthCount) ? 'salinity' : (depthCount > 0 ? 'depth' : 'salinity');

      // Xử lý dữ liệu cho loại chính (mặn hoặc mực nước)
      const mainChart = processChartData(recs, type === 'salinity' ? getSal : getDepth);

      // Xử lý dữ liệu cho mực nước (luôn luôn, cho biểu đồ thứ 2)
      const depthChart = processChartData(recs, getDepth);

      return {
        location: loc,
        labels: mainChart.labels,
        values: mainChart.values,
        latestValue: mainChart.latestValue,
        highlightedIndex: mainChart.highlightedIndex,

        depthLabels: depthChart.labels,
        depthValues: depthChart.values,
        latestDepth: depthChart.latestValue,
        highlightedIndexDepth: depthChart.highlightedIndex,

        distanceKm: 2.5, // Giữ nguyên
        measurementType: type,
      };
    });

    return results.filter(r => r !== null); // Lọc bỏ các location không có data

  }, [allRawData, selectedTime]); // <-- Tự động chạy lại khi 2 giá trị này thay đổi

  return (
    <LoggedInLayout>
      <div className='w-full px-4'>
        <div className='grid grid-cols-1 gap-5 md:grid-cols-3'>
          {/* ============================================
        ============  NỘI DUNG CỘT BÊN TRÁI  ==========
        ============================================
      */}
          <div className='justify-center rounded-3xl bg-white px-4 text-lg md:col-span-2 md:text-2xl' style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <h1 className='my-3 px-4 text-center  text-[#0060C9]' style={{ fontFamily: 'UTM Black' }}>
              BẢNG THÔNG TIN TỔNG HỢP
            </h1>
            <div className='mb-0  block rounded-t-lg bg-white p-6 shadow-sm'>

              {/* === TimeSelectorContent (ĐÃ SỬA) === */}
              {/* Truyền state (selectedTime) và hàm (setSelectedTime) vào */}
              <div className="flex justify-center">
                <TimeSelectorContent
                  currentTime={currentTime}
                  selectedTime={selectedTime}
                  onTimeSelect={setSelectedTime}
                />
              </div>
            </div>

            {/* Interactive Map - full width with proper spacing */}
            <div className=' mb-6 mt-0'>
              <InteractiveMap />
            </div>

            {/* THÔNG TIN XÂM NHẬP MẶN TỪ CÁC BÀI BÁO ĐƯỜNG LINK */}
            <div className='mb-4 px-4'>
              {/* Ô TIÊU ĐỀ */}
              <div className='mb-3 max-w-[260px] rounded-sm bg-[#F0F9FF] p-2 text-2xl font-semibold' style={{ fontFamily: 'UTM Black' }}>
                <span>XÂM NHẬP MẶN </span>
                <span className='font-bold text-red-700'>MỚI NHẤT</span>
              </div>

              {/* swiper animation */}
              <SalinityNewsSwiper />
            </div>
          </div>

          {/* ============================================
          =============== NỘI DUNG CỘT BÊN PHẢI ======
          ============================================
        */}

          <div className='md:col-span-1'>
            <div className='overflow-hidden rounded-2xl bg-white shadow-lg'>
              {/* Top card - DIỄN BIẾN MẶN */}
              <div className='relative'>
                <div className='flex flex-col bg-white'>
                  {/* header */}
                  <div className='w-full bg-[#005DCE] p-4 text-center font-bold text-white md:text-3xl' style={{ fontFamily: 'UTM Black' }}>
                    <h1>DIỄN BIẾN MẶN</h1>
                  </div>

                  {/* === Biểu đồ MẶN (ĐÃ SỬA) === */}
                  <div className='mt-4 px-4'>
                    {/* Dùng biến locationCharts đã được useMemo tính toán */}
                    {locationCharts && locationCharts.length > 0 ? (
                      <div className='space-y-3'>
                        {locationCharts.map((c) => (
                          <SideLineChart
                            key={c.location}
                            pointName={c.location}
                            value={c.latestValue} // Giá trị tại điểm highlight
                            measurementType={c.measurementType}
                            distanceKm={c.distanceKm}
                            data={{ labels: c.labels, values: c.values }} // Dữ liệu 5 điểm
                            highlightedIndex={c.highlightedIndex} // Điểm tô vàng
                            color="#0ea5e9"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className='p-4 text-center text-gray-500'>Đang tải dữ liệu...</p>
                    )}
                  </div>

                  {/* xem thêm link */}
                  <div className='mt-4 flex justify-end pr-4'>
                    <a href="#" className='mr-2 text-black hover:underline' style={{ fontFamily: 'UTM Black' }}>Xem thêm</a>
                  </div>
                </div>
              </div>

              {/* second cards - TÌNH HÌNH MỰC NƯỚC */}
              <div className='relative'>
                <div className='mt-3 flex flex-col overflow-hidden rounded-lg bg-white'>
                  {/* header */}
                  <div className='w-full bg-[#005DCE] p-4 text-center font-bold text-white md:text-3xl' style={{ fontFamily: 'UTM Black' }}>
                    <h1>TÌNH HÌNH MỰC NƯỚC</h1>
                  </div>

                  {/* === Biểu đồ MỰC NƯỚC (ĐÃ SỬA) === */}
                  <div className='mt-4 px-4'>
                    {locationCharts && locationCharts.some(c => (c.depthValues && c.depthValues.length > 0)) ? (
                      <div className='space-y-3'>
                        {locationCharts.map((c) => (c.depthValues && c.depthValues.length > 0) ? (
                          <SideLineChart
                            key={`${c.location}-depth`}
                            pointName={c.location}
                            value={c.latestDepth} // Giá trị tại điểm highlight
                            measurementType="depth"
                            distanceKm={c.distanceKm}
                            data={{ labels: c.depthLabels, values: c.depthValues }} // Dữ liệu 5 điểm
                            highlightedIndex={c.highlightedIndexDepth} // Điểm tô vàng
                            color="#06b6d4"
                          />
                        ) : null)}
                      </div>
                    ) : (
                      // Fallback nếu không có dữ liệu mực nước
                      <p className='p-4 text-center text-gray-500'>Không có dữ liệu mực nước.</p>
                    )}
                  </div>

                  {/* xem thêm link */}
                  <div className='mt-4 flex justify-end pr-4'>
                    <a href="#" className='mr-2 text-black hover:underline' style={{ fontFamily: 'UTM Black' }}>Xem thêm</a>
                  </div>
                </div>
              </div>

              {/* Notification / expandable box (giữ nguyên) */}
              <div className='h-96 p-4'>
                <div className='flex h-full flex-col rounded-lg border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4 shadow-inner'>
                  <div className='mb-3 flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <svg className='size-6 text-blue-600' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M15 17H9' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                        <path d='M12 22C13.1046 22 14 21.1046 14 20H10C10 21.1046 10.8954 22 12 22Z' fill='currentColor' />
                        <path d='M18 8C18 5.23858 15.7614 3 13 3H11C8.23858 3 6 5.23858 6 8V12L4 14V15H20V14L18 12V8Z' stroke='currentColor' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' />
                      </svg>
                      <h2 className='text-lg font-bold' style={{ fontFamily: 'UTM Black' }}>THÔNG BÁO</h2>
                      <span className='ml-2 text-xs text-gray-500'>Mới cập nhật</span>
                    </div>
                    <div className='text-sm text-gray-600'>
                      <a href='#' className='text-blue-600 hover:underline'>Xem tất cả</a>
                    </div>
                  </div>

                  <div className='flex-1 overflow-auto pr-2'>
                    <ul className='space-y-3'>
                      <li className='flex items-start gap-3'>
                        <span className='mt-1 size-2 shrink-0 rounded-full bg-blue-500' />
                        <div>
                          <div className='text-sm text-gray-800'>Nội dung thông báo hoặc chỉ đạo chỉ định sẽ được hiển thị ở đây một cách ngắn gọn và rõ ràng.</div>
                          <div className='mt-1 text-xs text-gray-400'>01/11/2025 09:30</div>
                        </div>
                      </li>
                      <li className='flex items-start gap-3'>
                        <span className='mt-1 size-2 shrink-0 rounded-full bg-amber-400' />
                        <div>
                          <div className='text-sm text-gray-800'>Khung này sẽ được mở rộng linh hoạt dựa trên nội dung được chèn vào, giúp người dùng dễ dàng nắm bắt thông tin quan trọng.</div>
                          <div className='mt-1 text-xs text-gray-400'>31/10/2025 14:20</div>
                        </div>
                      </li>
                      <li className='flex items-start gap-3'>
                        <span className='mt-1 size-2 shrink-0 rounded-full bg-green-400' />
                        <div>
                          <div className='text-sm text-gray-800'>Vui lòng kiểm tra thường xuyên để cập nhật những thông báo mới nhất từ hệ thống.</div>
                          <div className='mt-1 text-xs text-gray-400'>30/10/2025 08:10</div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LoggedInLayout>
  )
}
