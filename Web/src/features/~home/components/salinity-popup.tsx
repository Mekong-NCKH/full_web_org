// === CÁC BIỂU TƯỢNG (ICON) ===
const WarningIcon = () => (
  <svg className="size-16" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.01-1.742 3.01H4.42c-1.53 0-2.493-1.676-1.743-3.01l5.58-9.92zM10 13a1 1 0 100-2 1 1 0 000 2zm-1-3a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);
const CautionIcon = () => (
  <svg className="size-16" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);
const SafeIcon = () => (
  <svg className="size-16" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

// === LOGIC XỬ LÝ TRẠNG THÁI ===
// *** Bạn có thể thay đổi các ngưỡng (4.0 và 1.0) tại đây ***
const getSalinityState = (salinityValue: string | number) => {
  if (salinityValue === null || salinityValue === undefined) {
    return {
      level: 'unknown',
      message: 'Không có dữ liệu',
      icon: <WarningIcon />,
      colors: {
        bg: 'bg-gray-50', text: 'text-gray-700', header: 'bg-gray-500', accent: 'text-gray-400',
      },
    };
  }

  //CODE DƠ
  let s: number;
  if (typeof salinityValue === 'string') {
    s = parseFloat(salinityValue);
  } 
  else {
    s = salinityValue;
  }
  if (isNaN(s)) {
    return {
      level: 'unknown',
      message: 'Không có dữ liệu',
      icon: <WarningIcon />,
      colors: {
        bg: 'bg-gray-50', text: 'text-gray-700', header: 'bg-gray-500', accent: 'text-gray-400',
      },
    };
  }

  // 1. NGƯỠNG NGUY HIỂM (Màu đỏ)
  if (s >= 4.0) {
    return {
      level: 'warning',
      message: 'Nước không sử dụng được',
      icon: <WarningIcon />,
      colors: {
        bg: 'bg-rose-50', text: 'text-rose-700', header: 'bg-[#D4145A]', accent: 'text-rose-600',
      },
    };
  }

  // 2. NGƯỠNG CẨN TRỌNG (Màu vàng)
  if (s >= 1.0) {
    return {
      level: 'caution',
      message: 'Chỉ nên sử dụng nước để rửa và hạn chế tưới tiêu',
      icon: <CautionIcon />,
      colors: {
        bg: 'bg-amber-50', text: 'text-amber-800', header: 'bg-[#EAB308]', accent: 'text-amber-500',
      },
    };
  }

  // 3. NGƯỠNG AN TOÀN (Màu xanh)
  return {
    level: 'safe',
    message: 'Nước an toàn để sử dụng, nên tích trữ bây giờ',
    icon: <SafeIcon />,
    colors: {
      bg: 'bg-green-50', text: 'text-green-700', header: 'bg-[#16A34A]', accent: 'text-green-600',
    },
  };
};

/**
 * Component SalinityPopup
 * Hiển thị popup thông tin điểm đo với 3 trạng thái (An toàn, Cẩn trọng, Nguy hiểm)
 */
export default function SalinityPopup({
  locationName = "N/A",
  locationType = "ĐIỂM ĐO",
  salinity = 0,
  waterLevel = 0,
  timestamp = "N/A",
}) {

  // 1. Lấy trạng thái dựa trên độ mặn
  const state = getSalinityState(salinity);

  // 2. Format lại số liệu cho đẹp
  const formattedSalinity = Number(salinity).toFixed(2);
  const formattedWaterLevel = Number(waterLevel).toFixed(2);

  return (
    <div className={`w-[260px] overflow-hidden rounded-lg shadow-lg ${state.colors.bg}`}>
      {/* Header */}
      <div className={`p-2 ${state.colors.header}`}>
        <h3
          className="text-center text-base font-bold uppercase text-white"
          style={{ fontFamily: 'UTM Black' }} // Sử dụng font của bạn
        >
          {locationType} {locationName}
        </h3>
      </div>

      {/* Body */}
      <div className="relative p-3">
        {/* Icon mờ ở góc (giống ảnh) */}
        <div className={`absolute bottom-0 right-1 opacity-20 ${state.colors.accent}`}>
          {state.icon}
        </div>

        {/* Thông tin chi tiết */}
        <p className="text-sm text-gray-800">
          Độ mặn&nbsp;&nbsp;&nbsp;: <span className="font-bold">{formattedSalinity} g/L</span>
        </p>
        <p className="mb-3 text-sm text-gray-800">
          Mực nước : <span className="font-bold">{formattedWaterLevel} m</span>
        </p>

        {/* Thông điệp cảnh báo */}
        <p className={`text-base font-bold ${state.colors.text}`}>
          {state.message}
        </p>

        {/* Thời gian cập nhật */}
        <p className="relative z-10 mt-2 text-right text-xs italic text-gray-500">
          Lần cập nhật cuối: {timestamp}
        </p>
      </div>
    </div>
  );
}