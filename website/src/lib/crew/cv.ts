/**
 * CV file checks and text extraction.
 *
 * The browser-declared MIME type and file name are not trusted: the bytes
 * decide what the file is. Only PDF and DOCX are accepted.
 */
import JSZip from "jszip";
import { CV_MAX_BYTES, DOCX_MIME } from "./schema";

export const CV_TEXT_LIMIT = 20_000;

export type CvKind = "pdf" | "docx";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04

function startsWith(buf: Uint8Array, magic: number[]): boolean {
  return buf.length >= magic.length && magic.every((b, i) => buf[i] === b);
}

/** Fast header-only check. A zip header alone does not make a DOCX. */
export function sniffMagic(buf: Uint8Array): "pdf" | "zip" | null {
  if (startsWith(buf, PDF_MAGIC)) return "pdf";
  if (startsWith(buf, ZIP_MAGIC)) return "zip";
  return null;
}

/** Confirm a zip is a Word document by reading its [Content_Types].xml. */
export async function isDocxZip(buf: Uint8Array): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(buf);
    const types = zip.file("[Content_Types].xml");
    if (!types) return false;
    const xml = await types.async("string");
    return xml.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml");
  } catch {
    return false;
  }
}

export async function detectCvKind(buf: Uint8Array): Promise<CvKind | null> {
  if (buf.length === 0 || buf.length > CV_MAX_BYTES) return null;
  const magic = sniffMagic(buf);
  if (magic === "pdf") return "pdf";
  if (magic === "zip" && (await isDocxZip(buf))) return "docx";
  return null;
}

export function mimeFor(kind: CvKind): string {
  return kind === "pdf" ? "application/pdf" : DOCX_MIME;
}

/** Collapse whitespace and cap length; control characters are stripped. */
export function normaliseCvText(text: string, limit = CV_TEXT_LIMIT): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, limit);
}

export async function extractCvText(buf: Uint8Array, kind: CvKind): Promise<string> {
  if (kind === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf });
    try {
      const result = await parser.getText();
      return normaliseCvText(result.text);
    } finally {
      await parser.destroy();
    }
  }
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
  return normaliseCvText(result.value);
}

/** Blob pathnames are scoped per application so one applicant can't attach another's file. */
export function cvPathPrefix(applicationId: string): string {
  return `crew-cv/${applicationId}/`;
}

export function isAllowedCvPathname(pathname: string, applicationId: string): boolean {
  return (
    pathname.startsWith(cvPathPrefix(applicationId)) &&
    !pathname.includes("..") &&
    /^[\w./ -]+$/.test(pathname) &&
    pathname.length < 300
  );
}
