export class Position {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  type?: string;
}

export class PositionData {
  id?: string;
  station_id: string;
  station_name?: string;
  datetime: string;
  salinity?: number;
  water_level?: number;
}
