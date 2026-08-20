/**
 * POST /api/admin/forms/[formId]/toggle — Enable/disable a form
 * PATCH /api/admin/forms/[formId] — Update form config
 */

import { NextRequest, NextResponse } from "next/server";
import { getFormById, updateFormConfig } from "@/lib/forms-registry";

interface Params {
  params: Promise<{ formId: string }>;
}

function isAdminRequest(req: NextRequest): boolean {
  const adminToken = req.headers.get("x-admin-token");
  return adminToken === process.env.ADMIN_PASSWORD;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = await params;
  const form = getFormById(formId);

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  try {
    const updates = await req.json();
    // Prevent overriding immutable fields
    delete updates.id;
    delete updates.createdAt;

    const success = updateFormConfig(formId, updates);
    if (!success) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[/api/admin/forms/${formId}] PATCH error:`, error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
