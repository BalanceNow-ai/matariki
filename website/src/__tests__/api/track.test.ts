import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/app/api/position/redis-store", () => ({
  getPermanentTrackAsync: vi.fn(),
  getLatestPositionAsync: vi.fn(),
  getRecentPositionHistoryAsync: vi.fn(),
  isRedisConfigured: vi.fn(() => true),
}));

import { GET } from "@/app/api/position/track/route";
import {
  getPermanentTrackAsync,
  getLatestPositionAsync,
  getRecentPositionHistoryAsync,
} from "@/app/api/position/redis-store";

const permanentTrack = [
  {
    latitude: -35.7,
    longitude: 174.3,
    timestamp: "2026-04-12T10:00:00.000Z",
    source: "signalk" as const,
    name: "Matariki III",
    mmsi: "512004962",
  },
];

const recentHistory = [
  {
    latitude: -35.7005,
    longitude: 174.301,
    timestamp: "2026-04-12T10:03:00.000Z",
    source: "signalk" as const,
    name: "Matariki III",
    mmsi: "512004962",
  },
  {
    latitude: -35.701,
    longitude: 174.302,
    timestamp: "2026-04-12T10:06:00.000Z",
    source: "signalk" as const,
    name: "Matariki III",
    mmsi: "512004962",
  },
];

describe("GET /api/position/track", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLatestPositionAsync).mockResolvedValue(permanentTrack[0]);
    vi.mocked(getPermanentTrackAsync).mockResolvedValue(permanentTrack);
  });

  it("always merges recent history newer than permanent track", async () => {
    vi.mocked(getRecentPositionHistoryAsync).mockResolvedValue(recentHistory);

    const request = new NextRequest("http://localhost/api/position/track?type=history");
    const response = await GET(request);
    const data = await response.json();

    expect(getRecentPositionHistoryAsync).toHaveBeenCalledWith(5000);
    expect(data.positionHistory.count).toBe(3);

    const timestamps = data.positionHistory.points.map((p: { timestamp: string }) => p.timestamp);
    expect(timestamps).toEqual([
      "2026-04-12T10:00:00.000Z",
      "2026-04-12T10:03:00.000Z",
      "2026-04-12T10:06:00.000Z",
    ]);
  });

  it("returns permanent track when history fetch fails", async () => {
    vi.mocked(getRecentPositionHistoryAsync).mockRejectedValue(new Error("redis timeout"));

    const request = new NextRequest("http://localhost/api/position/track?type=history");
    const response = await GET(request);
    const data = await response.json();

    expect(data.positionHistory.count).toBe(1);
    expect(data.positionHistory.points[0].timestamp).toBe("2026-04-12T10:00:00.000Z");
  });
});
