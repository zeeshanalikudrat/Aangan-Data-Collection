import { Header } from "@/components/layout/Header";
import { FormCard } from "@/components/forms/FormCard";
import { DraftsSection } from "@/components/forms/DraftsSection";
import type { FormConfig } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getForms(): Promise<FormConfig[]> {
  try {
    const { getAllFormsLive } = await import("@/lib/forms-registry");
    return await getAllFormsLive(true);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const forms = await getForms();

  const activeForms = forms.filter(
    (f) => f.status === "Active" || (f.enabled && f.status !== "Closed" && f.status !== "Inactive")
  );

  const closedForms = forms.filter(
    (f) => f.status === "Closed"
  );

  return (
    <div className="page">
      <Header />

      <main className="page-content">
        <div className="container">
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

          {/* 2. Draft Forms Section (Client Component: Device-Isolated) */}
          <DraftsSection />

          {/* 3. Closed Forms Section */}
          {closedForms.length > 0 && (
            <section className="forms-section forms-section--closed" aria-labelledby="closed-forms-heading">
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
        </div>
      </main>

      {/* Minimal Clean Footer */}
      <footer className="site-footer">
        <div className="container">
          <p className="site-footer__text">Copyright © 2026 All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
