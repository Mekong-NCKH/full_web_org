import { useCallback } from 'react';
import { useMap } from 'react-leaflet';

function CustomZoomControl() {
  const map = useMap();

  // Hàm xử lý khi nhấn nút zoom in
  const zoomIn = useCallback(() => {
    map.zoomIn();
  }, [map]);

  // Hàm xử lý khi nhấn nút zoom out
  const zoomOut = useCallback(() => {
    map.zoomOut();
  }, [map]);

  return (
    // Đặt ở vị trí giữa dưới cùng của bản đồ
    <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2">
      <div className="flex items-center overflow-hidden rounded-md bg-white shadow-md">
        
        {/* Phần hiển thị phần trăm (100%) */}
        <div className="bg-blue-600 px-3 py-1.5 text-sm font-bold text-white">
          100%
        </div>

        {/* Phần chứa các nút +/- */}
        <div className="flex items-center bg-white">
          <button
            className="px-2.5 py-1.5 text-lg font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none"
            onClick={zoomIn}
            aria-label="Phóng to"
          >
            <img src="/zoom_in.png" className="inline-block size-4 object-contain" alt="Phóng to" />
          </button>
          
          {/* Đường kẻ dọc */}
          <span className="text-gray-300">|</span>
          
          <button
            className="px-2.5 py-1.5 text-lg font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none"
            onClick={zoomOut}
            aria-label="Thu nhỏ"
          >
            <img src="/zoom_out.png" className="inline-block size-4 object-contain" alt="Thu nhỏ" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomZoomControl;
