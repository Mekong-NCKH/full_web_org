export type Measurement<ValueUnit extends string> = {
  value: number | null;
  unit: ValueUnit;
};

export type Station = {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    source: string;
  };
};

export type Observation = {
  id: string;
  observedAt: string;
  salinity: Measurement<'mg/L'>;
  waterLevel: Measurement<'m'> & { reference: 'sea_level' };
  quality: 'unverified' | string;
};

export type StationSnapshot = {
  station: Station;
  observation: Observation | null;
  status: 'available' | 'no_data';
};

export type DataRange = {
  from: string | null;
  to: string | null;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

export type SnapshotResponse = {
  success: boolean;
  requestedAt: string;
  maxAgeHours: number;
  data: StationSnapshot[];
};

export type ObservationSeriesResponse = {
  success: boolean;
  stationId: string;
  from: string;
  to: string;
  limit: number;
  truncated: boolean;
  data: Observation[];
};
