// @vitest-environment node
/**
 * Real CV files through the same path as an upload: the browser has put the
 * file in Blob, then POST /api/crew/applications/[id]/cv reads it back,
 * checks the bytes, extracts text and stores it. Only the Blob read and the
 * Sanity store are stubbed; detection and extraction run for real.
 *
 * Fixtures come from scripts/make-crew-cv-fixtures.py (python-docx + LibreOffice).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { CvRecord } from "@/lib/crew/types";

const fixture = (name: string) => new Uint8Array(readFileSync(path.join(__dirname, "cv-fixtures", name)));

let blobBytes: Uint8Array | null = null;
vi.mock("@/lib/crew/blob", () => ({
  readPrivateBlob: vi.fn(async () => blobBytes),
  deleteBlob: vi.fn(async () => undefined),
}));

const attachCv = vi.fn<(id: string, cv: CvRecord) => Promise<void>>(async () => undefined);
vi.mock("@/lib/crew/store", () => ({
  getApplication: vi.fn(async () => ({ _id: "app1", status: "draft" })),
  attachCv: (id: string, cv: CvRecord) => attachCv(id, cv),
}));

process.env.CREW_SESSION_SECRET = "f".repeat(40);

async function upload(fileName: string) {
  const { POST } = await import("@/app/api/crew/applications/[id]/cv/route");
  const { signSession } = await import("@/lib/crew/session");
  const res = await POST(
    new Request("http://localhost/api/crew/applications/app1/cv", {
      method: "POST",
      headers: { "content-type": "application/json", "x-crew-session": signSession("app1") },
      body: JSON.stringify({ pathname: `crew-cv/app1/${fileName}`, fileName }),
    }),
    { params: Promise.resolve({ id: "app1" }) }
  );
  return { res, body: await res.json(), cv: attachCv.mock.calls.at(-1)?.[1] };
}

beforeEach(() => {
  attachCv.mockClear();
});

describe("CV upload extraction with real files", () => {
  it("extracts paragraphs and the passages table from a Word CV", async () => {
    blobBytes = fixture("sailing-cv.docx");
    const { res, body, cv } = await upload("sailing-cv.docx");
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, textExtracted: true });
    expect(cv?.mime).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(cv?.size).toBe(blobBytes.length);
    const text = cv!.extractedText;
    expect(text).toContain("Sailing CV - Test Applicant");
    expect(text).toContain("6,000 nautical miles");
    // Table cells
    for (const cell of ["Route", "Opua to Tonga", "Hallberg-Rassy 46", "Watch leader", "Auckland to Noumea", "Young 88"]) {
      expect(text).toContain(cell);
    }
    expect(text).toContain("Yachtmaster Offshore");
  });

  it("extracts text from a PDF CV", async () => {
    blobBytes = fixture("sailing-cv.pdf");
    const { res, cv } = await upload("sailing-cv.pdf");
    expect(res.status).toBe(200);
    expect(cv?.mime).toBe("application/pdf");
    expect(cv!.extractedText).toContain("Opua to Tonga");
    expect(cv!.extractedText).toContain("Yachtmaster Offshore");
    expect(cv!.extractedText).not.toMatch(/-- \d+ of \d+ --/);
  });

  it("rejects a renamed non-CV file without storing it", async () => {
    blobBytes = new TextEncoder().encode("<html>not a cv</html>");
    const { res } = await upload("cv.docx");
    expect(res.status).toBe(415);
    expect(attachCv).not.toHaveBeenCalled();
  });
});
