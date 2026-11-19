import type { ApplicationInput } from "@/lib/crew/schema";

export function validApplication(overrides: Partial<ApplicationInput> = {}): ApplicationInput {
  return {
    fullName: "Aroha Smith",
    email: "aroha@example.com",
    phone: "",
    homeBase: "Auckland",
    nationality: ["New Zealand"],
    totalMiles: "6000",
    offshoreMiles: "2500",
    longestPassage: "Opua to Tonga, 9 days on a Hallberg-Rassy 46 as watch leader",
    nightWatches: "10-50",
    largestBoatFt: "",
    roles: ["crew", "watch leader"],
    qualifications: ["Yachtmaster Offshore", "Sea Survival"],
    otherQualifications: "",
    skills: ["diesel", "cooking"],
    passages: ["passage-tonga"],
    availabilityNotes: "",
    seasickness: "mild",
    swimmer: true,
    safetyNotes: "",
    dietary: "",
    catAllergy: false,
    motivation: "I want to do more offshore miles on a well-run boat and learn from an experienced skipper.",
    referees: [],
    consentPrivacy: true,
    consentAiInterview: true,
    ...overrides,
  };
}

/** A minimal valid DOCX: just enough zip structure for the content-types check. */
export async function makeDocx(): Promise<Uint8Array> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
  );
  zip.file("word/document.xml", "<w:document/>");
  return zip.generateAsync({ type: "uint8array" });
}
