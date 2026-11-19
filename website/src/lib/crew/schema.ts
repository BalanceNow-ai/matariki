/**
 * The crew application form, shared by the browser wizard and the server.
 *
 * Deliberately absent: passport numbers, medical history, emergency contacts,
 * age, religion, ethnicity, relationships, sexuality and politics. Do not add
 * them. `safetyNotes` is free text for things like "I can't swim far" — the
 * form tells applicants no medical detail is needed at this stage.
 */
import { z } from "zod";

export const NIGHT_WATCHES = ["0", "1-10", "10-50", "50+"] as const;
export const ROLES = ["crew", "helm", "watch leader", "mate", "skipper"] as const;
export const QUALIFICATIONS = [
  "Day Skipper",
  "Coastal Skipper",
  "Yachtmaster Offshore",
  "Yachtmaster Ocean",
  "Sea Survival",
  "First Aid",
  "Marine radio licence",
  "Dive cert",
] as const;
export const SKILLS = [
  "cooking",
  "diesel",
  "electrics",
  "rigging",
  "sail repair",
  "freediving",
  "spearfishing",
  "fishing",
  "photography",
  "writing",
] as const;
export const SEASICKNESS = ["never", "mild", "sometimes", "often"] as const;

export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const CV_MIME_TYPES = ["application/pdf", DOCX_MIME] as const;

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : undefined));

// An empty input must be "missing", not coerced to 0.
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const miles = z.preprocess(
  blankToUndefined,
  z.coerce
    .number({ error: "Enter a number of miles" })
    .int("Whole miles, please")
    .min(0, "Can't be negative")
    .max(1_000_000, "That seems a lot of miles")
);

export const refereeSchema = z.object({
  name: trimmed(120).min(1, "Name required"),
  contact: trimmed(200).min(3, "Email or phone required"),
  boat: optionalText(120),
  year: optionalText(20),
});

export const aboutSchema = z.object({
  fullName: trimmed(120).min(2, "Please enter your name"),
  email: z.email("Enter a valid email").max(254),
  phone: optionalText(40),
  homeBase: trimmed(120).min(2, "Where are you based?"),
  nationality: z
    .array(trimmed(60).min(1))
    .min(1, "Pick at least one")
    .max(4, "Four at most"),
});

const experienceShape = {
    totalMiles: miles,
    offshoreMiles: miles,
    longestPassage: trimmed(300).min(2, "Tell us about your longest passage"),
    nightWatches: z.enum(NIGHT_WATCHES, { error: "Choose one" }),
    largestBoatFt: z.preprocess(
      blankToUndefined,
      z.coerce.number().int("Whole feet, please").min(10, "At least 10 ft").max(400).optional()
    ),
    roles: z.array(z.enum(ROLES)).min(1, "Pick at least one role"),
    qualifications: z.array(z.enum(QUALIFICATIONS)).default([]),
    otherQualifications: optionalText(300),
    skills: z.array(z.enum(SKILLS)).default([]),
};

export const experienceSchema = z
  .object(experienceShape)
  .refine((v) => v.offshoreMiles <= v.totalMiles, {
    path: ["offshoreMiles"],
    message: "Offshore miles can't exceed total miles",
  });

export const logisticsSchema = z.object({
  passages: z.array(trimmed(100).min(1)).min(1, "Pick at least one passage").max(10),
  availabilityNotes: optionalText(1000),
  seasickness: z.enum(SEASICKNESS, { error: "Choose one" }),
  swimmer: z.boolean(),
  safetyNotes: optionalText(500),
  dietary: optionalText(300),
  catAllergy: z.boolean(),
  motivation: trimmed(1000)
    .min(50, "At least 50 characters, please")
    .max(1000, "1,000 characters at most"),
  referees: z.array(refereeSchema).max(3, "Three referees at most").default([]),
  consentPrivacy: z.literal(true, { error: "Required to apply" }),
  consentAiInterview: z.literal(true, { error: "Required to apply" }),
});

/** Field names per step, so the wizard can validate one step at a time. */
export const STEP_FIELDS = {
  about: Object.keys(aboutSchema.shape),
  experience: [
    "totalMiles",
    "offshoreMiles",
    "longestPassage",
    "nightWatches",
    "largestBoatFt",
    "roles",
    "qualifications",
    "otherQualifications",
    "skills",
  ],
  logistics: Object.keys(logisticsSchema.shape),
} as const;

export const applicationSchema = z
  .object({
    ...aboutSchema.shape,
    ...experienceShape,
    ...logisticsSchema.shape,
  })
  .refine((v) => v.offshoreMiles <= v.totalMiles, {
    path: ["offshoreMiles"],
    message: "Offshore miles can't exceed total miles",
  });

/** What the browser holds while filling in the form. */
export type ApplicationInput = z.input<typeof applicationSchema>;
/** What the server stores after validation. */
export type ApplicationData = z.output<typeof applicationSchema>;

/** The applicant object as persisted (consent flags live in `consent`). */
export type StoredApplicant = Omit<ApplicationData, "consentPrivacy" | "consentAiInterview">;

export function toStoredApplicant(data: ApplicationData): StoredApplicant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { consentPrivacy, consentAiInterview, ...rest } = data;
  return rest;
}

/** Body of POST /api/crew/applications. */
export const createApplicationBodySchema = z.object({
  turnstileToken: z.string().min(1).max(4096),
  application: applicationSchema,
});
