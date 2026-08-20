"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminNav } from "@/components/layout/AdminNav";
import type { FormConfig } from "@/types";
import { DataTable } from "@/components/admin/DataTable";

export default function AdminDataPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      router.replace("/admin");
      return;
    }
    setAuthed(true);

    fetch("/api/forms?all=true")
      .then((r) => r.json())
      .then((data) => setForms(data.forms ?? []))
      .catch(() => setForms([]))
      .finally(() => setLoading(false));
  }, [router]);

  if (!authed) return null;

  return (
    <div className="page">
      <AdminNav />
      <main className="page-content">
        <div className="container container--wide">
          <div className="section-header">
            <div>
              <h1 className="section-title">Data</h1>
              <p className="section-description">View and export submitted form data.</p>
            </div>
          </div>

          <div className="divider" />

          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <span className="loading-spinner" style={{ width: "24px", height: "24px" }} />
            </div>
          ) : (
            <DataTable forms={forms} />
          )}
        </div>
      </main>
    </div>
  );
}
