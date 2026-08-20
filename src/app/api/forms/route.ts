/**
 * GET /api/forms — Returns the live list of forms with Google Sheet Forms-Details metadata.
 *
 * Query params:
 *   ?all=true — Include disabled forms (for admin use)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllFormsLive } from "@/lib/forms-registry";
import type { FormsListResponse } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeDisabled = searchParams.get("all") === "true";

    const forms = await getAllFormsLive(includeDisabled);
    const response: FormsListResponse = { forms };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("[/api/forms] Error loading live forms:", error);
    return NextResponse.json(
      { error: "Failed to load forms" },
      { status: 500 }
    );
  }
}
