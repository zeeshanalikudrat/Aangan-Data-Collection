/**
 * GET /api/master/dropdown
 * Fetches dynamic dropdown options from Dropdown-List sheet via GAS in real-time
 * Query parameters: formId, fieldName
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchDropdownOptionsFromGAS } from "@/lib/gas-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get("formId") || undefined;
    const fieldName = searchParams.get("fieldName") || undefined;

    const result = await fetchDropdownOptionsFromGAS(formId, fieldName);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to fetch dropdown options" }, { status: 500 });
    }

    return NextResponse.json(
      { options: result.data ?? [] },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[/api/master/dropdown] Error:", error);
    return NextResponse.json({ error: "Failed to fetch dropdown options" }, { status: 500 });
  }
}
