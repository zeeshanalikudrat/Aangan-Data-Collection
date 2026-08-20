/**
 * POST /api/admin/login — Validates admin email & password
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email || "";
    const password = body.password || "";

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const valid = verifyAdminCredentials(email, password);

    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/admin/login] Error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
