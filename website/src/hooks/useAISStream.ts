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
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  const connect = useCallback(() => {
    if (!apiKey) {
      setError("AIS API key not configured");
      return;
    }

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log("[AIS] Max reconnect attempts reached, giving up");
      setError("AIS service unavailable");
      return;
    }

    console.log("[AIS] Connecting to", AISSTREAM_URL, `(attempt ${reconnectAttemptsRef.current + 1})`);

    try {
      const socket = new WebSocket(AISSTREAM_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[AIS] WebSocket connected, subscribing to MMSI:", MATARIKI_MMSI);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
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
          const data = JSON.parse(event.data);

          // Check for error messages from AIS Stream
          if (data.error || data.Error) {
            const errorMsg = data.error || data.Error;
            console.error("[AIS] Server error:", errorMsg);
            setError(`AIS error: ${errorMsg}`);
            setIsConnected(false);
            return;
          }

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

      socket.onerror = (event) => {
        console.error("[AIS] WebSocket error:", event);
        setError("Connection failed - check browser console");
        setIsConnected(false);
      };

      socket.onclose = (e) => {
        console.log("[AIS] WebSocket closed - code:", e.code, "reason:", e.reason);
        setIsConnected(false);
        reconnectAttemptsRef.current++;

        // Provide specific error messages based on close code
        let closeError = "";
        if (e.code === 1006) {
          closeError = "Connection lost (code 1006)";
        } else if (e.code === 1008) {
          closeError = "Invalid API key (code 1008)";
        } else if (e.code === 1011) {
          closeError = "Server error (code 1011)";
        } else if (e.code !== 1000) {
          closeError = `Disconnected (code ${e.code})`;
        }

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          // Exponential backoff: 10s, 20s, 40s
          const delay = 10000 * Math.pow(2, reconnectAttemptsRef.current - 1);
          console.log(`[AIS] Reconnecting in ${delay/1000}s...`);
          setError(closeError ? `${closeError} - reconnecting...` : null);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError(closeError || "AIS service unavailable after 3 attempts");
        }
      };
    } catch (e) {
      console.error("[AIS] Failed to create WebSocket:", e);
      setError("Failed to connect to AIS");
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
