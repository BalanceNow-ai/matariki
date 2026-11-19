import { describe, it, expect } from "vitest";
import {
  aboutSchema,
  applicationSchema,
  createApplicationBodySchema,
  experienceSchema,
  logisticsSchema,
  toStoredApplicant,
} from "@/lib/crew/schema";
import { validApplication } from "./fixtures";

describe("applicationSchema", () => {
  it("accepts a complete application and coerces numbers", () => {
    const parsed = applicationSchema.parse(validApplication());
    expect(parsed.totalMiles).toBe(6000);
    expect(parsed.offshoreMiles).toBe(2500);
    expect(parsed.phone).toBeUndefined();
    expect(parsed.largestBoatFt).toBeUndefined();
  });

  it("treats blank miles as missing, not zero", () => {
    const r = applicationSchema.safeParse(validApplication({ totalMiles: "" }));
    expect(r.success).toBe(false);
  });

  it("rejects offshore miles above total miles", () => {
    const r = applicationSchema.safeParse(validApplication({ totalMiles: "100", offshoreMiles: "200" }));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["offshoreMiles"]);
  });

  it("enforces motivation length 50–1000", () => {
    expect(applicationSchema.safeParse(validApplication({ motivation: "too short" })).success).toBe(false);
    expect(applicationSchema.safeParse(validApplication({ motivation: "x".repeat(1001) })).success).toBe(false);
    expect(applicationSchema.safeParse(validApplication({ motivation: "x".repeat(50) })).success).toBe(true);
  });

  it("requires both consents", () => {
    expect(applicationSchema.safeParse(validApplication({ consentPrivacy: false as unknown as true })).success).toBe(false);
    expect(applicationSchema.safeParse(validApplication({ consentAiInterview: false as unknown as true })).success).toBe(false);
  });

  it("allows at most three referees", () => {
    const ref = { name: "Bob", contact: "bob@example.com" };
    expect(applicationSchema.safeParse(validApplication({ referees: [ref, ref, ref] })).success).toBe(true);
    expect(applicationSchema.safeParse(validApplication({ referees: [ref, ref, ref, ref] })).success).toBe(false);
  });

  it("rejects unknown enum values", () => {
    expect(applicationSchema.safeParse(validApplication({ nightWatches: "lots" as never })).success).toBe(false);
    expect(applicationSchema.safeParse(validApplication({ roles: ["captain" as never] })).success).toBe(false);
  });

  it("strips fields that are not part of the form", () => {
    const parsed = applicationSchema.parse({ ...validApplication(), passportNumber: "X123", religion: "n/a" });
    expect(parsed).not.toHaveProperty("passportNumber");
    expect(parsed).not.toHaveProperty("religion");
  });

  it("keeps consent flags out of the stored applicant", () => {
    const stored = toStoredApplicant(applicationSchema.parse(validApplication()));
    expect(stored).not.toHaveProperty("consentPrivacy");
    expect(stored).not.toHaveProperty("consentAiInterview");
  });

  it("does not collect protected or medical categories", () => {
    const keys = Object.keys(applicationSchema.shape);
    for (const forbidden of ["passport", "medical", "emergency", "birth", "religion", "ethnic", "sexual", "politic", "relationship", "gender"]) {
      expect(keys.some((k) => k.toLowerCase().includes(forbidden)), forbidden).toBe(false);
    }
    for (const exact of ["age", "dob"]) expect(keys).not.toContain(exact);
  });
});

describe("step schemas", () => {
  it("validate their own step independently", () => {
    const app = validApplication();
    expect(aboutSchema.safeParse(app).success).toBe(true);
    expect(experienceSchema.safeParse(app).success).toBe(true);
    expect(logisticsSchema.safeParse(app).success).toBe(true);
    expect(aboutSchema.safeParse({ ...app, email: "nope" }).success).toBe(false);
  });
});

describe("createApplicationBodySchema", () => {
  it("requires a Turnstile token", () => {
    expect(createApplicationBodySchema.safeParse({ application: validApplication() }).success).toBe(false);
    expect(createApplicationBodySchema.safeParse({ turnstileToken: "t", application: validApplication() }).success).toBe(true);
  });
});

describe("privacyContact", () => {
  it("falls back to a placeholder, and links emails and URLs", async () => {
    const { privacyContact } = await import("@/lib/crew/pageContent");
    delete process.env.CREW_PRIVACY_CONTACT;
    expect(privacyContact().text).toMatch(/\[PLACEHOLDER\]/);
    process.env.CREW_PRIVACY_CONTACT = "privacy@example.com";
    expect(privacyContact()).toEqual({ text: "privacy@example.com", href: "mailto:privacy@example.com" });
    process.env.CREW_PRIVACY_CONTACT = "https://example.com/privacy";
    expect(privacyContact().href).toBe("https://example.com/privacy");
    delete process.env.CREW_PRIVACY_CONTACT;
  });
});
