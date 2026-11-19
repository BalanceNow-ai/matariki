import { describe, it, expect } from "vitest";
import { passage, LEG_KINDS } from "../../../sanity/schemas/passage";
import { voyage, validateRouteGeoJson } from "../../../sanity/schemas/voyage";
import { logEntry } from "../../../sanity/schemas/logEntry";
import { schemaTypes } from "../../../sanity/schemas";
import { waypointMember } from "../../../sanity/schemas/shared/fields";
import { legForVoyageTemplate, LEGS_OF_VOYAGE_FILTER } from "../../../sanity/structure/siteStructure";

type Field = { name: string; type: string; to?: { type: string }[]; of?: unknown[]; options?: Record<string, unknown>; validation?: unknown; description?: string; hidden?: unknown; readOnly?: unknown };
const fieldsOf = (t: { fields?: unknown[] }) => (t.fields ?? []) as Field[];
const field = (t: { fields?: unknown[] }, name: string) => {
  const f = fieldsOf(t).find((x) => x.name === name);
  if (!f) throw new Error(`missing field ${name}`);
  return f;
};

/** Run a field's validation builder and report whether it marks the field required. */
function isRequired(f: Field): boolean {
  if (typeof f.validation !== "function") return false;
  let required = false;
  const rule: Record<string, (...a: unknown[]) => unknown> = new Proxy({}, {
    get: (_t, prop) => (...args: unknown[]) => {
      void args;
      if (prop === "required") required = true;
      return rule;
    },
  });
  (f.validation as (r: unknown) => unknown)(rule);
  return required;
}

describe("passage (voyage leg) schema", () => {
  it("is still the `passage` type, registered once, not renamed", () => {
    expect(passage.name).toBe("passage");
    expect(schemaTypes.filter((t) => t.name === "passage")).toHaveLength(1);
    expect(schemaTypes.some((t) => /leg/i.test(t.name))).toBe(false);
  });

  it("references its voyage (required)", () => {
    const f = field(passage, "voyage");
    expect(f.type).toBe("reference");
    expect(f.to).toEqual([{ type: "voyage" }]);
    expect(isRequired(f)).toBe(true);
  });

  it("has the leg fields", () => {
    expect(field(passage, "order").type).toBe("number");
    expect(field(passage, "fromPlace").type).toBe("string");
    expect(field(passage, "toPlace").type).toBe("string");
    expect(field(passage, "fromPoint").type).toBe("geopoint");
    expect(field(passage, "toPoint").type).toBe("geopoint");
    for (const name of ["plannedStart", "plannedEnd", "actualStart", "actualEnd"]) expect(field(passage, name).type).toBe("date");
    expect(isRequired(field(passage, "plannedStart"))).toBe(true);
    expect(field(passage, "plannedDistanceNm").type).toBe("number");
    expect(field(passage, "actualDistanceNm").type).toBe("number");
    expect(field(passage, "gallery").type).toBe("array");
  });

  it("offers exactly the three leg kinds", () => {
    expect(LEG_KINDS.map((k) => k.value)).toEqual(["oceanPassage", "cruisingGround", "portStay"]);
    expect((field(passage, "kind").options as { list: unknown }).list).toEqual(LEG_KINDS);
  });

  it("uses the same waypoint shape as voyage.waypoints", () => {
    expect(field(passage, "waypoints").of).toEqual([waypointMember]);
    expect(field(voyage, "waypoints").of).toEqual([waypointMember]);
    expect(field(passage, "gallery").of).toEqual(field(voyage, "gallery").of);
  });

  it("keeps crewPlaces, status and minExperience", () => {
    expect(field(passage, "crewPlaces").type).toBe("number");
    expect((field(passage, "status").options as { list: string[] }).list).toEqual(["open", "full", "closed"]);
    expect(field(passage, "minExperience").type).toBe("text");
  });

  it("keeps the pre-migration startDate/endDate read-only and hidden once empty", () => {
    for (const name of ["startDate", "endDate"]) {
      const f = field(passage, name);
      expect(f.readOnly).toBe(true);
      expect(typeof f.hidden).toBe("function");
      expect((f.hidden as (c: { value?: string }) => boolean)({ value: undefined })).toBe(true);
      expect((f.hidden as (c: { value?: string }) => boolean)({ value: "2026-01-01" })).toBe(false);
      expect(isRequired(f)).toBe(false);
    }
  });
});

describe("voyage schema", () => {
  it("has an ordered array of references to legs, limited to this voyage's legs", () => {
    const legs = field(voyage, "legs");
    expect(legs.type).toBe("array");
    const member = legs.of![0] as { type: string; to: { type: string }[]; options: { filter: (c: { document: { _id: string } }) => { filter: string; params: Record<string, string> } } };
    expect(member.type).toBe("reference");
    expect(member.to).toEqual([{ type: "passage" }]);
    expect(member.options.filter({ document: { _id: "drafts.v1" } })).toEqual({ filter: "voyage._ref == $voyageId", params: { voyageId: "v1" } });
  });

  it("has keyEvents with name, date, place and an optional url", () => {
    const member = field(voyage, "keyEvents").of![0] as { fields: Field[] };
    expect(member.fields.map((f) => [f.name, f.type])).toEqual([
      ["name", "string"],
      ["date", "date"],
      ["place", "string"],
      ["url", "url"],
    ]);
    expect(isRequired(member.fields[3])).toBe(false);
  });

  it("has a summary (string, max 200) and an optional routeGeoJson", () => {
    expect(field(voyage, "summary").type).toBe("string");
    expect(String(field(voyage, "summary").validation)).toContain("200");
    expect(field(voyage, "routeGeoJson").type).toBe("text");
    expect(validateRouteGeoJson(undefined)).toBe(true);
    expect(validateRouteGeoJson('{"type":"LineString","coordinates":[]}')).toBe(true);
    expect(validateRouteGeoJson("{oops")).toBe("Not valid JSON");
    expect(validateRouteGeoJson("[1,2]")).toBe("Must be a GeoJSON object");
  });

  it("keeps the existing fields and marks waypoints deprecated", () => {
    for (const name of ["title", "slug", "description", "startDate", "endDate", "status", "heroImage", "gallery", "waypoints"]) field(voyage, name);
    expect(field(voyage, "waypoints").description).toMatch(/deprecated/i);
  });
});

describe("logEntry → leg reverse reference", () => {
  it("adds an optional leg reference, limited to legs of the entry's voyage", () => {
    const f = field(logEntry, "leg") as Field & { options: { filter: (c: { document: Record<string, unknown> }) => unknown } };
    expect(f.type).toBe("reference");
    expect(f.to).toEqual([{ type: "passage" }]);
    expect(isRequired(f)).toBe(false);
    expect(f.options.filter({ document: { voyage: { _ref: "v1" } } })).toEqual({ filter: "voyage._ref == $voyageId", params: { voyageId: "v1" } });
    expect(f.options.filter({ document: {} })).toEqual({});
  });
});

describe("Studio: legs under each voyage", () => {
  it("lists a voyage's legs by reference and pre-links new ones", () => {
    expect(LEGS_OF_VOYAGE_FILTER).toBe('_type == "passage" && voyage._ref == $voyageId');
    expect(legForVoyageTemplate.schemaType).toBe("passage");
    expect((legForVoyageTemplate.value as (p: { voyageId: string }) => unknown)({ voyageId: "v1" })).toEqual({
      voyage: { _type: "reference", _ref: "v1" },
    });
  });
});
