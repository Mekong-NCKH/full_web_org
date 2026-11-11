import type {
  ApiEnvelope,
  DataRange,
  Observation,
  ObservationSeriesResponse,
  SnapshotResponse,
  Station,
} from '@/types/monitoring.type';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';
const apiBaseUrl = configuredBaseUrl.replace(/\/+$/, '');
export const SNAPSHOT_MAX_AGE_HOURS = 6;

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    let message = `Monitoring API returned ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message)
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
    } catch {
      // Keep the HTTP status message when the server did not return JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function fetchStations(signal?: AbortSignal): Promise<Station[]> {
  const response = await getJson<ApiEnvelope<Station[]>>(
    '/api/v1/stations',
    signal,
  );
  return response.data;
}

export async function fetchDataRange(signal?: AbortSignal): Promise<DataRange> {
  const response = await getJson<ApiEnvelope<DataRange>>(
    '/api/v1/metadata/data-range',
    signal,
  );
  return response.data;
}

export async function fetchSnapshot(
  at: Date,
  signal?: AbortSignal,
): Promise<SnapshotResponse> {
  const query = new URLSearchParams({
    at: at.toISOString(),
    maxAgeHours: String(SNAPSHOT_MAX_AGE_HOURS),
  });
  return getJson<SnapshotResponse>(
    `/api/v1/observations/snapshot?${query.toString()}`,
    signal,
  );
}

export async function fetchObservationSeries(
  stationId: string,
  from: Date,
  to: Date,
  signal?: AbortSignal,
): Promise<Observation[]> {
  const query = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const response = await getJson<ObservationSeriesResponse>(
    `/api/v1/stations/${encodeURIComponent(stationId)}/observations?${query.toString()}`,
    signal,
  );
  return response.data;
}

const maxApiRangeMs = 31 * 24 * 60 * 60 * 1000;

export async function fetchObservationHistory(
  stationId: string,
  fromValue: string,
  toValue: string,
  signal?: AbortSignal,
): Promise<Observation[]> {
  const from = new Date(fromValue);
  const to = new Date(toValue);
  if (
    !Number.isFinite(from.getTime()) ||
    !Number.isFinite(to.getTime()) ||
    from > to
  )
    return [];

  const requests: Promise<Observation[]>[] = [];
  let chunkFrom = from.getTime();
  const toMs = to.getTime();
  while (chunkFrom <= toMs) {
    const chunkTo = Math.min(chunkFrom + maxApiRangeMs, toMs);
    requests.push(
      fetchObservationSeries(
        stationId,
        new Date(chunkFrom),
        new Date(chunkTo),
        signal,
      ),
    );
    chunkFrom = chunkTo + 1;
  }

  const chunks = await Promise.all(requests);
  return chunks
    .flat()
    .sort((left, right) => left.observedAt.localeCompare(right.observedAt));
}

export function latestObservationAtOrBefore(
  observations: Observation[],
  at: Date,
): Observation | null {
  const target = at.getTime();
  let latest: Observation | null = null;
  for (const observation of observations) {
    const observedAt = new Date(observation.observedAt).getTime();
    if (!Number.isFinite(observedAt) || observedAt > target) continue;
    if (!latest || observedAt > new Date(latest.observedAt).getTime())
      latest = observation;
  }
  return latest;
}
