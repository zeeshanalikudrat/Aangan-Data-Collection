"use client";

import { useState } from "react";
import type { FormConfig } from "@/types";

interface FormsListProps {
  forms: FormConfig[];
}

export function FormsList({ forms: initialForms }: FormsListProps) {
  const [forms, setForms] = useState<FormConfig[]>(initialForms);
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleToggle(formId: string, currentEnabled: boolean) {
    setToggling(formId);

    try {
      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "",
        },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (res.ok) {
        setForms((prev) =>
          prev.map((f) =>
            f.id === formId ? { ...f, enabled: !currentEnabled } : f
          )
        );
      }
    } finally {
      setToggling(null);
    }
  }

  if (forms.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__text">No forms configured yet.</p>
        <p className="text-sm text-muted mt-2">
          Add a new form folder to <code>backend/forms/</code> to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-forms-list">
      {forms.map((form) => (
        <div key={form.id} className="admin-form-row">
          <div>
            <div className="admin-form-row__title">{form.title}</div>
            <div className="admin-form-row__id">{form.id}</div>
          </div>

          <div className="admin-form-row__actions">
            <span className={`badge ${form.enabled ? "badge--enabled" : "badge--disabled"}`}>
              {form.enabled ? "Enabled" : "Disabled"}
            </span>

            <button
              className="btn btn--secondary btn--sm"
              onClick={() => handleToggle(form.id, form.enabled)}
              disabled={toggling === form.id}
              title={form.enabled ? "Disable form" : "Enable form"}
            >
              {toggling === form.id ? (
                <span className="loading-spinner" aria-hidden="true" />
              ) : form.enabled ? (
                "Disable"
              ) : (
                "Enable"
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
