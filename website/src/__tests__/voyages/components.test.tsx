import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoyageTimeline } from "@/components/voyages/VoyageTimeline";
import { LegCard } from "@/components/voyages/LegCard";
import type { Leg } from "@/lib/voyages/legs";

const legs: Leg[] = [
  { _id: "l1", title: "Opua to Tonga", slug: "opua-tonga", kind: "oceanPassage", fromPlace: "Opua", toPlace: "Nuku'alofa", plannedStart: "2027-05-01", plannedEnd: "2027-05-10", actualStart: "2027-05-02", actualEnd: "2027-05-11", plannedDistanceNm: 1100, actualDistanceNm: 1180.4, status: "open", crewPlaces: 2 },
  { _id: "l2", title: "Vava'u", slug: "vavau", kind: "cruisingGround", plannedStart: "2027-05-12", plannedEnd: "2027-06-01", status: "closed" },
];

describe("VoyageTimeline", () => {
  it("shows each leg in order with planned and actual bars, linking to the leg page", () => {
    render(<VoyageTimeline legs={legs} keyEvents={[{ _key: "e", name: "Vava'u Regatta", date: "2027-05-20", place: "Neiafu", url: "https://example.com" }]} voyageSlug="pacific-2027" />);
    expect(screen.getByRole("link", { name: "1. Opua to Tonga" }).getAttribute("href")).toBe("/voyages/pacific-2027/opua-tonga");
    expect(screen.getByRole("link", { name: "2. Vava'u" })).toBeTruthy();
    expect(screen.getByTitle(/Planned: 1 May 2027 – 10 May 2027/)).toBeTruthy();
    expect(screen.getByTitle(/Actual: 2 May 2027 – 11 May 2027/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Vava'u Regatta" }).getAttribute("href")).toBe("https://example.com");
    expect(screen.getByText("20 May 2027 · Neiafu")).toBeTruthy();
    expect(screen.getByText("Sailed")).toBeTruthy();
    // Event guides share the bars' horizontal bounds (after the label column on desktop).
    const guides = screen.getByTestId("timeline-guides");
    expect(guides.className).toContain("md:left-[15rem]");
    expect(guides.children).toHaveLength(1);
    expect(screen.getByText("Planned", { selector: "span.text-xs.text-storm-grey" })).toBeTruthy();
  });

  it("renders nothing when no leg has dates", () => {
    const { container } = render(<VoyageTimeline legs={[{ _id: "x", title: "TBC" }]} voyageSlug="v" />);
    expect(container.innerHTML).toBe("");
  });
});

describe("LegCard", () => {
  it("shows kind, route, planned and sailed dates and distance, linked to the leg", () => {
    render(<LegCard leg={legs[0]} index={0} voyageSlug="pacific-2027" showCrew={false} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/voyages/pacific-2027/opua-tonga");
    expect(screen.getByText("Leg 1 · Ocean passage")).toBeTruthy();
    expect(screen.getByText("Opua → Nuku'alofa")).toBeTruthy();
    expect(screen.getByText("1,180 nm")).toBeTruthy(); // actual distance preferred
    expect(screen.queryByText("Crew wanted")).toBeNull(); // crew pages not public
  });

  it("flags crew wanted only when public and the leg is open with places", () => {
    const { rerender } = render(<LegCard leg={legs[0]} index={0} voyageSlug="v" showCrew />);
    expect(screen.getByText("Crew wanted")).toBeTruthy();
    rerender(<LegCard leg={{ ...legs[0], crewPlaces: 0 }} index={0} voyageSlug="v" showCrew />);
    expect(screen.queryByText("Crew wanted")).toBeNull();
    rerender(<LegCard leg={legs[1]} index={1} voyageSlug="v" showCrew />);
    expect(screen.queryByText("Crew wanted")).toBeNull();
  });
});
