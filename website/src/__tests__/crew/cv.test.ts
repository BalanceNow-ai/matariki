import { describe, it, expect } from "vitest";
import { detectCvKind, isAllowedCvPathname, isDocxZip, normaliseCvText, sniffMagic, CV_TEXT_LIMIT } from "@/lib/crew/cv";
import { makeDocx } from "./fixtures";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("magic-byte check", () => {
  it("recognises a PDF header", async () => {
    const pdf = bytes("%PDF-1.7\n...");
    expect(sniffMagic(pdf)).toBe("pdf");
    expect(await detectCvKind(pdf)).toBe("pdf");
  });

  it("recognises a real DOCX", async () => {
    const docx = await makeDocx();
    expect(sniffMagic(docx)).toBe("zip");
    expect(await isDocxZip(docx)).toBe(true);
    expect(await detectCvKind(docx)).toBe("docx");
  });

  it("rejects a zip that is not a Word document", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types/>");
    zip.file("evil.exe", "MZ");
    const buf = await zip.generateAsync({ type: "uint8array" });
    expect(await detectCvKind(buf)).toBeNull();
  });

  it("rejects bytes that merely claim to be a PDF by name", async () => {
    expect(await detectCvKind(bytes("<html><script>alert(1)</script>"))).toBeNull();
    expect(await detectCvKind(bytes("MZ\x90\x00"))).toBeNull();
    expect(await detectCvKind(new Uint8Array())).toBeNull();
  });

  it("rejects a PK header with corrupt contents", async () => {
    expect(await detectCvKind(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))).toBeNull();
  });

  it("rejects files over 5 MB", async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(bytes("%PDF"));
    expect(await detectCvKind(big)).toBeNull();
  });
});

describe("normaliseCvText", () => {
  it("caps at 20,000 characters and strips control characters", () => {
    const out = normaliseCvText("a\u0000b".repeat(15_000));
    expect(out.length).toBe(CV_TEXT_LIMIT);
    expect(out).not.toContain("\u0000");
  });
});

describe("CV pathnames", () => {
  it("must sit under the application's own prefix", () => {
    expect(isAllowedCvPathname("crew-cv/app1/cv-abc.pdf", "app1")).toBe(true);
    expect(isAllowedCvPathname("crew-cv/app2/cv.pdf", "app1")).toBe(false);
    expect(isAllowedCvPathname("crew-cv/app1/../app2/cv.pdf", "app1")).toBe(false);
    expect(isAllowedCvPathname("other/cv.pdf", "app1")).toBe(false);
  });
});
