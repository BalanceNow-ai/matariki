import { NextRequest, NextResponse } from "next/server";
import {
  getImportsAsync,
  deleteImportAsync,
  isPostgresConfigured,
} from "../postgres-store";
import { requireAuth } from "../auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/position/imports
 * Lists every GPX upload with its point count and date range.
 */
export async function GET(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      {
        error: "Import history unavailable",
        message: "Import provenance is stored in Postgres, which is not configured",
      },
      { status: 503 }
    );
  }

  try {
    const imports = await getImportsAsync();
    return NextResponse.json({ imports, count: imports.length });
  } catch (error) {
    console.error("[Imports] Failed to list imports:", error);
    return NextResponse.json(
      { error: "Could not read import history" },
      { status: 503 }
    );
  }
}

/**
 * DELETE /api/position/imports?importId=...
 *
 * Removes the points from a single upload.
 *
 * Previously the only remedy for a bad import was clearing every GPX point at
 * once, which meant one mistaken file cost every correct one as well.
 */
export async function DELETE(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const importId = request.nextUrl.searchParams.get("importId");
  if (!importId) {
    return NextResponse.json(
      { error: "importId is required", message: "Pass ?importId= from the imports list" },
      { status: 400 }
    );
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { error: "Postgres is not configured" },
      { status: 503 }
    );
  }

  try {
    const imports = await getImportsAsync();
    const target = imports.find((i) => i.importId === importId);

    if (!target) {
      return NextResponse.json(
        { error: "Unknown importId", message: `No stored points carry importId "${importId}"` },
        { status: 404 }
      );
    }

    const { deleted } = await deleteImportAsync(importId);

    return NextResponse.json({
      success: true,
      importId,
      deleted,
      message: `Removed ${deleted} points from import ${importId}`,
    });
  } catch (error) {
    console.error("[Imports] Failed to delete import:", error);
    return NextResponse.json(
      { error: "Could not remove the import", details: String(error) },
      { status: 500 }
    );
  }
}
