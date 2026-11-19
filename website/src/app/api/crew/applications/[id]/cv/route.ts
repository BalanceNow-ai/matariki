/**
 * Attaches an uploaded CV to an application: re-reads the blob, checks the
 * bytes really are a PDF or DOCX, extracts text and stores it.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requestHasSessionFor } from "@/lib/crew/session";
import { CV_MAX_BYTES } from "@/lib/crew/schema";
import { detectCvKind, extractCvText, isAllowedCvPathname, mimeFor } from "@/lib/crew/cv";
import { attachCv, getApplication } from "@/lib/crew/store";
import { deleteBlob, readPrivateBlob } from "@/lib/crew/blob";
import { readJson } from "@/lib/crew/request";

export const runtime = "nodejs";
export const preferredRegion = "syd1";
export const maxDuration = 30;

const bodySchema = z.object({
  pathname: z.string().min(1).max(300),
  fileName: z.string().trim().min(1).max(200),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!requestHasSessionFor(request, id)) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await readJson(request, 4096));
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!isAllowedCvPathname(body.pathname, id)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const app = await getApplication(id);
  if (!app || app.status !== "draft") {
    return NextResponse.json({ error: "This application can no longer be changed" }, { status: 409 });
  }

  const bytes = await readPrivateBlob(body.pathname, CV_MAX_BYTES).catch((e) => {
    console.error("CV read failed:", e);
    return null;
  });
  if (!bytes) return NextResponse.json({ error: "Couldn't read the uploaded file" }, { status: 400 });

  const kind = await detectCvKind(bytes);
  if (!kind) {
    await deleteBlob(body.pathname).catch(() => undefined);
    return NextResponse.json({ error: "Please upload a PDF or Word (.docx) file" }, { status: 415 });
  }

  let extractedText = "";
  try {
    extractedText = await extractCvText(bytes, kind);
  } catch (error) {
    // A CV we can't read is still worth keeping for Greg; the interview just won't see it.
    console.error("CV text extraction failed:", error);
  }

  if (app.cv?.pathname && app.cv.pathname !== body.pathname) {
    await deleteBlob(app.cv.pathname).catch(() => undefined);
  }

  await attachCv(id, {
    blobUrl: body.pathname,
    pathname: body.pathname,
    fileName: body.fileName,
    mime: mimeFor(kind),
    size: bytes.length,
    extractedText,
  });

  return NextResponse.json({ ok: true, textExtracted: extractedText.length > 0 });
}
