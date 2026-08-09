import snapshot from "../../data/dashboard.json";
import { API_ROOT, normalizeDatastreams, summarizeLiveStations } from "../../lib/mobility";
import type { DashboardData } from "../../lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const params = new URLSearchParams({
    "$filter": "properties/serviceName eq 'HH_STA_StadtRad' and properties/layerName eq 'Fahrraeder'",
    "$expand": "Thing($expand=Locations),Observations($select=result,phenomenonTime;$orderby=phenomenonTime desc;$top=1)",
    "$top": "500",
  });

  try {
    const response = await fetch(`${API_ROOT}/Datastreams?${params}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Hamburg API returned ${response.status}`);
    const payload = await response.json();
    const stations = normalizeDatastreams(payload);
    const data = summarizeLiveStations(stations, snapshot as DashboardData);
    return Response.json(data, {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=180",
        "x-data-source": "Hamburg Urban Data Platform",
      },
    });
  } catch {
    return Response.json(snapshot, {
      headers: { "cache-control": "public, max-age=60" },
    });
  }
}
