"use client";

import { useState, useEffect } from "react";
import { getAllDrafts, deleteDraft, type FormDraft } from "@/lib/drafts";

export function DraftsSection() {
  const [drafts, setDrafts] = useState<FormDraft[]>([]);
  const [mounted, setMounted] = useState(false);

  function loadDrafts() {
    setDrafts(getAllDrafts());
  }

  useEffect(() => {
    setMounted(true);
    loadDrafts();

    window.addEventListener("aangan_drafts_updated", loadDrafts);
    window.addEventListener("storage", loadDrafts);

    return () => {
      window.removeEventListener("aangan_drafts_updated", loadDrafts);
      window.removeEventListener("storage", loadDrafts);
    };
  }, []);

  if (!mounted || drafts.length === 0) {
    return null;
  }

  function formatDate(isoString: string) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  }

  function handleDeleteDraft(e: React.MouseEvent, draftId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Discard this draft?")) {
      deleteDraft(draftId);
      loadDrafts();
    }
  }

  return (
    <section className="forms-section forms-section--drafts" aria-labelledby="draft-forms-heading">
      <h2 id="draft-forms-heading" className="forms-section__title">
        Draft Forms
      </h2>

      <div className="form-grid">
        {drafts.map((draft) => {
          const filledFieldsCount = draft.data ? Object.keys(draft.data).length : 0;

          return (
            <a
              key={draft.id}
              href={`/forms/${draft.formId}?draftId=${draft.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="form-card form-card--draft"
              title={`Continue Draft: ${draft.name} (Opens in new tab)`}
            >
              {/* Left Content Area */}
              <div className="form-card__content">
                <div className="form-card__header-row">
                  <span className="form-card__title">{draft.name}</span>
                </div>

                <div className="form-card__meta-row">
                  <span className="form-card__id">{draft.formId}</span>

                  {/* Filled Status Indicator Icon */}
                  {filledFieldsCount > 0 && (
                    <span className="draft-status-indicator" title="In-Progress Draft">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      <span>In-progress</span>
                    </span>
                  )}

                  <span className="draft-date-text">Saved: {formatDate(draft.updatedAt)}</span>
                </div>
              </div>

              {/* Right Area: Draft Badge vertically centered + Actions */}
              <div className="form-card__draft-right">
                <span className="badge badge--draft">Draft</span>

                <button
                  type="button"
                  className="btn-discard-draft"
                  onClick={(e) => handleDeleteDraft(e, draft.id)}
                  title="Discard draft"
                  aria-label="Discard draft"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>

                <span className="form-card__chevron" aria-hidden="true">→</span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
