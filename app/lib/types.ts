export type StationStatus = "healthy" | "low" | "empty" | "stale";

export type Station = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  availableBikes: number;
  observedAt: string;
  status: StationStatus;
  region: "central" | "north" | "east" | "south" | "west";
};

export type HistoryPoint = {
  hour: string;
  availableBikes: number;
  observations: number;
};

export type MobilitySource = {
  id: string;
  name: string;
  shortName: string;
  domain: string;
  streamCount: number;
  coverageStart: string;
  cadenceMinutes: number | null;
  estimatedRows: number | null;
  description: string;
  color: string;
  officialUrl: string;
  apiRoot: string;
  countVerifiedAt: string;
  countStatus: "live" | "verified snapshot";
};

export type DashboardData = {
  generatedAt: string;
  source: {
    name: string;
    url: string;
    license: string;
  };
  coverage: {
    firstObservation: string;
    lastObservation: string;
    cadenceMinutes: number;
    estimatedBackfillableRows: number;
  };
  metrics: {
    stations: number;
    availableBikes: number;
    activeStations: number;
    freshPercent: number;
    snapshotRows: number;
  };
  universe: {
    sourceCount: number;
    totalStreams: number;
    estimatedScheduledRows: number;
    verifiedSampleRows: number;
    earliestObservation: string;
  };
  catalog: MobilitySource[];
  stations: Station[];
  history: HistoryPoint[];
};
