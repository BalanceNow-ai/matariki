import { describe, it, expect } from "vitest";
import { planMigration } from "../../../scripts/migrate-voyage-legs";

describe("migrate-voyage-legs planMigration", () => {
  it("moves startDate/endDate into plannedStart/plannedEnd and unsets the old fields", () => {
    const plan = planMigration([{ _id: "p1", _rev: "r1", title: "Tonga", startDate: "2027-05-01", endDate: "2027-05-12" }], []);
    expect(plan).toEqual([
      expect.objectContaining({ id: "p1", rev: "r1", set: { plannedStart: "2027-05-01", plannedEnd: "2027-05-12" }, unset: ["startDate", "endDate"], setIfMissing: {} }),
    ]);
  });

  it("never overwrites a planned date that differs, and keeps the old one", () => {
    const [p] = planMigration([{ _id: "p1", _rev: "r", startDate: "2027-05-01", plannedStart: "2027-06-01", endDate: "2027-05-12", plannedEnd: "2027-05-12" }], []);
    expect(p.set).toEqual({});
    expect(p.unset).toEqual(["endDate"]);
    expect(p.notes[0]).toMatch(/plannedStart is already 2027-06-01/);
  });

  it("only adds an empty legs array to voyages, and only where it's missing", () => {
    const plan = planMigration([], [
      { _id: "73e86447-6ee2-4f51-8ba4-9637a1888289", _rev: "r", title: "Fiordland and Stewart Island 2026", hasLegs: false },
      { _id: "v2", _rev: "r", title: "Has legs", hasLegs: true },
    ]);
    expect(plan).toEqual([
      { id: "73e86447-6ee2-4f51-8ba4-9637a1888289", rev: "r", label: 'voyage "Fiordland and Stewart Island 2026"', set: {}, setIfMissing: { legs: [] }, unset: [], notes: [] },
    ]);
  });

  it("is a no-op when everything is migrated", () => {
    expect(planMigration([{ _id: "p", _rev: "r", plannedStart: "2027-01-01" }], [{ _id: "v", _rev: "r", hasLegs: true }])).toEqual([]);
  });
});
