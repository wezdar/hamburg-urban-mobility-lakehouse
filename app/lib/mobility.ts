import type { DashboardData, HistoryPoint, Station, StationStatus } from "./types";

type Observation = {
  result?: number;
  phenomenonTime?: string;
};

type ApiLocation = {
  location?: {
    geometry?: { coordinates?: [number, number] };
  };
};

type ApiDatastream = {
  "@iot.id": number;
  phenomenonTime?: string;
  Thing?: {
    description?: string;
    Locations?: ApiLocation[];
  };
  Observations?: Observation[];
};

type ApiResponse = {
  value?: ApiDatastream[];
};

const API_ROOT = "https://iot.hamburg.de/v1.1";

function regionFor(latitude: number, longitude: number): Station["region"] {
  if (latitude < 53.51) return "south";
  if (latitude > 53.61) return "north";
  if (longitude < 9.94) return "west";
  if (longitude > 10.06) return "east";
  return "central";
}

function statusFor(availableBikes: number, observedAt: string): StationStatus {
  const ageMinutes = (Date.now() - new Date(observedAt).getTime()) / 60_000;
  if (ageMinutes > 180) return "stale";
  if (availableBikes === 0) return "empty";
  if (availableBikes <= 2) return "low";
  return "healthy";
}

export function normalizeDatastreams(payload: ApiResponse): Station[] {
  return (payload.value ?? []).flatMap((stream) => {
    const coordinates = stream.Thing?.Locations?.[0]?.location?.geometry?.coordinates;
    const observation = stream.Observations?.[0];
    if (!coordinates || !observation?.phenomenonTime) return [];

    const availableBikes = Number(observation.result ?? 0);
    const latitude = Number(coordinates[1]);
    const longitude = Number(coordinates[0]);
    const rawName = stream.Thing?.description ?? `Station ${stream["@iot.id"]}`;

    return [{
      id: stream["@iot.id"],
      name: rawName.replace(/^StadtRad-Station\s*/i, ""),
      latitude,
      longitude,
      availableBikes,
      observedAt: observation.phenomenonTime,
      status: statusFor(availableBikes, observation.phenomenonTime),
      region: regionFor(latitude, longitude),
    } satisfies Station];
  });
}

export function summarizeLiveStations(
  stations: Station[],
  fallback: DashboardData,
): DashboardData {
  if (!stations.length) return fallback;
  const latest = stations.reduce(
    (max, station) => station.observedAt > max ? station.observedAt : max,
    stations[0].observedAt,
  );
  const fresh = stations.filter((station) => station.status !== "stale").length;

  return {
    ...fallback,
    generatedAt: new Date().toISOString(),
    coverage: { ...fallback.coverage, lastObservation: latest },
    metrics: {
      ...fallback.metrics,
      stations: stations.length,
      availableBikes: stations.reduce((sum, station) => sum + station.availableBikes, 0),
      activeStations: stations.filter((station) => station.availableBikes > 0).length,
      freshPercent: Math.round((fresh / stations.length) * 1000) / 10,
      snapshotRows: stations.length,
    },
    stations,
  };
}

export function aggregateHistory(
  observations: Array<{ phenomenonTime: string; result: number }>,
): HistoryPoint[] {
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const observation of observations) {
    const hour = new Date(observation.phenomenonTime).toISOString().slice(0, 13) + ":00:00Z";
    const current = buckets.get(hour) ?? { sum: 0, count: 0 };
    current.sum += Number(observation.result ?? 0);
    current.count += 1;
    buckets.set(hour, current);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, value]) => ({
      hour,
      availableBikes: Math.round(value.sum / value.count),
      observations: value.count,
    }));
}

export { API_ROOT };
