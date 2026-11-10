import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Position } from '../domain/entities/position.entity';
import { parseTimestamp } from './date-validation';

const TWO_MONTHS_MAX_MS = 62 * 24 * 60 * 60 * 1000;

export type PublicDataWindow = { from: Date; to: Date } | null;

// Approved intersection of BaoDinh.csv station headers and
// Sanility_GIS_Monitoring/cong_locations.csv. Use canonical coordinates from
// the location file; never publish the legacy fallback coordinates in `positions`.
const PUBLIC_LOCATIONS: Record<
  string,
  { name: string; latitude: number; longitude: number; source: string }
> = {
  baodinh: {
    name: 'Bao Dinh',
    latitude: 10.388921,
    longitude: 106.341713,
    source: 'Sanility_GIS_Monitoring/cong_locations.csv',
  },
  gocat: {
    name: 'Go Cat',
    latitude: 10.364613,
    longitude: 106.370195,
    source: 'Sanility_GIS_Monitoring/cong_locations.csv',
  },
  vamkenh: {
    name: 'Vam Kenh',
    latitude: 10.283028,
    longitude: 106.738487,
    source: 'Sanility_GIS_Monitoring/cong_locations.csv',
  },
};
const PUBLIC_STATION_IDS = new Set(Object.keys(PUBLIC_LOCATIONS));

export function publicStationIds(): string[] {
  return Object.keys(PUBLIC_LOCATIONS).sort();
}

export function isPublicStationId(id: string): boolean {
  return PUBLIC_STATION_IDS.has(id.toLowerCase());
}

export function toPublicStation(position: Position) {
  const location = PUBLIC_LOCATIONS[position.id.toLowerCase()];
  if (!location) return null;

  return {
    id: position.id,
    name: location.name,
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      source: location.source,
    },
  };
}

export function getPublicDataWindow(): PublicDataWindow {
  const fromValue = process.env.PUBLIC_DATA_START;
  const toValue = process.env.PUBLIC_DATA_END;

  if (!fromValue && !toValue) {
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException(
        'Public data window is not configured. Set PUBLIC_DATA_START and PUBLIC_DATA_END before enabling public API data.',
      );
    }
    return null;
  }

  if (!fromValue || !toValue) {
    throw new ServiceUnavailableException(
      'PUBLIC_DATA_START and PUBLIC_DATA_END must both be configured.',
    );
  }

  let from: Date;
  let to: Date;
  try {
    from = parseTimestamp(fromValue, 'PUBLIC_DATA_START');
    to = parseTimestamp(toValue, 'PUBLIC_DATA_END');
  } catch {
    throw new ServiceUnavailableException(
      'Public data window values must be ISO 8601 timestamps with a timezone.',
    );
  }

  if (from > to || to.getTime() - from.getTime() > TWO_MONTHS_MAX_MS) {
    throw new ServiceUnavailableException(
      'Public data window must be ordered and no longer than 62 days.',
    );
  }
  return { from, to };
}

export function assertInsidePublicWindow(
  from: Date,
  to: Date,
  window: PublicDataWindow,
): void {
  if (window && (from < window.from || to > window.to)) {
    throw new BadRequestException(
      'Requested time range is outside the configured public data window.',
    );
  }
}
