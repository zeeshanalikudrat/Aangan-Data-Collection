/**
 * GET /api/forms — Returns the list of forms from the form registry.
 *
 * Query params:
 *   ?all=true — Include disabled forms (for admin use)
 *
 * This is the endpoint the frontend uses to discover available forms.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllForms } from "@/lib/forms-registry";
import type { FormsListResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeDisabled = searchParams.get("all") === "true";

    const forms = getAllForms(includeDisabled);
    const response: FormsListResponse = { forms };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[/api/forms] Error loading forms:", error);
    return NextResponse.json(
      { error: "Failed to load forms" },
      { status: 500 }
    );
  }
}
