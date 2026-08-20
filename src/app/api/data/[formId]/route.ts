/**
 * GET /api/data/[formId] — Returns submitted data for a form (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getFormById } from "@/lib/forms-registry";
import { fetchFormData } from "@/lib/gas-service";

interface Params {
  params: Promise<{ formId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { formId } = await params;

  // Basic admin check via header (set by client after login)
  const adminToken = req.headers.get("x-admin-token");
  if (!adminToken || adminToken !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = getFormById(formId);
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  try {
    const result = await fetchFormData({
      formId,
      sheetId: form.config.sheetId ?? "",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ rows: result.data ?? [], total: result.data?.length ?? 0 });
  } catch (error) {
    console.error(`[/api/data/${formId}] GET error:`, error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
