"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Types for position data
export type VesselPosition = {
  latitude: number;
  longitude: number;
  timestamp: string;
  heading?: number;
  courseOverGround?: number;
  speedOverGround?: number;
  /** Segment index - points in same segment form a continuous track */
  segmentIndex?: number;
  /** Waypoint name (e.g., from KML/GPX imports) */
  name?: string;
};

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Split track points into segments, breaking on large gaps
 * This prevents drawing lines across the map when there are discontinuities
 */
function splitIntoSegments(
  positions: VesselPosition[],
  maxGapMeters: number = 50000 // 50km max gap
): VesselPosition[][] {
  if (positions.length === 0) {
    return [];
  }

  const segments: VesselPosition[][] = [];
  let currentSegment: VesselPosition[] = [positions[0]];

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];

    // Check if segment changed (if we have segment info)
    const segmentChanged = prev.segmentIndex !== undefined &&
      curr.segmentIndex !== undefined &&
      prev.segmentIndex !== curr.segmentIndex;

    // Distance is only a usable signal when the server has not told us where
    // the breaks are. Once points carry a segmentIndex, a long straight run
    // between two of them is simplification doing its job on an ocean leg —
    // not a gap in the record — and splitting there would break the line.
    const hasServerSegments =
      prev.segmentIndex !== undefined && curr.segmentIndex !== undefined;
    const distance = distanceMeters(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const largeGap = !hasServerSegments && distance > maxGapMeters;

    if (segmentChanged || largeGap) {
      // Start new segment
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      currentSegment = [curr];
    } else {
      currentSegment.push(curr);
    }
  }

  // Don't forget the last segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }


  return segments;
}

// Log entry waypoint type
export type LogEntryWaypoint = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  category?: string;
  excerpt?: string;
  location: {
    name?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  voyageTitle?: string;
  heroImageUrl?: string;
};

// Map base layer options
export type MapBaseLayer = "esri" | "osm";

// Base layer configurations
const BASE_LAYERS: Record<MapBaseLayer, { url: string; attribution: string; name: string }> = {
  esri: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
    name: "ESRI Satellite",
  },
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    name: "OpenStreetMap",
  },
};

type OpenSeaMapClientProps = {
  position: VesselPosition;
  trackHistory?: VesselPosition[];
  waypoints?: LogEntryWaypoint[];
  showTrack?: boolean;
  showWaypoints?: boolean;
  zoom?: number;
  className?: string;
  /** Base map layer - defaults to ESRI satellite */
  baseLayer?: MapBaseLayer;
};

// Create custom vessel icon (boat shape pointing in direction of travel) with pulsing animation
function createVesselIcon(heading?: number): L.DivIcon {
  const rotation = heading ?? 0;

  return L.divIcon({
    className: "vessel-marker",
    html: `
      <div class="vessel-icon-container" style="position: relative; width: 48px; height: 48px;">
        <!-- Pulsing rings -->
        <div class="pulse-ring pulse-ring-1" style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 48px;
          height: 48px;
          border: 2px solid #D97706;
          border-radius: 50%;
          animation: pulse-expand 2s ease-out infinite;
          opacity: 0;
        "></div>
        <div class="pulse-ring pulse-ring-2" style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 48px;
          height: 48px;
          border: 2px solid #D97706;
          border-radius: 50%;
          animation: pulse-expand 2s ease-out infinite 0.6s;
          opacity: 0;
        "></div>
        <!-- Vessel icon -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(${rotation}deg);
          transform-origin: center center;
        ">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2L8 28L16 24L24 28L16 2Z" fill="#D97706" stroke="#FCD34D" stroke-width="1.5"/>
            <circle cx="16" cy="14" r="3" fill="#FCD34D"/>
          </svg>
        </div>
      </div>
      <style>
        @keyframes pulse-expand {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
      </style>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

/**
 * Category fills, saturated enough to hold their own against satellite
 * imagery. The muted originals were chosen to sit quietly on the site's dark
 * chrome, but over forest and rock they simply disappeared.
 *
 * Shared with the popup badge so the two cannot drift apart.
 */
const CATEGORY_COLORS: Record<string, string> = {
  sailing: "#0d9488",
  hunting: "#dc2626",
  diving: "#2563eb",
  // Not the copper of the track line — a fishing marker in that colour reads
  // as part of the route rather than a point on it.
  fishing: "#eab308",
  general: "#64748b",
};

function categoryColor(category?: string): string {
  return CATEGORY_COLORS[category || "general"] || CATEGORY_COLORS.general;
}

// Create waypoint icon for log entries
function createWaypointIcon(category?: string): L.DivIcon {
  const bg = categoryColor(category);

  return L.divIcon({
    className: "waypoint-marker",
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${bg};
        border: 4px solid #ffffff;
        border-radius: 50%;
        /* A white ring separates the marker from dark water and bush; the
           dark hairline outside it does the same over snow and pale rock.
           Between them the marker reads on any basemap. */
        box-shadow: 0 0 0 1.5px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

// Map view controller component
function MapViewController({
  position,
  autoCenter,
}: {
  position: VesselPosition;
  autoCenter: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (autoCenter) {
      map.setView([position.latitude, position.longitude], map.getZoom());
    }
  }, [map, position.latitude, position.longitude, autoCenter]);

  return null;
}

export function OpenSeaMapClient({
  position,
  trackHistory = [],
  waypoints = [],
  showTrack = true,
  showWaypoints = true,
  zoom = 12,
  className = "",
  baseLayer: initialBaseLayer = "esri",
}: OpenSeaMapClientProps) {
  const [autoCenter, setAutoCenter] = useState(true);
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>(initialBaseLayer);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  const currentLayer = BASE_LAYERS[baseLayer];

  // Format date for waypoint popup
  const formatWaypointDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-NZ", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Split track history into segments to avoid drawing lines across large gaps.
  // Memoised: this walks the whole track, which now runs to thousands of
  // points, and it was re-running on every render of the map.
  const trackSegments = useMemo(
    () => (showTrack ? splitIntoSegments(trackHistory) : []),
    [showTrack, trackHistory]
  );

  // Convert each segment to polyline coordinates
  const trackSegmentCoords: [number, number][][] = trackSegments.map(segment =>
    segment.map(pos => [pos.latitude, pos.longitude])
  );


  // Add current position to the last segment if showing
  if (showTrack && trackSegmentCoords.length > 0) {
    const lastSegment = trackSegmentCoords[trackSegmentCoords.length - 1];
    if (lastSegment.length > 0) {
      // Only add if reasonably close to last track point (within 50km)
      const lastPoint = lastSegment[lastSegment.length - 1];
      const distToLast = distanceMeters(lastPoint[0], lastPoint[1], position.latitude, position.longitude);
      if (distToLast < 50000) {
        lastSegment.push([position.latitude, position.longitude]);
      }
    }
  }

  // Format timestamp for popup
  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString("en-NZ", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapContainer
        center={[position.latitude, position.longitude]}
        zoom={zoom}
        className="w-full h-full min-h-[400px]"
        ref={mapRef}
        zoomControl={true}
        attributionControl={true}
      >
        {/* Base layer - configurable */}
        <TileLayer
          key={baseLayer}
          url={currentLayer.url}
          attribution={currentLayer.attribution}
        />

        {/* Marine overlay: OpenSeaMap */}
        <TileLayer
          url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a>'
        />

        {/* Track history polylines - one per segment to avoid cross-map lines */}
        {showTrack && trackSegmentCoords.map((segmentCoords, idx) => {
          return segmentCoords.length > 1 ? (
            <Polyline
              key={`track-segment-${idx}`}
              positions={segmentCoords}
              pathOptions={{
                color: "#F59E0B",
                weight: 4,
                opacity: 0.9,
              }}
            />
          ) : null;
        })}

        {/* Waypoint markers for log entries (no connecting line - track only shows historical GPS positions) */}
        {showWaypoints &&
          waypoints
            .filter((wp) => wp.location?.coordinates?.lat && wp.location?.coordinates?.lng)
            .map((waypoint) => (
              <Marker
                key={waypoint._id}
                position={[
                  waypoint.location.coordinates!.lat,
                  waypoint.location.coordinates!.lng,
                ]}
                icon={createWaypointIcon(waypoint.category)}
              >
                {/* Leaflet caps popups at 300px by default, which would clamp
                    the sizes below and make the change look like it did
                    nothing. */}
                <Popup maxWidth={350} minWidth={280}>
                  <div className="text-base max-w-[min(330px,86vw)] min-w-[280px]">
                    {waypoint.heroImageUrl && (
                      <div className="mb-2 -mx-3 -mt-3">
                        <img
                          src={waypoint.heroImageUrl}
                          alt={waypoint.title}
                          className="w-full h-36 object-cover rounded-t"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      {waypoint.category && (
                        <span
                          className="text-sm px-2 py-0.5 rounded capitalize font-medium"
                          style={{
                            backgroundColor: categoryColor(waypoint.category),
                            color: "white",
                          }}
                        >
                          {waypoint.category}
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {formatWaypointDate(waypoint.publishedAt)}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg leading-snug mb-1.5">{waypoint.title}</h3>
                    {waypoint.location.name && (
                      <p className="text-sm text-gray-600 mb-1">
                        📍 {waypoint.location.name}
                      </p>
                    )}
                    {waypoint.excerpt && (
                      <p className="text-sm text-gray-600 line-clamp-3 mb-2.5">
                        {waypoint.excerpt}
                      </p>
                    )}
                    <a
                      href={`/log/${waypoint.slug.current}`}
                      className="inline-block text-sm font-semibold text-amber-600 hover:text-amber-700"
                    >
                      Read full entry →
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}

        {/* Vessel marker */}
        <Marker
          position={[position.latitude, position.longitude]}
          icon={createVesselIcon(position.heading ?? position.courseOverGround)}
        >
          <Popup>
            <div className="text-sm">
              <h3 className="font-bold text-base mb-1">Matariki III</h3>
              <p className="text-gray-600">
                {position.latitude.toFixed(5)}°,{" "}
                {position.longitude.toFixed(5)}°
              </p>
              {position.speedOverGround !== undefined && (
                <p>SOG: {position.speedOverGround.toFixed(1)} kts</p>
              )}
              {(position.heading ?? position.courseOverGround) !== undefined && (
                <p>
                  HDG:{" "}
                  {(position.heading ?? position.courseOverGround)?.toFixed(0)}°
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formatTimestamp(position.timestamp)}
              </p>
            </div>
          </Popup>
        </Marker>

        <MapViewController
          position={position}
          autoCenter={autoCenter}
        />
      </MapContainer>


      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setAutoCenter(!autoCenter)}
          className={`px-3 py-2 rounded-lg text-xs font-medium shadow-lg transition-colors ${
            autoCenter
              ? "bg-copper-accent text-white"
              : "bg-white/90 text-slate-700 hover:bg-white"
          }`}
          title={autoCenter ? "Auto-center ON" : "Auto-center OFF"}
        >
          {autoCenter ? "Tracking" : "Track"}
        </button>


        {/* Layer selector */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="px-3 py-2 rounded-lg text-xs font-medium shadow-lg transition-colors bg-white/90 text-slate-700 hover:bg-white flex items-center gap-1"
            title="Change map layer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Layers
          </button>

          {showLayerMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg overflow-hidden min-w-[160px]">
              {(Object.keys(BASE_LAYERS) as MapBaseLayer[]).map((layer) => (
                <button
                  key={layer}
                  onClick={() => {
                    setBaseLayer(layer);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors ${
                    baseLayer === layer
                      ? "bg-copper-accent text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {BASE_LAYERS[layer].name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
