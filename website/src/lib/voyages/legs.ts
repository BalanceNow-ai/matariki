/**
 * Pure helpers for voyage legs (the `passage` type): ordering, tracks, the
 * planned-vs-actual timeline and crew availability. No I/O, so it's shared by
 * the pages and the tests.
 */

export type LatLng = [lat: number, lng: number];

type Angle = { degrees?: number; minutes?: number; direction?: string };
export type Waypoint = { _key?: string; number?: number; name?: string; latitude?: Angle; longitude?: Angle };
export type GeoPoint = { lat?: number; lng?: number };

export type LegKind = "oceanPassage" | "cruisingGround" | "portStay";

export type Leg = {
  _id: string;
  title: string;
  slug?: string;
  order?: number;
  kind?: LegKind;
  fromPlace?: string;
  toPlace?: string;
  fromPoint?: GeoPoint;
  toPoint?: GeoPoint;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  plannedDistanceNm?: number;
  actualDistanceNm?: number;
  waypoints?: Waypoint[];
  crewPlaces?: number;
  status?: "open" | "full" | "closed";
  heroImage?: unknown;
};

export type KeyEvent = { _key?: string; name: string; date: string; place?: string; url?: string };

export const LEG_KIND_LABELS: Record<LegKind, string> = {
  oceanPassage: "Ocean passage",
  cruisingGround: "Cruising ground",
  portStay: "Port stay",
};

/** Same rule as /crew: open, with at least one crew place. */
export function isOpenForCrew(leg: Pick<Leg, "status" | "crewPlaces">): boolean {
  return leg.status === "open" && typeof leg.crewPlaces === "number" && leg.crewPlaces > 0;
}

/**
 * The voyage's legs in order: the voyage's own `legs` array when it has any
 * (that is the editor's ordering), otherwise every leg referencing the voyage
 * sorted by `order`, then planned start. Missing (unpublished) references drop out.
 */
export function orderLegs(listed: (Leg | null | undefined)[] | null | undefined, referencing: Leg[] | null | undefined): Leg[] {
  const fromList = (listed ?? []).filter((l): l is Leg => Boolean(l && l._id));
  if (fromList.length) {
    const seen = new Set<string>();
    return fromList.filter((l) => !seen.has(l._id) && seen.add(l._id));
  }
  return [...(referencing ?? [])].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return (a.plannedStart ?? "9999").localeCompare(b.plannedStart ?? "9999");
  });
}

function angleToDecimal(a: Angle | undefined, negative: string): number | null {
  if (!a || typeof a.degrees !== "number") return null;
  const value = a.degrees + (typeof a.minutes === "number" ? a.minutes : 0) / 60;
  return a.direction === negative ? -value : value;
}

/** A degrees/decimal-minutes waypoint as [lat, lng], or null if incomplete. */
export function waypointToLatLng(wp: Waypoint): LatLng | null {
  const lat = angleToDecimal(wp.latitude, "S");
  const lng = angleToDecimal(wp.longitude, "W");
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

const pointToLatLng = (p?: GeoPoint): LatLng | null =>
  p && typeof p.lat === "number" && typeof p.lng === "number" ? [p.lat, p.lng] : null;

/**
 * A leg's track: its waypoints in order (by number, then as listed), with the
 * from/to points at either end when set. Fewer than two points means no line.
 */
export function legTrack(leg: Pick<Leg, "waypoints" | "fromPoint" | "toPoint">): LatLng[] {
  const wps = [...(leg.waypoints ?? [])]
    .map((wp, i) => ({ wp, i }))
    .sort((a, b) => (a.wp.number ?? a.i) - (b.wp.number ?? b.i))
    .map(({ wp }) => waypointToLatLng(wp))
    .filter((p): p is LatLng => p !== null);
  const from = pointToLatLng(leg.fromPoint);
  const to = pointToLatLng(leg.toPoint);
  const same = (a: LatLng, b: LatLng) => a[0] === b[0] && a[1] === b[1];
  const track = [...wps];
  if (from && !(track[0] && same(track[0], from))) track.unshift(from);
  if (to && !(track.at(-1) && same(track.at(-1)!, to))) track.push(to);
  return track.length >= 2 ? track : [];
}

/**
 * Make lines continuous across the 180° meridian (e.g. NZ → Tonga → Fiji):
 * each point's longitude is shifted by ±360 so it is within 180° of the point
 * before it, and each line starts within 180° of where the previous one ended.
 * Leaflet draws longitudes beyond ±180 correctly, so lines take the short way.
 */
export function unwrapLines(lines: LatLng[][]): LatLng[][] {
  let ref: number | null = null;
  const near = (lng: number, to: number) => lng + 360 * Math.round((to - lng) / 360);
  return lines.map((line) =>
    line.map(([lat, lng]) => {
      const out: LatLng = [lat, ref === null ? lng : near(lng, ref)];
      ref = out[1];
      return out;
    })
  );
}

/** Lines from a GeoJSON LineString / MultiLineString / Feature / FeatureCollection, as [lat, lng]. Invalid input gives []. */
export function routeLinesFromGeoJson(text: string | null | undefined): LatLng[][] {
  if (!text?.trim()) return [];
  let geo: unknown;
  try {
    geo = JSON.parse(text);
  } catch {
    return [];
  }
  const lines: LatLng[][] = [];
  const toLine = (coords: unknown): LatLng[] =>
    Array.isArray(coords)
      ? coords
          .filter((c): c is number[] => Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number")
          .map((c) => [c[1], c[0]] as LatLng) // GeoJSON is [lng, lat]
      : [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; coordinates?: unknown; geometry?: unknown; features?: unknown[]; geometries?: unknown[] };
    // Editors can publish any JSON with a `type`, so check shapes before iterating.
    if (n.type === "FeatureCollection") (Array.isArray(n.features) ? n.features : []).forEach(visit);
    else if (n.type === "Feature") visit(n.geometry);
    else if (n.type === "GeometryCollection") (Array.isArray(n.geometries) ? n.geometries : []).forEach(visit);
    else if (n.type === "LineString") lines.push(toLine(n.coordinates));
    else if (n.type === "MultiLineString" && Array.isArray(n.coordinates)) n.coordinates.forEach((c) => lines.push(toLine(c)));
  };
  visit(geo);
  return lines.filter((l) => l.length >= 2);
}

export type LegProgress = "planned" | "underway" | "completed";

export function legProgress(leg: Pick<Leg, "actualStart" | "actualEnd">): LegProgress {
  if (leg.actualEnd) return "completed";
  if (leg.actualStart) return "underway";
  return "planned";
}

// ── Timeline ────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const toMs = (d?: string) => {
  if (!d) return null;
  const t = Date.parse(d.length === 10 ? `${d}T00:00:00Z` : d);
  return Number.isNaN(t) ? null : t;
};

/** A bar as a percentage of the timeline: left edge and width. */
export type Bar = { left: number; width: number };

export type TimelineRow = { leg: Leg; planned: Bar | null; actual: Bar | null; progress: LegProgress };
export type TimelineMarker = { event: KeyEvent; at: number };
export type Timeline = { start: string; end: string; rows: TimelineRow[]; markers: TimelineMarker[] };

/**
 * Lay out legs (planned and actual) and key events on one shared date axis.
 * An end date counts as the whole of that day. A leg underway has its actual
 * bar run to `today` (or its planned end, whichever is later). Null if nothing has a date.
 */
export function buildTimeline(legs: Leg[], keyEvents: KeyEvent[] = [], today: Date = new Date()): Timeline | null {
  const now = today.getTime();
  const spans = legs.map((leg) => {
    const ps = toMs(leg.plannedStart);
    const pe = toMs(leg.plannedEnd) ?? ps;
    const as = toMs(leg.actualStart);
    let ae = toMs(leg.actualEnd);
    if (as !== null && ae === null) ae = Math.max(now, pe ?? as);
    return {
      leg,
      planned: ps !== null ? ([ps, (pe ?? ps) + DAY] as const) : null,
      actual: as !== null ? ([as, (ae ?? as) + DAY] as const) : null,
    };
  });
  const events = keyEvents.map((e) => ({ event: e, t: toMs(e.date) })).filter((e): e is { event: KeyEvent; t: number } => e.t !== null);

  const times = [
    ...spans.flatMap((s) => [...(s.planned ?? []), ...(s.actual ?? [])]),
    ...events.flatMap((e) => [e.t, e.t + DAY]),
  ];
  if (!times.length) return null;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const range = Math.max(max - min, DAY);
  const pct = (t: number) => Math.round(((t - min) / range) * 10000) / 100;
  const bar = (span: readonly [number, number] | null): Bar | null => (span ? { left: pct(span[0]), width: Math.max(pct(span[1]) - pct(span[0]), 0.5) } : null);

  return {
    start: new Date(min).toISOString().slice(0, 10),
    end: new Date(max - DAY).toISOString().slice(0, 10),
    rows: spans.map((s) => ({ leg: s.leg, planned: bar(s.planned), actual: bar(s.actual), progress: legProgress(s.leg) })),
    markers: events.sort((a, b) => a.t - b.t).map((e) => ({ event: e.event, at: pct(e.t + DAY / 2) })),
  };
}

export function formatNm(nm?: number): string | null {
  return typeof nm === "number" ? `${Math.round(nm).toLocaleString("en-NZ")} nm` : null;
}

export function formatDate(d?: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string | null {
  const t = toMs(d);
  return t === null ? null : new Date(t).toLocaleDateString("en-NZ", { ...opts, timeZone: "UTC" });
}

export function formatRange(start?: string, end?: string): string {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return s === e ? s : `${s} – ${e}`;
  return s ?? e ?? "Dates TBC";
}
