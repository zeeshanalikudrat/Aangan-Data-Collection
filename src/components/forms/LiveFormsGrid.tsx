"use client";

import { useState, useEffect, ReactNode } from "react";
import { FormCard } from "./FormCard";
import type { FormConfig } from "@/types";

interface LiveFormsGridProps {
  initialForms: FormConfig[];
  children?: ReactNode;
}

export function LiveFormsGrid({ initialForms, children }: LiveFormsGridProps) {
  const [forms, setForms] = useState<FormConfig[]>(initialForms);

  // Sync state whenever initialForms changes
  useEffect(() => {
    setForms(initialForms);
  }, [initialForms]);

  // Real-time live background sync with Google Sheet on window focus / interval
  useEffect(() => {
    function fetchFreshForms() {
      fetch("/api/forms")
        .then((res) => res.json())
        .then((data) => {
          if (data.forms && Array.isArray(data.forms)) {
            setForms(data.forms);
          }
        })
        .catch(() => {
          // Graceful fallback
        });
    }

    window.addEventListener("focus", fetchFreshForms);
    const interval = setInterval(fetchFreshForms, 6000);

    return () => {
      window.removeEventListener("focus", fetchFreshForms);
      clearInterval(interval);
    };
  }, []);

  const activeForms = forms.filter(
    (f) => f.status === "Active" || (f.enabled && f.status !== "Closed" && f.status !== "Inactive")
  );

  const closedForms = forms.filter((f) => f.status === "Closed");

  return (
    <>
      {/* 1. Available Forms Section */}
      <section className="forms-section" aria-labelledby="available-forms-heading">
        <h2 id="available-forms-heading" className="forms-section__title">
          Available Forms
        </h2>

        {activeForms.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__text">No active forms are currently available.</p>
          </div>
        ) : (
          <div className="form-grid">
            {activeForms.map((form) => (
              <FormCard key={form.id} form={form} isClosed={false} />
            ))}
          </div>
        )}
      </section>

      {/* 2. Draft Forms Section */}
      {children}

      {/* 3. Closed Forms Section */}
      {closedForms.length > 0 && (
        <section className="forms-section forms-section--closed mt-8" aria-labelledby="closed-forms-heading">
          <h2 id="closed-forms-heading" className="forms-section__title">
            Closed Forms
          </h2>
          <div className="form-grid">
            {closedForms.map((form) => (
              <FormCard key={form.id} form={form} isClosed={true} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
