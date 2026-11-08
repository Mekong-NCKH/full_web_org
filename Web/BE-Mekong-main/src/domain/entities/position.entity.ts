export class Position {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm?: number | null;
  type?: string | null;
}

export class PositionData {
  id?: string;
  station_id: string;
  station_name?: string;
  datetime: string;
  salinity?: number | null;
  water_level?: number | null;
}

export type StationSnapshot = {
  station: Position;
  observation: PositionData | null;
};
export type DataRange = { from: string | null; to: string | null };
