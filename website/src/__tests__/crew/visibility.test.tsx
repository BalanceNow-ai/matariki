import { describe, it, expect, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { crewPagePublic, crewRobots } from "@/lib/crew/visibility";
import { ApplyToCrewCta } from "@/components/crew/ApplyToCrewCta";
import { CrewBrief } from "@/app/crew-info/crew-brief/CrewBrief";
import CrewBriefPage from "@/app/crew-info/crew-brief/page";
import { generateMetadata as crewMetadata } from "@/app/crew/page";
import { generateMetadata as applyMetadata } from "@/app/crew/apply/page";

afterEach(() => {
  delete process.env.CREW_PAGE_PUBLIC;
});

describe("CREW_PAGE_PUBLIC", () => {
  it("defaults to hidden", () => {
    expect(crewPagePublic()).toBe(false);
    process.env.CREW_PAGE_PUBLIC = "false";
    expect(crewPagePublic()).toBe(false);
    process.env.CREW_PAGE_PUBLIC = "TRUE";
    expect(crewPagePublic()).toBe(true);
  });

  it("hidden: /crew and /crew/apply are noindex, nofollow", () => {
    expect(crewMetadata().robots).toEqual({ index: false, follow: false });
    expect(applyMetadata().robots).toEqual({ index: false, follow: false });
    expect(crewRobots()).toEqual({ index: false, follow: false });
  });

  it("public: /crew is indexable and /crew/apply keeps its existing noindex", () => {
    process.env.CREW_PAGE_PUBLIC = "true";
    expect(crewMetadata().robots).toBeUndefined();
    expect(applyMetadata().robots).toEqual({ index: false });
  });

  it("hides the /crew-info call to action and crew brief link until public", () => {
    const hidden = render(<ApplyToCrewCta />);
    expect(hidden.container.innerHTML).toBe("");
    hidden.unmount();
    const brief = render(CrewBriefPage());
    expect(brief.queryByText("Apply to crew")).toBeNull();
    brief.unmount();

    process.env.CREW_PAGE_PUBLIC = "true";
    const shown = render(<ApplyToCrewCta />);
    expect(shown.getByText("Apply to crew").closest("a")?.getAttribute("href")).toBe("/crew");
    shown.unmount();
    const briefShown = render(<CrewBrief showApplyLink />);
    expect(briefShown.getByText("Apply to crew").closest("a")?.getAttribute("href")).toBe("/crew");
  });
});
