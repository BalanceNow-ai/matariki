"use client";

import { useEffect, useRef, useState } from "react";
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
};

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
export type MapBaseLayer = "linz" | "esri" | "osm";

// LINZ API key for NZ topographic and aerial imagery
const LINZ_API_KEY = "30bfa18d280f436aa56448a8ad74c6b8";

// Base layer configurations
const BASE_LAYERS: Record<MapBaseLayer, { url: string; attribution: string; name: string }> = {
  linz: {
    url: `https://basemaps.linz.govt.nz/v1/tiles/topographic/WebMercatorQuad/{z}/{x}/{y}.webp?api=${LINZ_API_KEY}`,
    attribution: '&copy; <a href="https://www.linz.govt.nz/">LINZ</a> CC-BY 4.0',
    name: "LINZ Topographic",
  },
  esri: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
    name: "ESRI World Imagery",
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
  /** Base map layer - defaults to LINZ */
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

// Create waypoint icon for log entries
function createWaypointIcon(category?: string): L.DivIcon {
  // Color based on category
  const colors: Record<string, { bg: string; border: string }> = {
    sailing: { bg: "#3d7a6e", border: "#5fa89a" },
    hunting: { bg: "#a63d3d", border: "#c45c5c" },
    diving: { bg: "#3d5a7a", border: "#5c7a9a" },
    fishing: { bg: "#7a6e3d", border: "#9a8e5c" },
    general: { bg: "#6b7280", border: "#9ca3af" },
  };
  const { bg, border } = colors[category || "general"] || colors.general;

  return L.divIcon({
    className: "waypoint-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${bg};
        border: 2px solid ${border};
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
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
  baseLayer: initialBaseLayer = "linz",
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

  // Convert track history to polyline coordinates
  const trackCoords: [number, number][] = showTrack
    ? trackHistory.map((pos) => [pos.latitude, pos.longitude])
    : [];

  // Add current position to track if showing
  if (showTrack && trackCoords.length > 0) {
    trackCoords.push([position.latitude, position.longitude]);
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

        {/* Track history polyline */}
        {showTrack && trackCoords.length > 1 && (
          <Polyline
            positions={trackCoords}
            pathOptions={{
              color: "#D97706",
              weight: 3,
              opacity: 0.7,
              dashArray: "5, 10",
            }}
          />
        )}

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
                <Popup>
                  <div className="text-sm max-w-[250px]">
                    {waypoint.heroImageUrl && (
                      <div className="mb-2 -mx-3 -mt-3">
                        <img
                          src={waypoint.heroImageUrl}
                          alt={waypoint.title}
                          className="w-full h-24 object-cover rounded-t"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      {waypoint.category && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded capitalize"
                          style={{
                            backgroundColor:
                              waypoint.category === "sailing"
                                ? "#3d7a6e"
                                : waypoint.category === "hunting"
                                ? "#a63d3d"
                                : waypoint.category === "diving"
                                ? "#3d5a7a"
                                : waypoint.category === "fishing"
                                ? "#7a6e3d"
                                : "#6b7280",
                            color: "white",
                          }}
                        >
                          {waypoint.category}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatWaypointDate(waypoint.publishedAt)}
                      </span>
                    </div>
                    <h3 className="font-bold text-base mb-1">{waypoint.title}</h3>
                    {waypoint.location.name && (
                      <p className="text-xs text-gray-600 mb-1">
                        📍 {waypoint.location.name}
                      </p>
                    )}
                    {waypoint.excerpt && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {waypoint.excerpt}
                      </p>
                    )}
                    <a
                      href={`/log/${waypoint.slug.current}`}
                      className="inline-block text-xs font-medium text-amber-600 hover:text-amber-700"
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

        <MapViewController position={position} autoCenter={autoCenter} />
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
