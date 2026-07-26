import { redirect } from "next/navigation";

/**
 * The GPX tooling now lives at /admin/import, which previews a file before
 * committing it, asks for a time window when the file carries none, and can
 * undo a single import.
 *
 * Redirecting rather than maintaining a second uploader: this page and the
 * import endpoint had already drifted into two different GPX parsers with
 * different behaviour for the same file.
 */
export default function GpxDiagnosticPage() {
  redirect("/admin/import");
}
