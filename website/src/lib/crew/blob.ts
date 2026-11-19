/**
 * Vercel Blob helpers for CVs. The store must be PRIVATE: CVs are only ever
 * read server-side or through a short-lived signed URL.
 */
import "server-only";
import { del, get, issueSignedToken, presignUrl } from "@vercel/blob";

export async function readPrivateBlob(urlOrPathname: string, maxBytes: number): Promise<Uint8Array | null> {
  const res = await get(urlOrPathname, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200) return null;
  if (res.blob.size > maxBytes) return null;
  const buf = new Uint8Array(await new Response(res.stream).arrayBuffer());
  return buf.length > maxBytes ? null : buf;
}

/** A GET URL for one blob that stops working after `ttlMs`. */
export async function signedDownloadUrl(pathname: string, ttlMs = 5 * 60 * 1000): Promise<string> {
  const validUntil = Date.now() + ttlMs;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, {
    operation: "get",
    pathname,
    access: "private",
    validUntil,
  });
  return presignedUrl;
}

export async function deleteBlob(urlOrPathname: string): Promise<void> {
  await del(urlOrPathname);
}
