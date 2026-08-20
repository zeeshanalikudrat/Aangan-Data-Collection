import { Header } from "@/components/layout/Header";
import { LiveFormsGrid } from "@/components/forms/LiveFormsGrid";
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

  return (
    <div className="page">
      <Header />

      <main className="page-content">
        <div className="container">
          {/* Real-Time Live Forms Grid: Available Forms -> Draft Forms -> Closed Forms */}
          <LiveFormsGrid initialForms={forms}>
            <DraftsSection />
          </LiveFormsGrid>
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
