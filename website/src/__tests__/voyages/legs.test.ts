import { describe, it, expect } from "vitest";
import {
  buildTimeline,
  formatRange,
  isOpenForCrew,
  legProgress,
  legTrack,
  orderLegs,
  routeLinesFromGeoJson,
  unwrapLines,
  waypointToLatLng,
  type Leg,
} from "@/lib/voyages/legs";

const leg = (over: Partial<Leg> & { _id: string }): Leg => ({ title: over._id, ...over });

describe("isOpenForCrew", () => {
  it("needs status open AND at least one crew place", () => {
    expect(isOpenForCrew({ status: "open", crewPlaces: 2 })).toBe(true);
    expect(isOpenForCrew({ status: "open", crewPlaces: 0 })).toBe(false);
    expect(isOpenForCrew({ status: "open" })).toBe(false);
    expect(isOpenForCrew({ status: "full", crewPlaces: 2 })).toBe(false);
    expect(isOpenForCrew({ status: "closed", crewPlaces: 2 })).toBe(false);
  });
});

describe("orderLegs", () => {
  it("uses the voyage's own legs array, in its order, dropping unpublished refs and duplicates", () => {
    const a = leg({ _id: "a", order: 2 });
    const b = leg({ _id: "b", order: 1 });
    expect(orderLegs([a, null, b, a], [b, a]).map((l) => l._id)).toEqual(["a", "b"]);
  });

  it("falls back to referencing legs sorted by order, then planned start", () => {
    const legs = [
      leg({ _id: "late", plannedStart: "2027-06-01" }),
      leg({ _id: "second", order: 2 }),
      leg({ _id: "early", plannedStart: "2027-01-01" }),
      leg({ _id: "first", order: 1 }),
    ];
    expect(orderLegs([], legs).map((l) => l._id)).toEqual(["first", "second", "early", "late"]);
    expect(orderLegs(undefined, undefined)).toEqual([]);
  });
});

describe("waypointToLatLng", () => {
  it("converts degrees and decimal minutes, with S and W negative", () => {
    expect(
      waypointToLatLng({ latitude: { degrees: 36, minutes: 30, direction: "S" }, longitude: { degrees: 174, minutes: 45, direction: "E" } })
    ).toEqual([-36.5, 174.75]);
    expect(
      waypointToLatLng({ latitude: { degrees: 21, minutes: 6, direction: "S" }, longitude: { degrees: 175, minutes: 12, direction: "W" } })
    ).toEqual([-21.1, -175.2]);
  });

  it("rejects incomplete or out-of-range points", () => {
    expect(waypointToLatLng({ latitude: { degrees: 36 } })).toBeNull();
    expect(waypointToLatLng({ latitude: { degrees: 95, direction: "S" }, longitude: { degrees: 10 } })).toBeNull();
  });
});

describe("legTrack", () => {
  const wp = (number: number, lat: number, lng: number) => ({
    number,
    latitude: { degrees: lat, minutes: 0, direction: "S" },
    longitude: { degrees: lng, minutes: 0, direction: "E" },
  });

  it("orders waypoints by number and adds the from/to points at the ends", () => {
    const track = legTrack({ waypoints: [wp(2, 30, 176), wp(1, 34, 175)], fromPoint: { lat: -35, lng: 174 }, toPoint: { lat: -21, lng: 175 } });
    expect(track).toEqual([
      [-35, 174],
      [-34, 175],
      [-30, 176],
      [-21, 175],
    ]);
  });

  it("does not duplicate an end point that matches a waypoint", () => {
    expect(legTrack({ waypoints: [wp(1, 35, 174), wp(2, 30, 176)], fromPoint: { lat: -35, lng: 174 } })).toHaveLength(2);
  });

  it("uses from/to alone when there are no waypoints, and needs two points for a line", () => {
    expect(legTrack({ fromPoint: { lat: -35, lng: 174 }, toPoint: { lat: -21, lng: 175 } })).toHaveLength(2);
    expect(legTrack({ fromPoint: { lat: -35, lng: 174 } })).toEqual([]);
    expect(legTrack({})).toEqual([]);
  });
});

describe("routeLinesFromGeoJson", () => {
  it("reads LineString, MultiLineString, Feature and FeatureCollection, flipping [lng, lat]", () => {
    const fc = JSON.stringify({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "LineString", coordinates: [[174, -36], [175, -30]] } },
        { type: "Feature", geometry: { type: "MultiLineString", coordinates: [[[1, 2], [3, 4]], [[5, 6], [7, 8]]] } },
        { type: "Feature", geometry: { type: "Point", coordinates: [1, 2] } },
      ],
    });
    const lines = routeLinesFromGeoJson(fc);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual([
      [-36, 174],
      [-30, 175],
    ]);
  });

  it("returns nothing for empty or invalid input", () => {
    expect(routeLinesFromGeoJson(undefined)).toEqual([]);
    expect(routeLinesFromGeoJson("not json")).toEqual([]);
    expect(routeLinesFromGeoJson('{"type":"LineString","coordinates":[[1,2]]}')).toEqual([]);
  });
});

describe("legProgress", () => {
  it("is planned, underway or completed from the actual dates", () => {
    expect(legProgress({})).toBe("planned");
    expect(legProgress({ actualStart: "2027-01-01" })).toBe("underway");
    expect(legProgress({ actualStart: "2027-01-01", actualEnd: "2027-01-05" })).toBe("completed");
  });
});

describe("buildTimeline", () => {
  const today = new Date("2027-01-20T00:00:00Z");

  it("puts planned and actual bars and key events on one axis", () => {
    const t = buildTimeline(
      [
        leg({ _id: "one", plannedStart: "2027-01-01", plannedEnd: "2027-01-10", actualStart: "2027-01-02", actualEnd: "2027-01-11" }),
        leg({ _id: "two", plannedStart: "2027-01-11", plannedEnd: "2027-01-30" }),
      ],
      [{ name: "Regatta", date: "2027-01-15" }],
      today
    )!;
    expect(t.start).toBe("2027-01-01");
    expect(t.end).toBe("2027-01-30");
    expect(t.rows[0].planned).toEqual({ left: 0, width: expect.any(Number) });
    expect(t.rows[0].actual!.left).toBeGreaterThan(0);
    expect(t.rows[0].progress).toBe("completed");
    expect(t.rows[1].actual).toBeNull();
    const second = t.rows[1].planned!;
    expect(second.left + second.width).toBeCloseTo(100, 0);
    expect(t.markers).toHaveLength(1);
    expect(t.markers[0].at).toBeGreaterThan(t.rows[1].planned!.left);
    expect(t.markers[0].at).toBeLessThan(100);
  });

  it("runs an underway leg's actual bar to today", () => {
    const t = buildTimeline([leg({ _id: "x", plannedStart: "2027-01-01", plannedEnd: "2027-01-05", actualStart: "2027-01-01" })], [], today)!;
    expect(t.end).toBe("2027-01-20");
    expect(t.rows[0].actual!.width).toBeCloseTo(100, 0);
    expect(t.rows[0].progress).toBe("underway");
  });

  it("is null when nothing has a date, and keeps undated legs as empty rows", () => {
    expect(buildTimeline([leg({ _id: "x" })], [], today)).toBeNull();
    const t = buildTimeline([leg({ _id: "x" }), leg({ _id: "y", plannedStart: "2027-01-01" })], [], today)!;
    expect(t.rows[0].planned).toBeNull();
    expect(t.rows[1].planned).not.toBeNull();
  });
});

describe("formatRange", () => {
  it("formats NZ-style dates without shifting the day", () => {
    expect(formatRange("2027-01-01", "2027-01-10")).toBe("1 Jan 2027 – 10 Jan 2027");
    expect(formatRange("2027-01-01")).toBe("1 Jan 2027");
    expect(formatRange()).toBe("Dates TBC");
  });
});

describe("unwrapLines", () => {
  it("keeps lines continuous across the 180° meridian (NZ → Tonga → Fiji)", () => {
    const [nzTonga, tongaFiji] = unwrapLines([
      [
        [-35.3, 174.1],
        [-26, 179.5],
        [-21.1, -175.2],
      ],
      [
        [-18.6, -174],
        [-16.8, 179.3],
      ],
    ]);
    expect(nzTonga.map((p) => p[1])).toEqual([174.1, 179.5, 184.8]);
    // The next leg starts on the same side as the last one ended, and stays continuous.
    expect(tongaFiji[0][1]).toBe(186);
    expect(tongaFiji[1][1]).toBeCloseTo(179.3);
  });

  it("leaves lines that don't cross the meridian alone", () => {
    const line: [number, number][] = [
      [-36, 174],
      [-35, 175],
    ];
    expect(unwrapLines([line])).toEqual([line]);
  });
});
