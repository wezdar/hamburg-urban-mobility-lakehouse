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
  stations: Station[];
  history: HistoryPoint[];
};
