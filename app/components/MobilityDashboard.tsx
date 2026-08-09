"use client";

import { useEffect, useMemo, useState } from "react";
import {
  interpolate,
  languageOptions,
  translations,
  type Language,
  type Translation,
} from "../lib/i18n";
import type { DashboardData, MobilitySource, Station, StationStatus } from "../lib/types";

type Props = { initialData: DashboardData };
type Range = "6H" | "12H" | "24H";
type StatusFilter = "all" | StationStatus;

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
}: {
  stations: Station[];
  status: StatusFilter;
  copy: Translation;
}) {
  const visible = stations
    .filter((station) => status === "all" || station.status === status)
    .filter((station) => station.longitude >= 9.72 && station.longitude <= 10.25)
    .filter((station) => station.latitude >= 53.43 && station.latitude <= 53.73);
  const plotted = visible.slice(0, 180);

  return (
    <div className="network-map" aria-label={copy.map.mapAria} dir="ltr">
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
            aria-label={`${station.name}: ${station.availableBikes} ${copy.map.bikes}, ${copy.status[station.status]}`}
            title={`${station.name}\n${station.availableBikes} ${copy.map.bikes} · ${copy.status[station.status]}\n${formatTime(station.observedAt, copy.locale)}`}
          />
        );
      })}
      <div className="map-scale"><span /> 2 KM</div>
      <div className="map-count">{visible.length} {copy.map.stationsInView}</div>
    </div>
  );
}

export function MobilityDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [liveState, setLiveState] = useState<"connecting" | "live" | "snapshot">("connecting");
  const [range, setRange] = useState<Range>("24H");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [language, setLanguage] = useState<Language>("de");
  const copy = translations[language];

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
          <a href="#pipeline">{copy.nav.pipeline}</a>
          <a href="#quality">{copy.nav.quality}</a>
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
          <p>{interpolate(copy.hero.description, { count: data.universe.sourceCount })}</p>
          <div className="hero__meta">
            <span>53.5511° N</span>
            <span>09.9937° E</span>
            <span dir="ltr">{formatCompact(data.universe.totalStreams, copy.locale)} {copy.hero.streams}</span>
          </div>
        </div>
      </section>

      <section className="metrics" aria-label={copy.metrics.aria}>
        <MetricCard label={copy.metrics.streams} value={formatNumber(data.universe.totalStreams, copy.locale)} note={interpolate(copy.metrics.streamsNote, { count: data.universe.sourceCount })} />
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
          <NetworkMap stations={data.stations} status={status} copy={copy} />
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
            <div><strong>5/5</strong><span>{copy.quality.sourcesVerified}</span></div>
          </div>
          <ul className="checks">
            <li><span className="check-ok">✓</span><div><b>{copy.quality.provenance}</b><small>{copy.quality.provenanceNote}</small></div></li>
            <li><span className="check-ok">✓</span><div><b>{copy.quality.identity}</b><small>{copy.quality.identityNote}</small></div></li>
            <li><span className="check-ok">✓</span><div><b>{copy.quality.cadence}</b><small>{copy.quality.cadenceNote}</small></div></li>
          </ul>
        </article>
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

      <footer>
        <div className="brand"><span className="brand__mark"><i /><i /><i /></span><span><b>ELBE</b>FLOW</span></div>
        <p>{copy.footer.builtWith}</p>
        <div><a href={data.source.url} target="_blank" rel="noreferrer">{copy.footer.dataSource}</a><span>{data.source.license}</span></div>
      </footer>
    </main>
  );
}
