"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import intelligenceSnapshot from "../data/urban-intelligence.json";
import { intelligenceTranslations } from "../lib/intelligence-i18n";
import type { Language, Translation } from "../lib/i18n";
import type { Station, StationStatus } from "../lib/types";

export type MapLayer = "bikes" | "traffic" | "transit" | "all";
type TrafficEvent = (typeof intelligenceSnapshot.trafficEvents)[number];
type TransitStop = (typeof intelligenceSnapshot.transitStops)[number];

export type MapSelection =
  | { kind: "bike"; item: Station }
  | { kind: "traffic"; item: TrafficEvent }
  | { kind: "transit"; item: TransitStop }
  | null;

type StatusFilter = "all" | StationStatus;
type PointFeature<Properties> = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Properties;
};
type PointCollection<Properties> = {
  type: "FeatureCollection";
  features: Array<PointFeature<Properties>>;
};

type BikeProperties = {
  id: number;
  name: string;
  availableBikes: number;
  status: StationStatus;
  observedAt: string;
};
type TrafficProperties = { id: string; status: string; title: string };
type TransitProperties = { id: string; name: string; mode: string };

const HAMBURG_BOUNDS: [[number, number], [number, number]] = [
  [9.69, 53.38],
  [10.35, 53.75],
];
const HAMBURG_MAX_BOUNDS: [[number, number], [number, number]] = [
  [9.45, 53.25],
  [10.58, 53.90],
];
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

function asBikeCollection(stations: Station[], status: StatusFilter): PointCollection<BikeProperties> {
  return {
    type: "FeatureCollection",
    features: stations
      .filter((station) => status === "all" || station.status === status)
      .map((station) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [station.longitude, station.latitude] },
        properties: {
          id: station.id,
          name: station.name,
          availableBikes: station.availableBikes,
          status: station.status,
          observedAt: station.observedAt,
        },
      })),
  };
}

const trafficCollection: PointCollection<TrafficProperties> = {
  type: "FeatureCollection",
  features: intelligenceSnapshot.trafficEvents.map((event) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [event.longitude, event.latitude] },
    properties: { id: event.id, status: event.status, title: event.title },
  })),
};

const transitCollection: PointCollection<TransitProperties> = {
  type: "FeatureCollection",
  features: intelligenceSnapshot.transitStops.map((stop) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [stop.longitude, stop.latitude] },
    properties: { id: stop.id, name: stop.name, mode: stop.mode },
  })),
};

function layerVisibility(layer: MapLayer, kind: Exclude<MapLayer, "all">) {
  return layer === "all" || layer === kind ? "visible" : "none";
}

export function HamburgMobilityMap({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const stationsRef = useRef(stations);
  const selectRef = useRef(onSelect);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [view, setView] = useState({ zoom: 9.1, stations: stations.length });
  const intelligenceCopy = intelligenceTranslations[language];
  const bikeCollection = useMemo(() => asBikeCollection(stations, status), [stations, status]);

  useEffect(() => {
    stationsRef.current = stations;
    selectRef.current = onSelect;
  }, [onSelect, stations]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !containerRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        bounds: HAMBURG_BOUNDS,
        fitBoundsOptions: { padding: 34 },
        maxBounds: HAMBURG_MAX_BOUNDS,
        minZoom: 8,
        maxZoom: 18,
        pitchWithRotate: false,
        dragRotate: false,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.FullscreenControl(), "top-right");
      map.addControl(new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

      const updateView = () => {
        const bounds = map.getBounds();
        const inView = stationsRef.current.filter((station) => bounds.contains([station.longitude, station.latitude])).length;
        setView({ zoom: map.getZoom(), stations: inView });
      };

      map.on("load", () => {
        if (disposed) return;
        map.addSource("bike-stations", {
          type: "geojson",
          data: asBikeCollection(stationsRef.current, "all"),
          cluster: true,
          clusterMaxZoom: 13,
          clusterRadius: 44,
        });
        map.addSource("traffic-events", { type: "geojson", data: trafficCollection });
        map.addSource("transit-stops", { type: "geojson", data: transitCollection });

        map.addLayer({
          id: "bike-clusters",
          type: "circle",
          source: "bike-stations",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": ["step", ["get", "point_count"], "#d9ff62", 25, "#73ddd0", 70, "#0a6f69"],
            "circle-radius": ["step", ["get", "point_count"], 17, 25, 22, 70, 28],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.94,
          },
        });
        map.addLayer({
          id: "bike-cluster-count",
          type: "symbol",
          source: "bike-stations",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 11,
          },
          paint: { "text-color": "#0a1716" },
        });
        map.addLayer({
          id: "bike-points",
          type: "circle",
          source: "bike-stations",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4.5, 13, 7, 17, 11],
            "circle-color": [
              "match", ["get", "status"],
              "healthy", "#7ecb3b",
              "low", "#f1bd3d",
              "empty", "#ff725e",
              "#7b8582",
            ],
            "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 9, 1.5, 17, 3],
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.95,
          },
        });
        map.addLayer({
          id: "bike-availability",
          type: "symbol",
          source: "bike-stations",
          minzoom: 14.25,
          filter: ["!", ["has", "point_count"]],
          layout: {
            "text-field": ["to-string", ["get", "availableBikes"]],
            "text-font": ["Noto Sans Regular"],
            "text-size": 9,
          },
          paint: { "text-color": "#0a1716" },
        });
        map.addLayer({
          id: "traffic-points",
          type: "circle",
          source: "traffic-events",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 6, 16, 10],
            "circle-color": ["match", ["get", "status"], "congestion", "#c34136", "closure", "#a92d2d", "#ef8b2c"],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "traffic-labels",
          type: "symbol",
          source: "traffic-events",
          layout: { "text-field": "!", "text-font": ["Noto Sans Regular"], "text-size": 11 },
          paint: { "text-color": "#ffffff" },
        });
        map.addLayer({
          id: "transit-points",
          type: "circle",
          source: "transit-stops",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 6, 16, 10],
            "circle-color": "#316da8",
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "transit-labels",
          type: "symbol",
          source: "transit-stops",
          layout: { "text-field": "H", "text-font": ["Noto Sans Regular"], "text-size": 9 },
          paint: { "text-color": "#ffffff" },
        });

        map.on("click", "bike-clusters", async (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["bike-clusters"] })[0];
          const clusterId = Number(feature?.properties?.cluster_id);
          if (!feature || !Number.isFinite(clusterId) || feature.geometry.type !== "Point") return;
          const source = map.getSource("bike-stations") as GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom, duration: 650 });
        });
        map.on("click", "bike-points", (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["bike-points"] })[0];
          const station = stationsRef.current.find((item) => item.id === Number(feature?.properties?.id));
          if (!station) return;
          selectRef.current({ kind: "bike", item: station });
          map.easeTo({ center: [station.longitude, station.latitude], duration: 450 });
        });
        map.on("click", "traffic-points", (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["traffic-points"] })[0];
          const item = intelligenceSnapshot.trafficEvents.find((eventItem) => eventItem.id === feature?.properties?.id);
          if (!item) return;
          selectRef.current({ kind: "traffic", item });
          map.easeTo({ center: [item.longitude, item.latitude], duration: 450 });
        });
        map.on("click", "transit-points", (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["transit-points"] })[0];
          const item = intelligenceSnapshot.transitStops.find((stop) => stop.id === feature?.properties?.id);
          if (!item) return;
          selectRef.current({ kind: "transit", item });
          map.easeTo({ center: [item.longitude, item.latitude], duration: 450 });
        });

        for (const interactiveLayer of ["bike-clusters", "bike-points", "traffic-points", "transit-points"]) {
          map.on("mouseenter", interactiveLayer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", interactiveLayer, () => { map.getCanvas().style.cursor = ""; });
        }
        map.on("moveend", updateView);
        setMapReady(true);
        updateView();
      });
      map.on("error", () => {
        if (!map.loaded()) setMapFailed(true);
      });
    }).catch(() => setMapFailed(true));

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const source = mapRef.current?.getSource("bike-stations") as GeoJSONSource | undefined;
    source?.setData(bikeCollection);
  }, [bikeCollection, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const visibility = {
      bikes: layerVisibility(layer, "bikes"),
      traffic: layerVisibility(layer, "traffic"),
      transit: layerVisibility(layer, "transit"),
    };
    for (const id of ["bike-clusters", "bike-cluster-count", "bike-points", "bike-availability"]) {
      map.setLayoutProperty(id, "visibility", visibility.bikes);
    }
    for (const id of ["traffic-points", "traffic-labels"]) map.setLayoutProperty(id, "visibility", visibility.traffic);
    for (const id of ["transit-points", "transit-labels"]) map.setLayoutProperty(id, "visibility", visibility.transit);
  }, [layer, mapReady]);

  const selectedTitle = !selection
    ? ""
    : selection.kind === "traffic"
      ? selection.item.title
      : selection.item.name;
  const selectedCoordinates = !selection
    ? null
    : [selection.item.longitude, selection.item.latitude] as const;

  return (
    <div className="map-experience" dir="ltr">
      <div className="map-toolbar">
        <div>
          <b>{intelligenceCopy.map.clearTitle}</b>
          <span>{intelligenceCopy.map.officialLayers} · OpenStreetMap</span>
        </div>
        <div className="map-layer-switcher" role="group" aria-label={intelligenceCopy.map.layers}>
          {(["bikes", "traffic", "transit", "all"] as MapLayer[]).map((value) => (
            <button key={value} type="button" className={layer === value ? "is-selected" : ""} onClick={() => onLayerChange(value)}>
              {intelligenceCopy.map[value]}
            </button>
          ))}
        </div>
      </div>
      <div className="network-map network-map--vector" data-map-ready={mapReady} data-map-zoom={view.zoom.toFixed(1)} aria-label={copy.map.mapAria}>
        <div ref={containerRef} className="network-map__canvas" />
        {!mapReady && !mapFailed && <div className="map-loading"><i />{intelligenceCopy.map.loading}</div>}
        {mapFailed && <div className="map-loading map-loading--error">{intelligenceCopy.map.unavailable}</div>}
        <button
          className="map-reset"
          type="button"
          onClick={() => mapRef.current?.fitBounds(HAMBURG_BOUNDS, { padding: 34, duration: 700 })}
        >
          <span>⌖</span>{intelligenceCopy.map.resetView}
        </button>
        <div className="map-view-status">
          <span>{intelligenceCopy.map.zoom} {view.zoom.toFixed(1)}</span>
          <b>{view.stations} {copy.map.stationsInView}</b>
        </div>
        {selection && selectedCoordinates && (
          <aside className="map-detail" aria-live="polite">
            <button type="button" onClick={() => onSelect(null)} aria-label={intelligenceCopy.map.close}>×</button>
            <span>{selection.kind === "bike" ? "STADTRAD" : selection.kind === "traffic" ? "POLIZEI HAMBURG" : "HVV"}</span>
            <h3>{selectedTitle}</h3>
            {selection.kind === "bike" && <p>{selection.item.availableBikes} {copy.map.bikes} · {copy.status[selection.item.status]} · {formatTime(selection.item.observedAt, copy.locale)}</p>}
            {selection.kind === "traffic" && <p>{selection.item.description}</p>}
            {selection.kind === "transit" && <p>{selection.item.lines.join(" · ")}<br />{selection.item.departures} {intelligenceCopy.map.departures}</p>}
            <div className="map-detail__coordinates">
              <small>{intelligenceCopy.map.coordinates}</small>
              <code>{selectedCoordinates[1].toFixed(5)}, {selectedCoordinates[0].toFixed(5)}</code>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
