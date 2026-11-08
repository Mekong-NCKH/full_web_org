export type NewsType = {
  title: string;
  link: string;
  enclosure?: {
    link: string
  }
  image?: string;
  thumbnail?: string;
  author?: string;
  source: string;
};

export type UserBannerType = {
  userName: string;
  unitInfo: string;
  avatarSrc: string;
}

export type SalinityDataType = {
  timestamp: string;
  salinityValue: string;
  location: string;
  zoneName: string;
  regions: string;
};

export type RawDataRecord = {
  date?: string;
  time?: string;
  location?: string;
  sal_song_gpl?: number | string | null;
  sal_dong_gpl?: number | string | null;
  sal_surface_gpl?: number | string | null;
  sal_bottom_gpl?: number | string | null;
  // possible depth fields (string or number in source)
  m_song_m?: number | string | null;
  m_dong_m?: number | string | null;
  depth_surface_m?: number | string | null;
  depth_bottom_m?: number | string | null;
  // internal timestamp added by code
  _ts?: number;
  // allow extra fields
  [key: string]: any;
};

/**
 * GeoJSON Feature Properties from tien_giang.geojson
 */
export type GeoFeatureProperties = {
  NAME_3?: string;
  NAME_2?: string;
  TYPE_3?: string;
  TYPE_2?: string;
  [key: string]: any;
};

/**
 * GeoJSON Feature structure
 */
export type GeoFeature = {
  type: 'Feature';
  properties: GeoFeatureProperties;
  geometry: {
    type: string;
    coordinates: any;
  };
  [key: string]: any;
};

/**
 * GeoJSON FeatureCollection structure
 */
export type GeoFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoFeature[];
  [key: string]: any;
};

/**
 * Zone data structure from context.json
 */
export type ZoneType = {
  zoneName: string;
  regions: string[];
  [key: string]: any;
};

/**
 * Context data structure from context.json
 */
export type ContextDataType = {
  province: string;
  zones: ZoneType[];
};

/**
 * Selected region/zone in the map
 */
export type SelectedRegion = {
  name: string;
  type: 'Vùng' | 'Huyện' | 'Thị xã' | 'Thành phố' | string;
};

/**
 * Search selection types for the map
 */
export type SearchSelectionType = 'PROVINCE' | 'ZONE' | 'REGION';

export type SearchSelection = {
  type: SearchSelectionType;
  name: string;
  [key: string]: any;
  zoneMap: { [zoneName: string]: string[] };
};

/**
 * Province data for search (used in SearchBarMap)
 */
export type ProvinceDataForSearch = {
  [provinceName: string]: {
    geoData: GeoFeatureCollection;
    zones: ZoneType[];
  };
};

/**
 * Map marker data structure
 */
export type MapMarker = {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  salinity: number;
  waterLevel: number;
  timestamp: string;
};