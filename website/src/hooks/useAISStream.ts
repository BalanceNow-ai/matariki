"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";
const MATARIKI_MMSI = "512004962";

export type AISPosition = {
  lat: number;
  lng: number;
  course: number;
  speed: number;
  heading: number;
  timestamp: string;
  status: string;
};

type AISMessage = {
  MessageType: string;
  MetaData: {
    MMSI: number;
    ShipName: string;
    time_utc: string;
  };
  Message: {
    PositionReport?: {
      Latitude: number;
      Longitude: number;
      Cog: number;
      Sog: number;
      TrueHeading: number;
      NavigationalStatus: number;
    };
  };
};

const NAV_STATUS_MAP: Record<number, string> = {
  0: "Under way using engine",
  1: "At anchor",
  2: "Not under command",
  3: "Restricted manoeuvrability",
  4: "Constrained by draught",
  5: "Moored",
  6: "Aground",
  7: "Engaged in fishing",
  8: "Under way sailing",
  15: "Not defined",
};

export function useAISStream(apiKey: string | undefined) {
  const [position, setPosition] = useState<AISPosition | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!apiKey) {
      console.log("[AIS] No API key configured");
      setError("AIS API key not configured");
      return;
    }

    console.log("[AIS] Connecting to", AISSTREAM_URL);

    try {
      const socket = new WebSocket(AISSTREAM_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[AIS] WebSocket connected, subscribing to MMSI:", MATARIKI_MMSI);
        const subscriptionMessage = {
          Apikey: apiKey,
          BoundingBoxes: [[[-90, -180], [90, 180]]], // Global coverage
          FiltersShipMMSI: [MATARIKI_MMSI],
          FilterMessageTypes: ["PositionReport"],
        };
        socket.send(JSON.stringify(subscriptionMessage));
        setIsConnected(true);
        setError(null);
      };

      socket.onmessage = (event) => {
        try {
          const data: AISMessage = JSON.parse(event.data);
          console.log("[AIS] Received message:", data.MessageType, data.MetaData?.ShipName);

          if (data.Message?.PositionReport) {
            const report = data.Message.PositionReport;
            console.log("[AIS] Position update:", report.Latitude, report.Longitude);
            setPosition({
              lat: report.Latitude,
              lng: report.Longitude,
              course: report.Cog,
              speed: report.Sog,
              heading: report.TrueHeading,
              timestamp: data.MetaData.time_utc,
              status: NAV_STATUS_MAP[report.NavigationalStatus] || "Unknown",
            });
          }
        } catch (e) {
          console.error("[AIS] Failed to parse message:", e);
        }
      };

      socket.onerror = (e) => {
        console.error("[AIS] WebSocket error:", e);
        setError("WebSocket connection error");
        setIsConnected(false);
      };

      socket.onclose = (e) => {
        console.log("[AIS] WebSocket closed:", e.code, e.reason);
        setIsConnected(false);
        // Attempt reconnect after 10 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("[AIS] Attempting reconnect...");
          connect();
        }, 10000);
      };
    } catch (e) {
      console.error("[AIS] Failed to create WebSocket:", e);
      setError("Failed to create WebSocket connection");
    }
  }, [apiKey]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { position, isConnected, error };
}
