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

export type SelectedStationReading = {
  observation: Observation | null;
  freshness: 'fresh' | 'stale' | 'missing';
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

export type GISReferenceStatus = {
  code: 'unknown' | 'open_to_flow' | 'close_for_storage' | 'monitor';
  label: string;
  basis: string;
  thresholdMgL?: number;
};

export type GISReferenceRule =
  | {
      stationId: string;
      kind: 'fixed';
      result: 'open_to_flow';
      label: string;
    }
  | {
      stationId: string;
      kind: 'threshold';
      comparison: 'gt';
      sourceThreshold: number;
      thresholdMgL: number;
      aboveThreshold: 'close_for_storage';
      aboveThresholdLabel: string;
      atOrBelowThreshold: 'monitor';
      atOrBelowThresholdLabel: string;
    };

export type GISReferenceRuleSet = {
  id: string;
  version: string;
  confirmationStatus: 'unconfirmed' | string;
  intendedUse: string;
  sourceFiles: string[];
  sourceSalinityUnit: 'g/L' | string;
  normalizedSalinityUnit: 'mg/L' | string;
  rules: GISReferenceRule[];
  limitations: string[];
};

export type GISReferenceRuleSetResponse = {
  success: boolean;
  data: GISReferenceRuleSet;
};

export type GISReferenceStatusResponse = {
  success: boolean;
  mode: 'historical' | 'replay';
  asOf: string;
  dataKind: 'observed';
  source: string;
  ruleSet: GISReferenceRuleSet;
  data: Array<{
    station: Station;
    observation: Observation | null;
    referenceStatus: GISReferenceStatus;
  }>;
};
