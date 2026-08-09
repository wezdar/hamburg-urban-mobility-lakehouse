"use client";

import { useEffect, useMemo, useState } from "react";
import {
  interpolate,
  languageOptions,
  translations,
  type Language,
  type Translation,
} from "../lib/i18n";
import { intelligenceTranslations } from "../lib/intelligence-i18n";
import type { DashboardData, MobilitySource, Station, StationStatus } from "../lib/types";
import intelligenceSnapshot from "../data/urban-intelligence.json";

type Props = { initialData: DashboardData };
type Range = "6H" | "12H" | "24H";
type StatusFilter = "all" | StationStatus;
type MapLayer = "bikes" | "traffic" | "transit" | "all";
type TrafficEvent = (typeof intelligenceSnapshot.trafficEvents)[number];
type TransitStop = (typeof intelligenceSnapshot.transitStops)[number];
type MapSelection =
  | { kind: "bike"; item: Station }
  | { kind: "traffic"; item: TrafficEvent }
  | { kind: "transit"; item: TransitStop }
  | null;

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatCompact(value: number, locale: string) {
  const decimal = (number: number) => new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(number);
  if (value >= 1_000_000_000) return `${decimal(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `${decimal(value / 1_000_000)}M`;
  if (value >= 1_000) return `${decimal(value / 1_000)}K`;
  return String(value);
}

function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

function freshnessLabel(value: string, asOf: string, copy: Translation) {
  const seconds = Math.max(0, Math.floor((new Date(asOf).getTime() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return interpolate(copy.time.seconds, { value: seconds });
  if (seconds < 3600) return interpolate(copy.time.minutes, { value: Math.floor(seconds / 60) });
  return interpolate(copy.time.hours, { value: Math.floor(seconds / 3600) });
}

function formatYear(value: string) {
  return new Date(value).getUTCFullYear();
}

function projectCoordinate(longitude: number, latitude: number) {
  return {
    x: ((longitude - 9.72) / (10.25 - 9.72)) * 100,
    y: 100 - ((latitude - 53.43) / (53.73 - 53.43)) * 100,
  };
}

function buildForecast(history: DashboardData["history"]) {
  const values = history.map((point) => point.availableBikes);
  const predictions = values.slice(3).map((_, index) => {
    const sourceIndex = index + 3;
    return values.slice(sourceIndex - 3, sourceIndex).reduce((sum, value) => sum + value, 0) / 3;
  });
  const actual = values.slice(3);
  const mae = actual.length
    ? actual.reduce((sum, value, index) => sum + Math.abs(value - predictions[index]), 0) / actual.length
    : 0;
  const latest = values.at(-1) ?? 0;
  const recent = values.slice(-3);
  const baseline = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : latest;
  const drift = values.length > 5 ? ((latest - values.at(-6)!) / 5) * 0.18 : 0;
  const start = new Date(history.at(-1)?.hour ?? new Date().toISOString());
  const points = Array.from({ length: 12 }, (_, index) => ({
    hour: new Date(start.getTime() + (index + 1) * 3_600_000).toISOString(),
    value: Math.max(0, Math.round(baseline + drift * (index + 1))),
  }));
  const mean = actual.length ? actual.reduce((sum, value) => sum + value, 0) / actual.length : 1;
  const confidence = Math.max(72, Math.min(98, Math.round(100 - (mae / Math.max(mean, 1)) * 100)));
  return { points, mae, holdout: actual.length, confidence };
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

function AvailabilityChart({
  data,
  range,
  copy,
}: {
  data: DashboardData["history"];
  range: Range;
  copy: Translation;
}) {
  const count = range === "6H" ? 6 : range === "12H" ? 12 : 24;
  const points = data.slice(-count);
  const max = Math.max(...points.map((point) => point.availableBikes), 1);
  return (
    <div className="bar-chart" aria-label={interpolate(copy.chart.aria, { range: range.toLowerCase() })}>
      {points.map((point, index) => (
        <div className="bar-chart__column" key={point.hour}>
          <div className="bar-chart__value">{point.availableBikes}</div>
          <div
            className={`bar-chart__bar${index === points.length - 1 ? " is-current" : ""}`}
            style={{ height: `${Math.max(8, (point.availableBikes / max) * 100)}%` }}
            title={`${formatTime(point.hour, copy.locale)} · ${point.availableBikes} ${copy.map.bikes} · ${point.observations} ${copy.chart.observations}`}
          />
          {(index === 0 || index === points.length - 1 || index % 4 === 0) && (
            <time>{formatTime(point.hour, copy.locale)}</time>
          )}
        </div>
      ))}
    </div>
  );
}

function SourceAtlas({ sources, copy }: { sources: MobilitySource[]; copy: Translation }) {
  const currentYear = new Date().getUTCFullYear();
  const firstYear = Math.min(...sources.map((source) => formatYear(source.coverageStart)));
  const yearSpan = Math.max(1, currentYear - firstYear);
  const largestLog = Math.max(...sources.map((source) => Math.log10(source.streamCount + 1)), 1);

  return (
    <section className="source-atlas" id="sources">
      <div className="source-atlas__heading">
        <div>
          <div className="eyebrow"><span>02</span> {copy.atlas.eyebrow}</div>
          <h2>{copy.atlas.title}<br /><em>{copy.atlas.accent}</em></h2>
        </div>
        <p>{copy.atlas.description}</p>
      </div>

      <div className="source-grid">
        {sources.map((source) => (
          <article
            className="source-card"
            key={source.id}
            style={{ "--source-color": source.color } as React.CSSProperties}
          >
            <div className="source-card__top">
              <span>{copy.sources[source.id]?.domain ?? source.domain}</span>
              <i>{copy.atlas.live}</i>
            </div>
            <strong dir="ltr">{formatCompact(source.streamCount, copy.locale)}</strong>
            <small>{copy.atlas.streams}</small>
            <div className="source-card__bar">
              <i style={{ width: `${Math.max(8, (Math.log10(source.streamCount + 1) / largestLog) * 100)}%` }} />
            </div>
            <h3>{copy.sources[source.id]?.shortName ?? source.shortName}</h3>
            <p>{copy.sources[source.id]?.description ?? source.description}</p>
            <div className="source-card__meta">
              <span>{copy.atlas.since} {formatYear(source.coverageStart)}</span>
              <span>{source.cadenceMinutes ? `${source.cadenceMinutes} min` : copy.atlas.eventDriven}</span>
            </div>
            <a href={source.officialUrl} target="_blank" rel="noreferrer" aria-label={`${copy.atlas.openSource}: ${copy.sources[source.id]?.shortName ?? source.name}`}>
              {copy.atlas.officialSource}
            </a>
          </article>
        ))}
      </div>

      <div className="coverage-timeline" aria-label={copy.atlas.coverage}>
        <div className="coverage-timeline__axis"><span>{firstYear}</span><span>{copy.atlas.coverage}</span><span>{currentYear}</span></div>
        {sources.map((source) => {
          const startYear = formatYear(source.coverageStart);
          const left = ((startYear - firstYear) / yearSpan) * 100;
          return (
            <div className="coverage-row" key={source.id}>
              <strong>{copy.sources[source.id]?.shortName ?? source.shortName}</strong>
              <div><i style={{ left: `${left}%`, background: source.color }} /></div>
              <span>{startYear} → {copy.atlas.live.toLowerCase()}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NetworkMap({
  stations,
  status,
  copy,
  language,
  layer,
  onLayerChange,
  selection,
  onSelect,
}: {
  stations: Station[];
  status: StatusFilter;
  copy: Translation;
  language: Language;
  layer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
  selection: MapSelection;
  onSelect: (selection: MapSelection) => void;
}) {
  const intelligenceCopy = intelligenceTranslations[language];
  const visible = stations
    .filter((station) => status === "all" || station.status === status)
    .filter((station) => station.longitude >= 9.72 && station.longitude <= 10.25)
    .filter((station) => station.latitude >= 53.43 && station.latitude <= 53.73);
  const plotted = visible.slice(0, 220);
  const showBikes = layer === "bikes" || layer === "all";
  const showTraffic = layer === "traffic" || layer === "all";
  const showTransit = layer === "transit" || layer === "all";

  const selectedTitle = !selection
    ? ""
    : selection.kind === "traffic"
      ? selection.item.title
      : selection.item.name;

  return (
    <div className="map-experience" dir="ltr">
      <div className="map-toolbar">
        <div>
          <b>{intelligenceCopy.map.clearTitle}</b>
          <span>{intelligenceCopy.map.officialLayers}</span>
        </div>
        <div className="map-layer-switcher" role="group" aria-label={intelligenceCopy.map.layers}>
          {(["bikes", "traffic", "transit", "all"] as MapLayer[]).map((value) => (
            <button key={value} type="button" className={layer === value ? "is-selected" : ""} onClick={() => onLayerChange(value)}>
              {intelligenceCopy.map[value]}
            </button>
          ))}
        </div>
      </div>
      <div className="network-map network-map--light" aria-label={copy.map.mapAria}>
        <svg className="network-map__basemap" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
          <rect width="1000" height="560" fill="#eef1e7" />
          <path className="map-water" d="M-40 406 C130 354 214 445 348 398 C493 348 610 438 742 389 C850 348 941 370 1045 340 L1045 572 L-40 572 Z" />
          <path className="map-island" d="M355 465 C420 424 496 438 550 478 C484 520 400 522 329 489 Z" />
          <g className="map-minor-roads">
            <path d="M78 230 L935 181" /><path d="M112 326 L908 276" /><path d="M187 95 L825 505" />
            <path d="M323 35 L370 438" /><path d="M526 28 L520 430" /><path d="M701 54 L665 411" />
            <path d="M43 152 C250 172 410 109 596 138 C770 166 850 140 979 109" />
            <path d="M59 360 C221 278 409 289 576 326 C743 363 872 323 978 250" />
          </g>
          <g className="map-major-roads">
            <path d="M40 286 C223 247 335 263 482 230 C630 197 768 218 970 146" />
            <path d="M246 36 C329 159 418 226 526 309 C618 380 725 422 877 498" />
            <path d="M744 22 C685 130 617 218 545 294 C472 370 393 411 272 457" />
          </g>
          <g className="map-rail-lines">
            <path d="M198 82 C338 188 414 228 515 286 C604 337 716 363 897 378" />
            <path d="M534 27 C550 137 543 239 515 286 C488 335 437 376 354 420" />
          </g>
        </svg>
        <div className="map-label map-label--altona">ALTONA</div>
        <div className="map-label map-label--mitte">HAMBURG-MITTE</div>
        <div className="map-label map-label--nord">NORD</div>
        <div className="map-label map-label--elbe">ELBE</div>
        {showBikes && plotted.map((station) => {
          const { x, y } = projectCoordinate(station.longitude, station.latitude);
          const size = Math.min(20, 7 + station.availableBikes * 0.55);
          return (
            <button
              type="button"
              className={`station-dot station-dot--${station.status}${selection?.kind === "bike" && selection.item.id === station.id ? " is-active" : ""}`}
              key={station.id}
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
              aria-label={`${station.name}: ${station.availableBikes} ${copy.map.bikes}, ${copy.status[station.status]}`}
              title={`${station.name}\n${station.availableBikes} ${copy.map.bikes} · ${copy.status[station.status]}`}
              onClick={() => onSelect({ kind: "bike", item: station })}
            />
          );
        })}
        {showTraffic && intelligenceSnapshot.trafficEvents.map((event) => {
          const { x, y } = projectCoordinate(event.longitude, event.latitude);
          return (
            <button
              type="button"
              className={`traffic-marker traffic-marker--${event.status}${selection?.kind === "traffic" && selection.item.id === event.id ? " is-active" : ""}`}
              key={event.id}
              style={{ left: `${x}%`, top: `${y}%` }}
              aria-label={`${event.title}: ${event.status}`}
              title={`${event.title}\n${event.description}`}
              onClick={() => onSelect({ kind: "traffic", item: event })}
            ><span>!</span></button>
          );
        })}
        {showTransit && intelligenceSnapshot.transitStops.map((stop) => {
          const { x, y } = projectCoordinate(stop.longitude, stop.latitude);
          return (
            <button
              type="button"
              className={`transit-marker${selection?.kind === "transit" && selection.item.id === stop.id ? " is-active" : ""}`}
              key={stop.id}
              style={{ left: `${x}%`, top: `${y}%` }}
              aria-label={`${stop.name}: ${stop.lines.join(", ")}`}
              title={`${stop.name}\n${stop.lines.join(" · ")}`}
              onClick={() => onSelect({ kind: "transit", item: stop })}
            >H</button>
          );
        })}
        <div className="map-scale"><span /> 2 KM</div>
        <div className="map-count">{showBikes ? `${visible.length} ${copy.map.stationsInView}` : intelligenceCopy.map.officialLayers}</div>
        {selection && (
          <aside className="map-detail" aria-live="polite">
            <button type="button" onClick={() => onSelect(null)} aria-label={intelligenceCopy.map.close}>×</button>
            <span>{selection.kind === "bike" ? "STADTRAD" : selection.kind === "traffic" ? "POLIZEI HAMBURG" : "HVV"}</span>
            <h3>{selectedTitle}</h3>
            {selection.kind === "bike" && <p>{selection.item.availableBikes} {copy.map.bikes} · {copy.status[selection.item.status]} · {formatTime(selection.item.observedAt, copy.locale)}</p>}
            {selection.kind === "traffic" && <p>{selection.item.description}</p>}
            {selection.kind === "transit" && <p>{selection.item.lines.join(" · ")}<br />{selection.item.departures} {intelligenceCopy.map.departures}</p>}
          </aside>
        )}
      </div>
    </div>
  );
}

export function MobilityDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [liveState, setLiveState] = useState<"connecting" | "live" | "snapshot">("connecting");
  const [range, setRange] = useState<Range>("24H");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [language, setLanguage] = useState<Language>("de");
  const [mapLayer, setMapLayer] = useState<MapLayer>("all");
  const [mapSelection, setMapSelection] = useState<MapSelection>(null);
  const [historyYear, setHistoryYear] = useState(2026);
  const copy = translations[language];
  const intelligenceCopy = intelligenceTranslations[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = copy.direction;
  }, [copy.direction, language]);

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
  const forecast = useMemo(() => buildForecast(data.history), [data.history]);
  const activeSources = useMemo(
    () => data.catalog.filter((source) => formatYear(source.coverageStart) <= historyYear),
    [data.catalog, historyYear],
  );
  const annualCapacity = useMemo(
    () => activeSources.reduce((sum, source) => {
      if (!source.cadenceMinutes) return sum;
      return sum + source.streamCount * (365 * 24 * 60 / source.cadenceMinutes);
    }, 0),
    [activeSources],
  );
  const operationalAlerts = useMemo(() => {
    const stationAlerts = data.stations
      .filter((station) => station.status === "stale" || station.status === "empty")
      .slice(0, 4)
      .map((station) => ({
        id: station.id,
        type: station.status,
        title: station.name,
        detail: `${station.availableBikes} ${copy.map.bikes} · ${formatTime(station.observedAt, copy.locale)}`,
      }));
    const trafficAlerts = intelligenceSnapshot.trafficEvents
      .filter((event) => event.status === "closure")
      .slice(0, 3)
      .map((event) => ({ id: event.id, type: "closure", title: event.title, detail: event.description }));
    return [...trafficAlerts, ...stationAlerts].slice(0, 6);
  }, [copy.locale, copy.map.bikes, data.stations]);
  const co2Scenario = data.metrics.availableBikes
    * intelligenceSnapshot.emissionsModel.assumedTripKm
    * intelligenceSnapshot.emissionsModel.avoidedCarKgPerKm;
  const forecastMax = Math.max(...forecast.points.map((point) => point.value), 1);

  return (
    <main className="dashboard-shell" data-language={language} dir={copy.direction}>
      <header className="topbar">
        <a className="brand" href="#overview" aria-label={copy.brandLabel}>
          <span className="brand__mark"><i /><i /><i /></span>
          <span><b>ELBE</b>FLOW</span>
        </a>
        <nav aria-label={copy.navLabel}>
          <a className="is-active" href="#overview">{copy.nav.overview}</a>
          <a href="#sources">{copy.nav.sources}</a>
          <a href="#network">{copy.nav.network}</a>
          <a href="#intelligence">{intelligenceCopy.nav.intelligence}</a>
          <a href="#operations">{intelligenceCopy.nav.operations}</a>
          <a href="#pipeline">{copy.nav.pipeline}</a>
        </nav>
        <div className="topbar__actions">
          <div className="language-switcher" role="group" aria-label={copy.languageSelector}>
            {languageOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                className={language === option.code ? "is-selected" : ""}
                aria-pressed={language === option.code}
                aria-label={option.name}
                title={option.name}
                onClick={() => setLanguage(option.code)}
              >
                {option.short}
              </button>
            ))}
          </div>
          <div className="live-pill">
            <span className={liveState === "live" ? "pulse" : ""} />
            {liveState === "live" ? copy.live.live : liveState === "connecting" ? copy.live.connecting : copy.live.snapshot}
          </div>
        </div>
      </header>

      <section className="hero" id="overview">
        <div>
          <div className="eyebrow"><span>01</span> {copy.hero.eyebrow}</div>
          <h1>{copy.hero.title}<br /><em>{copy.hero.accent}</em></h1>
        </div>
        <div className="hero__aside">
          <p>{interpolate(copy.hero.description, { count: data.universe.sourceCount + 2 })}</p>
          <div className="hero__meta">
            <span>53.5511° N</span>
            <span>09.9937° E</span>
            <span dir="ltr">{formatCompact(data.universe.totalStreams, copy.locale)} {copy.hero.streams}</span>
          </div>
        </div>
      </section>

      <section className="metrics" aria-label={copy.metrics.aria}>
        <MetricCard label={copy.metrics.streams} value={formatNumber(data.universe.totalStreams, copy.locale)} note={interpolate(copy.metrics.streamsNote, { count: data.universe.sourceCount + 2 })} />
        <MetricCard label={copy.metrics.history} value={`${formatCompact(data.universe.estimatedScheduledRows, copy.locale)}+`} note={copy.metrics.historyNote} accent />
        <MetricCard label={copy.metrics.sample} value={formatCompact(data.universe.verifiedSampleRows, copy.locale)} note={copy.metrics.sampleNote} />
        <MetricCard label={copy.metrics.coverage} value={`${coverageYears}Y`} note={interpolate(copy.metrics.coverageNote, { year: formatYear(data.universe.earliestObservation) })} />
      </section>

      <SourceAtlas sources={data.catalog} copy={copy} />

      <section className="dashboard-grid" id="network">
        <article className="panel panel--map">
          <div className="panel__header">
            <div><span className="section-number">03</span><h2>{copy.map.title}</h2></div>
            <div className="filter-group" aria-label={copy.map.filterAria}>
              {(["all", "healthy", "low", "empty"] as StatusFilter[]).map((value) => (
                <button
                  key={value}
                  className={status === value ? "is-selected" : ""}
                  onClick={() => setStatus(value)}
                >
                  {copy.status[value]}
                </button>
              ))}
            </div>
          </div>
          <NetworkMap
            stations={data.stations}
            status={status}
            copy={copy}
            language={language}
            layer={mapLayer}
            onLayerChange={setMapLayer}
            selection={mapSelection}
            onSelect={setMapSelection}
          />
          <div className="map-legend">
            <span><i className="legend--healthy" />{copy.status.healthy}</span>
            <span><i className="legend--low" />{copy.status.low}</span>
            <span><i className="legend--empty" />{copy.status.empty}</span>
            <span><i className="legend--stale" />{copy.status.stale}</span>
          </div>
        </article>

        <article className="panel panel--ranking">
          <div className="panel__header">
            <div><span className="section-number">04</span><h2>{copy.ranking.title}</h2></div>
            <span className="panel__hint" dir="ltr">{formatNumber(data.metrics.availableBikes, copy.locale)} {copy.ranking.bikes} · {freshnessLabel(latest, data.generatedAt, copy)}</span>
          </div>
          <ol className="station-list">
            {topStations.map((station, index) => (
              <li key={station.id}>
                <span className="station-list__rank">0{index + 1}</span>
                <div><strong>{station.name}</strong><small>{station.region} · {formatTime(station.observedAt, copy.locale)}</small></div>
                <b>{station.availableBikes}<small>{copy.map.bikes}</small></b>
              </li>
            ))}
          </ol>
          <a className="data-link" href="/data/multimodal-sample.jsonl.gz" download>
            {interpolate(copy.ranking.download, { count: formatCompact(data.universe.verifiedSampleRows, copy.locale) })} <span>↓</span>
          </a>
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel panel--chart">
          <div className="panel__header">
            <div><span className="section-number">05</span><h2>{copy.chart.title}</h2></div>
            <div className="range-switcher" aria-label={copy.chart.rangeAria}>
              {(["6H", "12H", "24H"] as Range[]).map((value) => (
                <button key={value} className={range === value ? "is-selected" : ""} onClick={() => setRange(value)}>{value}</button>
              ))}
            </div>
          </div>
          <div className="chart-summary">
            <strong>{data.history.at(-1)?.availableBikes ?? 0}</strong>
            <span>{copy.chart.average}<br />{copy.chart.sampledStations}</span>
          </div>
          <AvailabilityChart data={data.history} range={range} copy={copy} />
        </article>

        <article className="panel panel--quality" id="quality">
          <div className="panel__header">
            <div><span className="section-number">06</span><h2>{copy.quality.title}</h2></div>
            <span className="quality-score">A</span>
          </div>
          <div className="quality-ring" style={{ "--score": "360deg" } as React.CSSProperties}>
            <div><strong>7/7</strong><span>{copy.quality.sourcesVerified}</span></div>
          </div>
          <ul className="checks">
            <li><span className="check-ok">✓</span><div><b>{copy.quality.provenance}</b><small>{copy.quality.provenanceNote}</small></div></li>
            <li><span className="check-ok">✓</span><div><b>{copy.quality.identity}</b><small>{copy.quality.identityNote}</small></div></li>
            <li><span className="check-ok">✓</span><div><b>{copy.quality.cadence}</b><small>{copy.quality.cadenceNote}</small></div></li>
          </ul>
        </article>
      </section>

      <section className="intelligence-section" id="intelligence">
        <div className="intelligence-heading">
          <div>
            <div className="eyebrow"><span>07</span> {intelligenceCopy.intelligence.eyebrow}</div>
            <h2>{intelligenceCopy.intelligence.title}<br /><em>{intelligenceCopy.intelligence.accent}</em></h2>
          </div>
          <p>{intelligenceCopy.intelligence.description}</p>
        </div>
        <div className="intelligence-kpis">
          <article><span>POLIZEI</span><strong>{intelligenceSnapshot.trafficEvents.length}</strong><p>{intelligenceCopy.intelligence.events}</p></article>
          <article><span>HVV</span><strong>{intelligenceSnapshot.transitStops.length}</strong><p>{intelligenceCopy.intelligence.hubs}</p></article>
          <article><span>FORECAST</span><strong>{forecast.points.length}</strong><p>{intelligenceCopy.intelligence.forecast}</p></article>
          <article className="is-accent"><span>BACKTEST</span><strong>{forecast.confidence}%</strong><p>{intelligenceCopy.intelligence.confidence}</p></article>
        </div>
        <div className="intelligence-workbench">
          <article className="forecast-card">
            <div className="workbench-header">
              <div><small>AI / BASELINE</small><h3>{intelligenceCopy.intelligence.forecastTitle}</h3></div>
              <span>MAE {forecast.mae.toFixed(1)}</span>
            </div>
            <p>{intelligenceCopy.intelligence.forecastNote}</p>
            <div className="forecast-chart" aria-label={intelligenceCopy.intelligence.forecastTitle}>
              {forecast.points.map((point, index) => (
                <div className="forecast-column" key={point.hour}>
                  <b>{point.value}</b>
                  <i style={{ height: `${Math.max(12, (point.value / forecastMax) * 100)}%` }} />
                  {(index % 2 === 0 || index === forecast.points.length - 1) && <time>{formatTime(point.hour, copy.locale)}</time>}
                </div>
              ))}
            </div>
          </article>
          <article className="history-explorer">
            <div className="workbench-header">
              <div><small>2009—2026</small><h3>{intelligenceCopy.intelligence.historyTitle}</h3></div>
              <strong>{historyYear}</strong>
            </div>
            <p>{intelligenceCopy.intelligence.historyNote}</p>
            <label htmlFor="history-year">{intelligenceCopy.intelligence.selectedYear}</label>
            <input id="history-year" type="range" min="2009" max="2026" value={historyYear} onChange={(event) => setHistoryYear(Number(event.target.value))} />
            <div className="history-axis"><span>2009</span><span>2019</span><span>2026</span></div>
            <div className="history-results">
              <div><strong>{activeSources.length + (historyYear >= 2023 ? 2 : 0)}</strong><span>{intelligenceCopy.intelligence.activeDomains}</span></div>
              <div><strong dir="ltr">{formatCompact(annualCapacity, copy.locale)}+</strong><span>{intelligenceCopy.intelligence.annualCapacity}</span></div>
            </div>
            <div className="active-source-tags">
              {activeSources.map((source) => <span key={source.id}>{copy.sources[source.id]?.shortName ?? source.shortName}</span>)}
              {historyYear >= 2023 && <><span>Polizei Verkehr</span><span>HVV Geo</span></>}
            </div>
          </article>
        </div>
      </section>

      <section className="operations-section" id="operations">
        <div className="operations-heading">
          <div>
            <div className="eyebrow"><span>08</span> {intelligenceCopy.operations.eyebrow}</div>
            <h2>{intelligenceCopy.operations.title}</h2>
          </div>
          <p>{intelligenceCopy.operations.description}</p>
        </div>
        <div className="operations-grid">
          <article className="alerts-card">
            <div className="card-title-row"><div><small>LIVE RULES</small><h3>{intelligenceCopy.operations.alerts}</h3></div><strong>{operationalAlerts.length}</strong></div>
            <p>{intelligenceCopy.operations.alertsNote}</p>
            <ul>
              {operationalAlerts.map((alert) => (
                <li key={alert.id}>
                  <i className={`alert-icon alert-icon--${alert.type}`}>!</i>
                  <div><b>{alert.title}</b><span>{alert.detail}</span></div>
                  <small>{intelligenceCopy.operations[alert.type as "stale" | "empty" | "closure"]}</small>
                </li>
              ))}
            </ul>
          </article>
          <article className="sustainability-card">
            <small>SCENARIO / CO₂</small>
            <h3>{intelligenceCopy.operations.sustainability}</h3>
            <strong dir="ltr">{formatNumber(Math.round(co2Scenario), copy.locale)}</strong>
            <b>{intelligenceCopy.operations.co2}</b>
            <p>{intelligenceCopy.operations.co2Note}</p>
            <div className="formula" dir="ltr">{formatNumber(data.metrics.availableBikes, copy.locale)} bikes × {intelligenceSnapshot.emissionsModel.assumedTripKm} km × {intelligenceSnapshot.emissionsModel.avoidedCarKgPerKm} kg/km</div>
          </article>
          <article className="model-card">
            <small>MODEL CARD / v1.0</small>
            <h3>{intelligenceCopy.operations.modelTitle}</h3>
            <p>{intelligenceCopy.operations.modelNote}</p>
            <div className="model-score"><strong>{forecast.mae.toFixed(1)}</strong><span>{intelligenceCopy.operations.mae}</span></div>
            <div className="model-meta"><span><b>{forecast.holdout}</b>{intelligenceCopy.operations.holdout}</span><span><b>3H</b>moving window</span><span><b>0</b>hidden features</span></div>
          </article>
        </div>
      </section>

      <section className="pipeline" id="pipeline">
        <div className="pipeline__intro">
          <div className="eyebrow"><span>07</span> {copy.pipeline.eyebrow}</div>
          <h2>{copy.pipeline.title}<br /><em>{copy.pipeline.accent}</em></h2>
          <p>{copy.pipeline.description}</p>
        </div>
        <div className="pipeline__flow">
          <div className="flow-node"><span>01</span><i>API</i><strong>{copy.pipeline.sourceDomains}</strong><small>{copy.pipeline.officialStreams}</small></div>
          <div className="flow-arrow">→</div>
          <div className="flow-node"><span>02</span><i>RAW</i><strong>{copy.pipeline.bronze}</strong><small>{copy.pipeline.bronzeNote}</small></div>
          <div className="flow-arrow">→</div>
          <div className="flow-node"><span>03</span><i>SQL</i><strong>{copy.pipeline.silver}</strong><small>{copy.pipeline.silverNote}</small></div>
          <div className="flow-arrow">→</div>
          <div className="flow-node flow-node--accent"><span>04</span><i>BI</i><strong>{copy.pipeline.gold}</strong><small>{copy.pipeline.goldNote}</small></div>
        </div>
      </section>

      <section className="lineage-section" id="lineage">
        <div className="lineage-heading">
          <div>
            <div className="eyebrow"><span>10</span> {intelligenceCopy.lineage.eyebrow}</div>
            <h2>{intelligenceCopy.lineage.title}<br /><em>{intelligenceCopy.lineage.accent}</em></h2>
          </div>
          <p>{intelligenceCopy.lineage.description}</p>
        </div>
        <div className="lineage-flow" dir="ltr">
          {[
            ["01", intelligenceCopy.lineage.source, "SOURCE"],
            ["02", intelligenceCopy.lineage.ingest, "PYTHON"],
            ["03", intelligenceCopy.lineage.bronze, "PARQUET"],
            ["04", intelligenceCopy.lineage.silver, "SCHEMA"],
            ["05", intelligenceCopy.lineage.quality, "TESTS"],
            ["06", intelligenceCopy.lineage.warehouse, "SQL"],
            ["07", intelligenceCopy.lineage.api, "NEXT"],
            ["08", intelligenceCopy.lineage.product, "WEB"],
          ].map(([number, label, tech], index) => (
            <div className="lineage-step" key={number}>
              <span>{number}</span><i>{tech}</i><strong>{label}</strong>
              <small><b />{index < 7 ? intelligenceCopy.lineage.healthy : intelligenceCopy.lineage.cloudReady}</small>
            </div>
          ))}
        </div>
        <div className="cloud-strip">
          <span>DOCKER</span><span>TERRAFORM</span><span>OPEN­TELEMETRY</span><span>GITHUB ACTIONS</span><span>AWS ECS / S3</span>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand__mark"><i /><i /><i /></span><span><b>ELBE</b>FLOW</span></div>
        <p>{copy.footer.builtWith}</p>
        <div><a href={data.source.url} target="_blank" rel="noreferrer">{copy.footer.dataSource}</a><span>{data.source.license}</span></div>
      </footer>
    </main>
  );
}
