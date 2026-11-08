import L from "leaflet";
import { useEffect, useState, useRef, useMemo } from "react";
// eslint-disable-next-line import/order
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from "react-leaflet";

import "leaflet/dist/leaflet.css";
// eslint-disable-next-line import/order
import type { GeoJsonObject } from 'geojson';

import { SalinityDataType, SearchSelection } from "@/types/home.type";

import CustomZoomControl from "./custom-control";
import SalinityPopup from "./salinity-popup"; 
import SearchBarMap from "./search-bar-map";


//Màu cho từng huyện/thị xã/TP của Tiền Giang
const regionColors = [
  { name: "Cái Bè", color: "#ff595e" },
  { name: "Cai Lậy", color: "#8ac926" },
  { name: "Châu Thành", color: "#f72585" },
  { name: "Chợ Gạo", color: "#4361ee" },
  { name: "Gò Công Ðông", color: "#E5FFCC" },
  { name: "Gò Công Tây", color: "#7209b7" },
  { name: "Tân Phú Ðông", color: "#4c0099" },
  { name: "Tân Phước", color: "#90be6d" },
  { name: "Mỹ Tho", color: "#ffca3a" },
  { name: "Go Cong", color: "#1982c4" },
  { name: "Cai Lậy", color: "#6a4c93" },
  { name: "Tân Phước", color: "#ffca3a" },
];

// === DỮ LIỆU MOCKUP CHO 3 ĐIỂM DEMO ===
const timelabel = '07:00, T3 04/11'; // Giả sử cùng 1 thời gian

const demoMarkers = [
  { 
    id: 'main', name: 'XUÂN HÒA', type: 'CỐNG', lat: 10.3500, 
    lng: 106.3333, salinity: 0.88, waterLevel: 0.00, timestamp: timelabel
  },
  {
    id: 'extra1', name: 'GÒ CÔNG', type: 'CỐNG', lat: 10.385384, 
    lng: 106.657916, salinity: 2.5, waterLevel: 0.15, timestamp: timelabel
  },
  {
    id: 'extra2', name: 'RẠCH BÙN', type: 'CỐNG', lat: 10.354188, 
    lng: 106.781442, salinity: 4.1, waterLevel: -0.10, timestamp: timelabel
  }
];

// === LỖI ĐÃ SỬA: BỔ SUNG CÁC HÀM CÒN THIẾU ===
// (Được sao chép từ SalinityPopup.jsx để dùng cho việc tô màu marker)

// const WarningIcon = () => (
//   <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
//     <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.01-1.742 3.01H4.42c-1.53 0-2.493-1.676-1.743-3.01l5.58-9.92zM10 13a1 1 0 100-2 1 1 0 000 2zm-1-3a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
//   </svg>
// );
// const CautionIcon = () => (
//   <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
//     <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
//   </svg>
// );
// const SafeIcon = () => (
//   <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
//     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//   </svg>
// );

const getSalinityState = (salinityValue: string) => {
  const s = parseFloat(salinityValue);
  if (isNaN(s)) {
    return { level: 'unknown' };
  }
  if (s >= 4.0) {
    return { level: 'warning' };
  }
  if (s >= 1.0) {
    return { level: 'caution' };
  }
  return { level: 'safe' };
};
// === KẾT THÚC PHẦN SỬA LỖI ===


export default function InteractiveMap() {
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<any>(null); 
  const [zones, setZones] = useState<any[]>([]); 
  const [zoneMap, setZoneMap] = useState({}); 
  const [province, setProvince] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(10);
  
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [isMarkerPopupOpen, setIsMarkerPopupOpen] = useState<boolean>(false);

  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  
  const center: [number, number] = [10.4125, 106.2614];
  const maxBounds = L.latLngBounds([9.9, 105.6], [11.0, 107.0]);
  
  const safeNormalize = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  useEffect(() => {
    fetch("/data/tien_giang.geojson")
  .then((res) => res.json())
  .then((data) => setGeoData(data))
  .catch(() => console.error("Lỗi tải GeoJSON"));
  }, []);

  useEffect(() => {
    fetch('/data/context.json')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.province) setProvince(data.province);
        if (data && Array.isArray(data.zones)) {
          setZones(data.zones); 
          const newZoneMap: Record<string, string> = {};
          data.zones.forEach((z: SalinityDataType) => {
            newZoneMap[z.zoneName] = z.regions;
          });
          setZoneMap(newZoneMap);
        }
      })
      .catch(() => {
        console.error("Lỗi tải context.json");
      });
  }, []);

  const findFeaturesByNames = (geoJson: any, namesToFind: string[]) => {
    if (!geoJson || !geoJson.features || !namesToFind) return [];
    const normalizedNames = namesToFind.map(safeNormalize);
    return geoJson.features.filter((f: any) => {
      const nameProp = f?.properties?.NAME_3 || f?.properties?.NAME_2 || '';
      return normalizedNames.includes(safeNormalize(nameProp));
    });
  };

  const provinceDataForSearch = useMemo(() => {
    if (!province || !geoData || zones.length === 0) {
      return {};
    }
    return {
      [province]: { 
        geoData: geoData,
        zones: zones 
      }
    };
  }, [geoData, zones, province]);

  const handleSearchSelection = (selection: SearchSelection | null) => {
    if (!selection || !mapRef.current) {
      setSelectedRegion(null);
      return;
    }

    setActiveMarkerId(null);
    setIsMarkerPopupOpen(false);
    mapRef.current.closePopup();

    switch (selection.type) {
      case 'PROVINCE':
        setSelectedRegion(null);
        break;
      case 'ZONE': {
        const zoneName = selection.name;
        const regionNamesInZone = zoneMap[zoneName]; 
        if (!regionNamesInZone || regionNamesInZone.length === 0) break;
        const features = findFeaturesByNames(geoData, regionNamesInZone);
        if (features.length > 0) {
          const featureGroup = L.featureGroup(features.map((f: GeoJsonObject | GeoJsonObject[] | null | undefined) => L.geoJSON(f)));
          const bounds = featureGroup.getBounds();
          if (bounds && bounds.isValid()) {
            mapRef.current.fitBounds(bounds, {
              padding: [50, 50], maxZoom: 12, animate: true, duration: 0.8
            });
          }
        }
        setSelectedRegion({ name: zoneName, type: "Vùng" });
        break;
      }
      case 'REGION': {
        const regionName = selection.name;
        const features = findFeaturesByNames(geoData, [regionName]); 
        if (features.length > 0) {
          const feature = features[0];
          const layer = L.geoJSON(feature);
          const bounds = layer.getBounds();
          if (bounds && bounds.isValid()) {
            mapRef.current.fitBounds(bounds, {
              padding: [50, 50], maxZoom: 12, animate: true, duration: 0.8
            });
          }
          setSelectedRegion({ 
            name: feature.properties.NAME_3 || regionName, 
            type: feature.properties.TYPE_3 || 'Huyện' 
          });
        }
        break;
      }
      default:
        setSelectedRegion(selection);
        break;
    }
  };


  const styleFeature = (feature) => {
    const name = feature.properties.NAME_3?.trim();
    const region = regionColors.find((r) => r.name === name);
    const lname = (name || '');
    const isGoCongGroup = lname.includes('Gò Công') || lname.includes('Go Cong') || lname.includes('Tân Phú Ðông') || lname.includes('Tan Phu Dong');
    const goCongGroupColor = '#1982c4';
    const fillColor = isGoCongGroup ? goCongGroupColor : (region ? region.color : "#cccccc");
    const isFullProvinceView = currentZoom <= 10.5;

    let isSelected = false;
    if (selectedRegion) {
      if (selectedRegion.type === "Vùng") {
        const regionNamesInSelectedZone = zoneMap[selectedRegion.name] || [];
        const normalizedNames = regionNamesInSelectedZone.map(safeNormalize);
        if (normalizedNames.includes(safeNormalize(name))) {
          isSelected = true;
        }
      } else {
        if (safeNormalize(selectedRegion.name) === safeNormalize(name)) {
          isSelected = true;
        }
      }
    }

    if (isFullProvinceView && !selectedRegion) {
      const provinceColor = "#76B0FD";
      return {
        color: provinceColor, weight: 1, fillColor: provinceColor, fillOpacity: 1,
      };
    } else {
      return {
        color: isSelected ? "#2563eb" : fillColor,
        weight: isSelected ? 3 : 1,
        fillColor,
        fillOpacity: isSelected ? 0.8 : 0.6,
      };
    }
  };

  const onEachFeature = (feature, layer) => {
    const name = feature.properties.NAME_3?.trim();
    const type = feature.properties.TYPE_3 || ""; 

    layer.bindPopup(`
      <div style="text-align: center;">
        <b style="font-size: 14px;">${type} ${name}</b>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">Nhấp để phóng to vùng này</p>
      </div>
    `);

    layer.on({
      mouseover: (e) => {
        const isFullProvinceView = currentZoom <= 10.5;
        if (isFullProvinceView && !selectedRegion) {
          e.target.setStyle({ weight: 2, fillOpacity: 0.8 });
        } else if (selectedRegion && selectedRegion.name === name) {
          e.target.setStyle({ weight: 4, fillOpacity: 0.9 });
        } else {
          e.target.setStyle({ weight: 2, fillOpacity: 0.75 });
        }
        if (!e.target.isPopupOpen()) {
          e.target.openPopup();
        }
      },
      mouseout: (e) => {
        if (geoJsonLayerRef.current) {
          geoJsonLayerRef.current.resetStyle(e.target);
        }
        e.target.closePopup();
      },
      click: (e) => {
        setActiveMarkerId(null);
        setIsMarkerPopupOpen(false);

        const map = e.target._map;
        setSelectedRegion({ name, type }); 
        map.fitBounds(e.target.getBounds(), {
          padding: [50, 50], maxZoom: 12, animate: true, duration: 0.8
        });
      }
    });
  };

  

  // Track zoom changes to update styling
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const handleZoomEnd = () => {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      if (zoom <= 10.5 && selectedRegion) {
        setSelectedRegion(null);
      }
    };

    const handleMapClick = () => {
      setActiveMarkerId(null);
      setIsMarkerPopupOpen(false); 

      if (mapRef.current) {
        mapRef.current.closePopup();
      }
    };

    map.on('zoomend', handleZoomEnd);
    map.on('click', handleMapClick);
    return () => {
      map.off('zoomend', handleZoomEnd);
      map.off('click', handleMapClick);
    };
  }, [selectedRegion]); 

  return (
    <div className="relative">
      <style>{`
        .custom-marker-popup, .leaflet-popup-pane, .leaflet-popup-content-wrapper {
          z-index: 10000 ;
        }
        /* Bỏ phần viền/shadow mặc định của Leaflet popup */
        .leaflet-popup-content-wrapper {
          padding: 0;
          background-color: transparent;
          box-shadow: none;
        }
        .leaflet-popup-content {
          margin: 0;
        }
      `}</style>

      <SearchBarMap 
        provinceData={provinceDataForSearch}
        mapRef={mapRef}
        onRegionSelect={handleSearchSelection}
        isMarkerPopupOpen={isMarkerPopupOpen} 
      />

      {/* Selected Region Info Panel (responsive to avoid overlapping mobile search) */}
      {selectedRegion && (
        <div
          className={
            "absolute z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 " +
            "px-3 py-1 sm:px-4 " +
            // On small screens place near bottom (above custom zoom); on md+ keep top-right
            // note: unset bottom on md+ to avoid stretching from top to bottom
            "left-3 right-3 bottom-20 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-auto"
          }
          style={{ maxWidth: 'min(95%, 420px)' }}
          role="region"
          aria-label={`Selected region: ${selectedRegion.type} ${selectedRegion.name}`}
        >
          <div className="flex w-full items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Chọn:</span>
              <span className="truncate text-sm font-bold text-blue-600" title={`${selectedRegion.type} ${selectedRegion.name}`}>{selectedRegion.type} {selectedRegion.name}</span>
            </div>
            <button
              onClick={() => {
                setSelectedRegion(null);
                if (mapRef.current) {
                  mapRef.current.setView(center, 10, { animate: true });
                }
              }}
              className="ml-auto text-lg leading-none text-gray-500 hover:text-gray-700 sm:ml-2"
              title="Đặt lại khung nhìn"
              aria-label="Đặt lại khung nhìn"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          height: "500px",
          width: "100%",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <MapContainer
          center={center}
          zoom={10}
          minZoom={9}
          maxZoom={13}
          maxBounds={maxBounds}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
          inertia={true}
          inertiaDeceleration={2000}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          zoomControl={false}
          whenReady={() => {
            const map = mapRef.current;
            if (!map) return;
            try {
              map.setMaxBounds(maxBounds);
              map.options.maxBoundsViscosity = 1.0;
              if (!map.getPane('markerPane')) {
                map.createPane('markerPane');
                const p = map.getPane('markerPane');
                if (p) p.style.zIndex = '650';
              }
            } catch {
              // ignore
            }
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CustomZoomControl />

          {geoData && (
            <GeoJSON
              key={`${selectedRegion?.name || 'all'}-${currentZoom}`}
              ref={geoJsonLayerRef}
              data={geoData}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          )}

          
          {/* --- Render 3 ĐIỂM DEMO --- */}
          {demoMarkers.map((marker: any) => {
            // Xác định xem marker này có đang active không
            const isSelected = activeMarkerId === marker?.id;
            
            // LỖI ĐÃ SỬA: Bây giờ getSalinityState đã được định nghĩa
            const state = getSalinityState(marker.salinity);
            
            let color = '#2b6cb0'; // Mặc định (unknown)
            if (state.level === 'warning') color = '#d32f2f'; // Đỏ
            if (state.level === 'caution') color = '#ff5722'; // Vàng/Cam
            if (state.level === 'safe') color = '#16A34A'; // Xanh
            
            return (
              <CircleMarker
                key={marker.id}
                pane="markerPane"
                center={[marker.lat, marker.lng]}
                radius={isSelected ? 12 : 8}
                pathOptions={{
                  color: color, // Màu viền
                  fillColor: color, // Màu nền
                  fillOpacity: isSelected ? 1 : 0.95,
                  weight: isSelected ? 3 : 1
                }}
                eventHandlers={{
                  click: (e) => {
                    // Set state ngay khi click marker
                    e.originalEvent.stopPropagation();
                    setActiveMarkerId(marker.id);
                    setIsMarkerPopupOpen(true);
                  },
                  mouseover: (e) => {
                    const layer = e.target;
                    if (!isSelected) {
                      try { layer.bringToFront(); } catch (err) { void err; }
                      try { if (typeof layer.setRadius === 'function') layer.setRadius(12); } catch (err) { void err; }
                      try { layer.setStyle({ weight: 3, fillOpacity: 1 }); } catch (err) { void err; }
                    }
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    if (!isSelected) {
                      try { if (typeof layer.setRadius === 'function') layer.setRadius(8); } catch (err) { void err; }
                      try { layer.setStyle({ weight: 1, fillOpacity: 0.95 }); } catch (err) { void err; }
                    }
                  },
                }}
              >
                <Popup
                  eventHandlers={{
                    add: () => {
                      setActiveMarkerId(marker.id);
                      setIsMarkerPopupOpen(true);
                    },
                    remove: () => {
                      setActiveMarkerId(null);
                      setIsMarkerPopupOpen(false);
                    },
                  }}
                >
                  <SalinityPopup
                    locationName={marker.name}
                    locationType={marker.type}
                    salinity={marker.salinity}
                    waterLevel={marker.waterLevel}
                    timestamp={marker.timestamp}
                  />
                </Popup>
              </CircleMarker>
            );
          })}
          
        </MapContainer>
      </div>
    </div>
  );
}