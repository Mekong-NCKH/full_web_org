import L from 'leaflet'
import { useState, useMemo } from 'react'

/**
 * SearchBarMap (3-level Cascading)
 * - Hỗ trợ Tỉnh -> Vùng -> Huyện
 * - *** LOGIC: Ẩn khi popup marker (điểm) đang mở ***
 */
function SearchBarMap({ 
  provinceData = {}, 
  mapRef, 
  onRegionSelect, 
  isMarkerPopupOpen = false // <-- Phải có prop này
}: { 
  provinceData: Record<string, any>, 
  mapRef: React.RefObject<L.Map | null>, 
  onRegionSelect?: (region: { name: string; type: 'PROVINCE' | 'ZONE' | 'REGION' }) => void,
  isMarkerPopupOpen?: boolean
}) {
  // --- State Dropdown 1: Tỉnh ---
  const [isProvinceOpen, setIsProvinceOpen] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const provinceNames = useMemo(() => Object.keys(provinceData), [provinceData])

  // --- State Dropdown 2: Vùng ---
  const [isZoneOpen, setIsZoneOpen] = useState<boolean>(false)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  
  const activeZones = useMemo(() => {
    return selectedProvince ? (provinceData[selectedProvince]?.zones || []) : []
  }, [selectedProvince, provinceData])
  const activeZoneNames = useMemo(() => activeZones.map((z: { zoneName: string }) => z.zoneName), [activeZones])

  // --- State Dropdown 3: Huyện ---
  const [isRegionOpen, setIsRegionOpen] = useState<boolean>(false)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  
  const activeRegions = useMemo(() => {
    if (!selectedZone) return []
    const zoneObject = activeZones.find((z: { zoneName: string }) => z.zoneName === selectedZone)
    return zoneObject?.regions || []
  }, [selectedZone, activeZones])


  /**
   * Phóng to/thu nhỏ bản đồ (chỉ dùng cho Tỉnh)
   */
  const fitMapToBounds = (layer: any, options: any) => {
    if (!mapRef?.current) return;
    try {
      const bounds = layer.getBounds()
      if (bounds && bounds.isValid && bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true, ...options })
      } else {
        const center = bounds.getCenter()
        if (center) mapRef.current.setView(center, options.maxZoom || 12)
      }
    } catch (e) {
      console.error("Lỗi fitBounds:", e)
    }
  }

  /**
   * Xử lý khi người dùng CHỌN TỈNH
   */
  const handleProvinceSelect = (provinceName: string | null) => {
    if (!provinceName) return
    
    setSelectedProvince(provinceName)
    setIsProvinceOpen(false)
    
    // Reset lựa chọn con
    setSelectedZone(null)
    setSelectedRegion(null)
    setIsZoneOpen(false)
    setIsRegionOpen(false)

    // Zoom bản đồ ra toàn tỉnh
    const data = provinceData[provinceName]
    if (data && data.geoData) {
      const layer = L.geoJSON(data.geoData)
      fitMapToBounds(layer, { maxZoom: 10, duration: 0.6 })
    }
    // Thông báo cho cha
    onRegionSelect?.({ name: provinceName, type: 'PROVINCE' });
  }

  /**
   * Xử lý khi người dùng CHỌN VÙNG
   */
  const handleZoneSelect = (zoneName: string | null) => {
    if (!zoneName) return

    setSelectedZone(zoneName)
    setIsZoneOpen(false)

    // Reset lựa chọn con
    setSelectedRegion(null)
    setIsRegionOpen(false)
    
    // Thông báo cho cha (cha sẽ lo việc zoom Vùng)
    onRegionSelect?.({ 
      name: zoneName, 
      type: 'ZONE'
    })
  }
  
  /**
   * Xử lý khi người dùng CHỌN HUYỆN
   */
  const handleRegionSelect = (regionName: string | null) => {
    if (!regionName) return
    
    setSelectedRegion(regionName)
    setIsRegionOpen(false)
    
    // Thông báo cho cha (cha sẽ lo việc zoom Huyện)
    onRegionSelect?.({ 
      name: regionName, 
      type: 'REGION' // Type mới: 'REGION'
    })
  }

  // --- Render ---

  const provinceLabel = selectedProvince || '1. Chọn tỉnh'
  const zoneLabel = selectedZone || '2. Chọn Vùng'
  const regionLabel = selectedRegion || '3. Chọn Huyện/Khu vực'

  const isZoneDisabled = !selectedProvince
  const isRegionDisabled = !selectedZone

  return (
    <div 
      className={`absolute z-[1000] w-full max-w-[400px] p-3 transition-opacity duration-200 ${
        isMarkerPopupOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative">

        {/* --- Dropdown 1: Chọn Tỉnh --- */}
        {(isProvinceOpen || !(isProvinceOpen || isZoneOpen || isRegionOpen)) && (
          <div className="relative mb-2">
            <button
              type="button"
              onClick={() => setIsProvinceOpen(!isProvinceOpen)}
              className={`w-full border-none bg-[#004AAD] px-4 py-2 pr-10 text-left text-sm text-white shadow-md focus:outline-none focus:ring-2 focus:ring-white/50 ${isProvinceOpen ? 'rounded-t-lg' : 'rounded-lg'}`}
              style={{ fontFamily: 'UTM Black' }}
            >
              {provinceLabel}
            </button>
            <DropdownIcon isOpen={isProvinceOpen} />

            {isProvinceOpen && (
              <DropdownList>
                {provinceNames.length > 0 ? (
                  provinceNames.map((name) => (
                    <DropdownItem key={name} onClick={() => handleProvinceSelect(name)}>
                      {name}
                    </DropdownItem>
                  ))
                ) : (
                  <DropdownItem disabled>Không có dữ liệu tỉnh</DropdownItem>
                )}
              </DropdownList>
            )}
          </div>
        )}

        {/* --- Dropdown 2: Chọn Vùng --- */}
        {(isZoneOpen || !(isProvinceOpen || isZoneOpen || isRegionOpen)) && (
          <div className="relative mb-2">
            <button
              type="button"
              disabled={isZoneDisabled}
              onClick={() => !isZoneDisabled && setIsZoneOpen(!isZoneOpen)}
              className={`w-full border-none px-4 py-2 pr-10 text-left text-sm shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                isZoneDisabled 
                  ? 'cursor-not-allowed bg-gray-200 text-gray-600' 
                  : 'bg-[#0060C9] text-white'
              } ${isZoneOpen ? 'rounded-t-lg' : 'rounded-lg'}`}
              style={{ fontFamily: 'UTM Black' }}
            >
              {zoneLabel}
            </button>
            <DropdownIcon isOpen={isZoneOpen} disabled={isZoneDisabled} />

            {isZoneOpen && !isZoneDisabled && (
              <DropdownList>
                {activeZoneNames.length > 0 ? (
                  activeZoneNames.map((zoneName: string) => (
                    <DropdownItem key={zoneName} onClick={() => handleZoneSelect(zoneName)}>
                      {zoneName}
                    </DropdownItem>
                  ))
                ) : (
                  <DropdownItem disabled>Không có dữ liệu vùng</DropdownItem>
                )}
              </DropdownList>
            )}
          </div>
        )}

        {/* --- Dropdown 3: Chọn Huyện --- */}
        {(isRegionOpen || !(isProvinceOpen || isZoneOpen || isRegionOpen)) && (
          <div className="relative">
            <button
              type="button"
              disabled={isRegionDisabled}
              onClick={() => !isRegionDisabled && setIsRegionOpen(!isRegionOpen)}
              className={`w-full border-none px-4 py-2 pr-10 text-left text-sm shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                isRegionDisabled 
                  ? 'cursor-not-allowed bg-gray-200 text-gray-600' 
                  : 'bg-[#007BFF] text-white' // Màu xanh nhạt hơn
              } ${isRegionOpen ? 'rounded-t-lg' : 'rounded-lg'}`}
              style={{ fontFamily: 'UTM Black' }}
            >
              {regionLabel}
            </button>
            <DropdownIcon isOpen={isRegionOpen} disabled={isRegionDisabled} />

            {isRegionOpen && !isRegionDisabled && (
              <DropdownList>
                {activeRegions.length > 0 ? (
                  activeRegions.map((regionName: string) => (
                    <DropdownItem key={regionName} onClick={() => handleRegionSelect(regionName)}>
                      {regionName}
                    </DropdownItem>
                  ))
                ) : (
                  <DropdownItem disabled>Không có dữ liệu huyện</DropdownItem>
                )}
              </DropdownList>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// --- Component phụ cho gọn ---

const DropdownIcon = ({ isOpen, disabled = false }: { isOpen: boolean; disabled?: boolean }) => (
  <div className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white transition-transform duration-200 ${disabled ? 'opacity-50' : ''}`} aria-label="Toggle dropdown">
    <svg width="12" height="11" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
      <path d="M9.57585 13.384C8.81216 14.7477 6.84955 14.7477 6.08585 13.384L0.257894 2.97722C-0.488698 1.64406 0.474916 -1.62463e-06 2.0029 -1.48692e-06L13.6588 -4.36383e-07C15.1868 -2.98668e-07 16.1504 1.64406 15.4038 2.97723L9.57585 13.384Z" fill="white"/>
    </svg>
  </div>
)

const DropdownList = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute inset-x-0 top-full z-20 max-h-60 w-full overflow-y-auto rounded-b-lg border border-t-0 border-gray-200 bg-white shadow-lg">
    {children}
  </div>
)

const DropdownItem = ({ children, onClick, disabled = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
  <div 
    onClick={disabled ? undefined : onClick} 
    className={`px-4 py-2 text-sm ${disabled ? 'text-gray-500' : 'cursor-pointer text-gray-800 hover:bg-gray-100'}`}
  >
    {children}
  </div>
)

export default SearchBarMap