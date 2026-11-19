"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { unwrapLines, type LatLng } from "@/lib/voyages/legs";

export type MapTrack = {
  id: string;
  title: string;
  coords: LatLng[];
  /** Highlighted tracks draw in copper; others in a muted tone. */
  highlighted?: boolean;
  /** Planned-only (not yet sailed) tracks are dashed. */
  dashed?: boolean;
  href?: string;
};

export type LegMapClientProps = {
  tracks: MapTrack[];
  /** Extra background lines, e.g. the voyage's overall route GeoJSON. */
  routeLines?: LatLng[][];
  className?: string;
};

const COPPER = "#F59E0B";
const MUTED = "#94a3b8";

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 9);
    else map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 11 });
  }, [map, points]);
  return null;
}

export function LegMapClient({ tracks: rawTracks, routeLines: rawRoute = [], className }: LegMapClientProps) {
  // Keep every line on one side of the 180° meridian so Pacific legs draw the short way.
  const unwrapped = unwrapLines([...rawTracks.map((t) => t.coords), ...rawRoute]);
  const tracks = rawTracks.map((t, i) => ({ ...t, coords: unwrapped[i] }));
  const routeLines = unwrapped.slice(rawTracks.length);
  const all = [...tracks.flatMap((t) => t.coords), ...routeLines.flat()];
  return (
    <MapContainer
      center={all[0] ?? [-36.84, 174.76]}
      zoom={6}
      scrollWheelZoom={false}
      className={className}
      style={{ background: "#0a1628" }}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
      />
      <TileLayer
        url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a>'
      />
      {routeLines.map((line, i) => (
        // Background to leg tracks when there are any; the main line (copper) when it's all there is.
        <Polyline
          key={`route-${i}`}
          positions={line}
          pathOptions={tracks.length ? { color: MUTED, weight: 2, opacity: 0.6, dashArray: "4 8" } : { color: COPPER, weight: 3, opacity: 0.9, dashArray: "8 8" }}
        />
      ))}
      {tracks.map((t) => (
        <Polyline
          key={t.id}
          positions={t.coords}
          pathOptions={{
            color: t.highlighted === false ? MUTED : COPPER,
            weight: t.highlighted === false ? 3 : 4,
            opacity: 0.9,
            dashArray: t.dashed ? "8 8" : undefined,
          }}
          eventHandlers={t.href ? { click: () => (window.location.href = t.href!) } : undefined}
        >
          <Tooltip sticky>{t.title}</Tooltip>
        </Polyline>
      ))}
      {tracks.flatMap((t) =>
        [t.coords[0], t.coords.at(-1)].filter(Boolean).map((p, i) => (
          <CircleMarker
            key={`${t.id}-end-${i}`}
            center={p!}
            radius={4}
            pathOptions={{ color: "#f8fafc", weight: 1, fillColor: t.highlighted === false ? MUTED : COPPER, fillOpacity: 1 }}
          />
        ))
      )}
      <FitBounds points={all} />
    </MapContainer>
  );
}
