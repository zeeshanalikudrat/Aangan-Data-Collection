/**
 * GET /api/forms/[formId] — Returns a single form's config + fields
 * POST /api/forms/[formId] — Submits form data via GAS
 */

import { NextRequest, NextResponse } from "next/server";
import { getFormById } from "@/lib/forms-registry";
import { submitFormData } from "@/lib/gas-service";
import type { GasSubmitPayload } from "@/types";

interface Params {
  params: Promise<{ formId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { formId } = await params;
  const form = getFormById(formId);

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  if (!form.config.enabled) {
    return NextResponse.json({ error: "Form is disabled" }, { status: 403 });
  }

  return NextResponse.json(form);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { formId } = await params;
  const form = getFormById(formId);

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  if (!form.config.enabled) {
    return NextResponse.json({ error: "Form is disabled" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const payload: GasSubmitPayload = {
      formId,
      formTitle: form.config.title,
      data: body,
      fields: form.fields.map((f) => ({ id: f.id, label: f.label, type: f.type })),
      sheetId: form.config.sheetId,
      submittedAt: new Date().toISOString(),
    };

    const result = await submitFormData(payload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error(`[/api/forms/${formId}] POST error:`, error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
