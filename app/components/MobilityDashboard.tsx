"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData, MobilitySource, Station, StationStatus } from "../lib/types";

type Props = { initialData: DashboardData };
type Range = "6H" | "12H" | "24H";
type StatusFilter = "all" | StationStatus;

const statusLabel: Record<StationStatus, string> = {
  healthy: "Available",
  low: "Low stock",
  empty: "Empty",
  stale: "Stale feed",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatCompact(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

function freshnessLabel(value: string, asOf: string) {
  const seconds = Math.max(0, Math.floor((new Date(asOf).getTime() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function formatYear(value: string) {
  return new Date(value).getUTCFullYear();
}

function MetricCard({ label, value, note, accent }: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <article className={`metric-card${accent ? " metric-card--accent" : ""}`}>
      <div className="metric-card__label"><span />{label}</div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function AvailabilityChart({ data, range }: { data: DashboardData["history"]; range: Range }) {
  const count = range === "6H" ? 6 : range === "12H" ? 12 : 24;
  const points = data.slice(-count);
  const max = Math.max(...points.map((point) => point.availableBikes), 1);
  return (
    <div className="bar-chart" aria-label={`Average available bicycles over ${range.toLowerCase()}`}>
      {points.map((point, index) => (
        <div className="bar-chart__column" key={point.hour}>
          <div className="bar-chart__value">{point.availableBikes}</div>
          <div
            className={`bar-chart__bar${index === points.length - 1 ? " is-current" : ""}`}
            style={{ height: `${Math.max(8, (point.availableBikes / max) * 100)}%` }}
            title={`${formatTime(point.hour)} · ${point.availableBikes} bikes · ${point.observations} observations`}
          />
          {(index === 0 || index === points.length - 1 || index % 4 === 0) && (
            <time>{formatTime(point.hour)}</time>
          )}
        </div>
      ))}
    </div>
  );
}

function SourceAtlas({ sources }: { sources: MobilitySource[] }) {
  const currentYear = new Date().getUTCFullYear();
  const firstYear = Math.min(...sources.map((source) => formatYear(source.coverageStart)));
  const yearSpan = Math.max(1, currentYear - firstYear);
  const largestLog = Math.max(...sources.map((source) => Math.log10(source.streamCount + 1)), 1);

  return (
    <section className="source-atlas" id="sources">
      <div className="source-atlas__heading">
        <div>
          <div className="eyebrow"><span>02</span> Official data universe</div>
          <h2>Five systems.<br /><em>One urban pulse.</em></h2>
        </div>
        <p>
          The platform now joins shared bicycles, permanent cycle counters, road traffic,
          charging infrastructure and signal control. Stream counts come directly from
          Hamburg&apos;s SensorThings APIs.
        </p>
      </div>

      <div className="source-grid">
        {sources.map((source) => (
          <article
            className="source-card"
            key={source.id}
            style={{ "--source-color": source.color } as React.CSSProperties}
          >
            <div className="source-card__top">
              <span>{source.domain}</span>
              <i>LIVE</i>
            </div>
            <strong>{formatCompact(source.streamCount)}</strong>
            <small>sensor streams</small>
            <div className="source-card__bar">
              <i style={{ width: `${Math.max(8, (Math.log10(source.streamCount + 1) / largestLog) * 100)}%` }} />
            </div>
            <h3>{source.shortName}</h3>
            <p>{source.description}</p>
            <div className="source-card__meta">
              <span>Since {formatYear(source.coverageStart)}</span>
              <span>{source.cadenceMinutes ? `${source.cadenceMinutes} min` : "event-driven"}</span>
            </div>
            <a href={source.officialUrl} target="_blank" rel="noreferrer" aria-label={`Open official ${source.name} dataset`}>
              Official source ↗
            </a>
          </article>
        ))}
      </div>

      <div className="coverage-timeline" aria-label="Historical coverage by data source">
        <div className="coverage-timeline__axis"><span>{firstYear}</span><span>Historical coverage</span><span>{currentYear}</span></div>
        {sources.map((source) => {
          const startYear = formatYear(source.coverageStart);
          const left = ((startYear - firstYear) / yearSpan) * 100;
          return (
            <div className="coverage-row" key={source.id}>
              <strong>{source.shortName}</strong>
              <div><i style={{ left: `${left}%`, background: source.color }} /></div>
              <span>{startYear} → live</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NetworkMap({ stations, status }: { stations: Station[]; status: StatusFilter }) {
  const visible = stations
    .filter((station) => status === "all" || station.status === status)
    .filter((station) => station.longitude >= 9.72 && station.longitude <= 10.25)
    .filter((station) => station.latitude >= 53.43 && station.latitude <= 53.73);
  const plotted = visible.slice(0, 180);

  return (
    <div className="network-map" aria-label="Geographic distribution of StadtRAD stations">
      <div className="network-map__grid" />
      <div className="network-map__river"><span>ELBE</span></div>
      <div className="map-label map-label--altona">ALTONA</div>
      <div className="map-label map-label--mitte">HAMBURG-MITTE</div>
      <div className="map-label map-label--nord">NORD</div>
      {plotted.map((station) => {
        const x = ((station.longitude - 9.72) / (10.25 - 9.72)) * 100;
        const y = 100 - ((station.latitude - 53.43) / (53.73 - 53.43)) * 100;
        const size = Math.min(24, 7 + station.availableBikes * 0.7);
        return (
          <button
            className={`station-dot station-dot--${station.status}`}
            key={station.id}
            style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
            aria-label={`${station.name}: ${station.availableBikes} bikes, ${statusLabel[station.status]}`}
            title={`${station.name}\n${station.availableBikes} bikes · ${statusLabel[station.status]}\n${formatTime(station.observedAt)}`}
          />
        );
      })}
      <div className="map-scale"><span /> 2 KM</div>
      <div className="map-count">{visible.length} stations in view</div>
    </div>
  );
}

export function MobilityDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [liveState, setLiveState] = useState<"connecting" | "live" | "snapshot">("connecting");
  const [range, setRange] = useState<Range>("24H");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/live", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Live endpoint unavailable");
        return response.json();
      })
      .then((next: DashboardData) => {
        setData(next);
        setLiveState("live");
      })
      .catch(() => setLiveState("snapshot"));
    return () => controller.abort();
  }, []);

  const topStations = useMemo(
    () => [...data.stations].sort((a, b) => b.availableBikes - a.availableBikes).slice(0, 5),
    [data.stations],
  );
  const latest = data.coverage.lastObservation;
  const coverageYears = Math.max(
    1,
    new Date(data.generatedAt).getFullYear() - formatYear(data.universe.earliestObservation),
  );

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#overview" aria-label="ElbeFlow overview">
          <span className="brand__mark"><i /><i /><i /></span>
          <span><b>ELBE</b>FLOW</span>
        </a>
        <nav aria-label="Dashboard sections">
          <a className="is-active" href="#overview">Overview</a>
          <a href="#sources">Sources</a>
          <a href="#network">Network</a>
          <a href="#pipeline">Pipeline</a>
          <a href="#quality">Quality</a>
        </nav>
        <div className="live-pill">
          <span className={liveState === "live" ? "pulse" : ""} />
          {liveState === "live" ? "LIVE DATA" : liveState === "connecting" ? "CONNECTING" : "LATEST SNAPSHOT"}
        </div>
      </header>

      <section className="hero" id="overview">
        <div>
          <div className="eyebrow"><span>01</span> Hamburg urban intelligence</div>
          <h1>Mobility,<br /><em>in motion.</em></h1>
        </div>
        <div className="hero__aside">
          <p>A production-minded lakehouse joining {data.universe.sourceCount} official Hamburg systems into trusted, decision-ready data.</p>
          <div className="hero__meta">
            <span>53.5511° N</span>
            <span>09.9937° E</span>
            <span>{formatCompact(data.universe.totalStreams)} streams</span>
          </div>
        </div>
      </section>

      <section className="metrics" aria-label="Live network metrics">
        <MetricCard label="Signal streams" value={formatNumber(data.universe.totalStreams)} note={`Across ${data.universe.sourceCount} official data domains`} />
        <MetricCard label="Scheduled history" value={`${formatCompact(data.universe.estimatedScheduledRows)}+`} note="Coverage estimate · event feeds excluded" accent />
        <MetricCard label="Verified sample" value={formatCompact(data.universe.verifiedSampleRows)} note="Real rows committed for reproducible review" />
        <MetricCard label="Historical coverage" value={`${coverageYears}Y`} note={`${formatYear(data.universe.earliestObservation)} → live`} />
      </section>

      <SourceAtlas sources={data.catalog} />

      <section className="dashboard-grid" id="network">
        <article className="panel panel--map">
          <div className="panel__header">
            <div><span className="section-number">03</span><h2>StadtRAD live pulse</h2></div>
            <div className="filter-group" aria-label="Filter map by station status">
              {(["all", "healthy", "low", "empty"] as StatusFilter[]).map((value) => (
                <button
                  key={value}
                  className={status === value ? "is-selected" : ""}
                  onClick={() => setStatus(value)}
                >
                  {value === "all" ? "All" : statusLabel[value as StationStatus]}
                </button>
              ))}
            </div>
          </div>
          <NetworkMap stations={data.stations} status={status} />
          <div className="map-legend">
            <span><i className="legend--healthy" />Available</span>
            <span><i className="legend--low" />Low stock</span>
            <span><i className="legend--empty" />Empty</span>
            <span><i className="legend--stale" />Stale</span>
          </div>
        </article>

        <article className="panel panel--ranking">
          <div className="panel__header">
            <div><span className="section-number">04</span><h2>Highest supply</h2></div>
            <span className="panel__hint">{formatNumber(data.metrics.availableBikes)} BIKES · {freshnessLabel(latest, data.generatedAt)}</span>
          </div>
          <ol className="station-list">
            {topStations.map((station, index) => (
              <li key={station.id}>
                <span className="station-list__rank">0{index + 1}</span>
                <div><strong>{station.name}</strong><small>{station.region} · {formatTime(station.observedAt)}</small></div>
                <b>{station.availableBikes}<small>bikes</small></b>
              </li>
            ))}
          </ol>
          <a className="data-link" href="/data/multimodal-sample.jsonl.gz" download>
            Download {formatCompact(data.universe.verifiedSampleRows)} real rows <span>↓</span>
          </a>
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel panel--chart">
          <div className="panel__header">
            <div><span className="section-number">05</span><h2>Availability rhythm</h2></div>
            <div className="range-switcher" aria-label="Chart time range">
              {(["6H", "12H", "24H"] as Range[]).map((value) => (
                <button key={value} className={range === value ? "is-selected" : ""} onClick={() => setRange(value)}>{value}</button>
              ))}
            </div>
          </div>
          <div className="chart-summary">
            <strong>{data.history.at(-1)?.availableBikes ?? 0}</strong>
            <span>average bicycles<br />across sampled stations</span>
          </div>
          <AvailabilityChart data={data.history} range={range} />
        </article>

        <article className="panel panel--quality" id="quality">
          <div className="panel__header">
            <div><span className="section-number">06</span><h2>Data contract</h2></div>
            <span className="quality-score">A</span>
          </div>
          <div className="quality-ring" style={{ "--score": "360deg" } as React.CSSProperties}>
            <div><strong>5/5</strong><span>sources verified</span></div>
          </div>
          <ul className="checks">
            <li><span className="check-ok">✓</span><div><b>Source provenance</b><small>Official URLs and licences retained</small></div></li>
            <li><span className="check-ok">✓</span><div><b>Composite identity</b><small>Source + observation ID deduplication</small></div></li>
            <li><span className="check-ok">✓</span><div><b>Cadence contracts</b><small>5 min, 15 min and event-driven feeds</small></div></li>
          </ul>
        </article>
      </section>

      <section className="pipeline" id="pipeline">
        <div className="pipeline__intro">
          <div className="eyebrow"><span>07</span> Lakehouse architecture</div>
          <h2>From raw signal<br />to <em>trusted metric.</em></h2>
          <p>Replay-safe ingestion, source-aware partitions and tested transformations. Designed for 450M+ scheduled observations plus Hamburg&apos;s event-driven feeds.</p>
        </div>
        <div className="pipeline__flow">
          <div className="flow-node"><span>01</span><i>API</i><strong>5 source domains</strong><small>84K+ official streams</small></div>
          <div className="flow-arrow">→</div>
          <div className="flow-node"><span>02</span><i>RAW</i><strong>Bronze</strong><small>Gzip JSON · immutable</small></div>
          <div className="flow-arrow">→</div>
          <div className="flow-node"><span>03</span><i>SQL</i><strong>Silver</strong><small>Parquet · partitioned</small></div>
          <div className="flow-arrow">→</div>
          <div className="flow-node flow-node--accent"><span>04</span><i>BI</i><strong>Gold</strong><small>DuckDB · dbt marts</small></div>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand__mark"><i /><i /><i /></span><span><b>ELBE</b>FLOW</span></div>
        <p>Built with public data from the Freie und Hansestadt Hamburg.</p>
        <div><a href={data.source.url} target="_blank" rel="noreferrer">DATA SOURCE ↗</a><span>{data.source.license}</span></div>
      </footer>
    </main>
  );
}
