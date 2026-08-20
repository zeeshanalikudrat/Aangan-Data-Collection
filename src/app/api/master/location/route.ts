/**
 * GET /api/master/location
 * Fetches master locations from Location-List sheet via GAS in real-time
 */

import { NextResponse } from "next/server";
import { fetchLocationListFromGAS } from "@/lib/gas-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const result = await fetchLocationListFromGAS();

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to fetch locations" }, { status: 500 });
    }

    return NextResponse.json(
      { locations: result.data ?? [] },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[/api/master/location] Error:", error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}
