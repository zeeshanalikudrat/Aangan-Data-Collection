"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormDefinition, FileAttachmentPayload, LocationMasterRow, DropdownMasterOption } from "@/types";
import { FormFieldInput } from "./FormField";
import {
  saveFormDraft,
  getDraftById,
  getLatestDraftForForm,
  deleteDraft,
  deleteDraftsByFormId,
} from "@/lib/drafts";

interface FormRendererProps {
  form: FormDefinition;
  initialLocationList?: LocationMasterRow[];
  initialDropdowns?: DropdownMasterOption[];
}

interface SubmissionResult {
  id?: string;
  timestamp?: string;
}

export function FormRenderer({
  form,
  initialLocationList = [],
  initialDropdowns = [],
}: FormRendererProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId");

  const [values, setValues] = useState<Record<string, string | string[] | FileAttachmentPayload>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [locationList, setLocationList] = useState<LocationMasterRow[]>(initialLocationList);

  // Draft state (strictly on user's current device browser)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftIdParam || null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftCustomName, setDraftCustomName] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(false);

  // If initialLocationList was empty, fetch client-side as fallback
  useEffect(() => {
    if (locationList.length === 0) {
      const hasLocationField = form.fields.some((f) => f.dynamicSource?.type === "location");
      if (hasLocationField) {
        fetch("/api/master/location")
          .then((res) => res.json())
          .then((data) => {
            if (data.locations && Array.isArray(data.locations) && data.locations.length > 0) {
              setLocationList(data.locations);
            }
          })
          .catch((err) => console.warn("[FormRenderer] Location fallback fetch failed:", err));
      }
    }
  }, [form.fields, locationList.length]);

  // Load existing draft on initial mount
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    let targetDraft = null;
    if (draftIdParam) {
      targetDraft = getDraftById(draftIdParam);
    } else {
      targetDraft = getLatestDraftForForm(form.config.id);
    }

    if (targetDraft && targetDraft.data && Object.keys(targetDraft.data).length > 0) {
      setValues(targetDraft.data as Record<string, string | string[] | FileAttachmentPayload>);
      setActiveDraftId(targetDraft.id);
      setDraftCustomName(targetDraft.name);
      showToast(`Restored draft: ${targetDraft.name}`);
    }
  }, [draftIdParam, form.config.id]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }

  // Auto-save draft locally on value change (debounced 600ms)
  const triggerAutoSave = useCallback(
    (currentValues: Record<string, unknown>) => {
      const hasEnteredData = Object.values(currentValues).some(
        (v) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
      );

      if (!hasEnteredData) return;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        const saved = saveFormDraft({
          id: activeDraftId || undefined,
          formId: form.config.id,
          formTitle: form.config.title,
          name: draftCustomName || undefined,
          data: currentValues,
        });
        if (!activeDraftId) {
          setActiveDraftId(saved.id);
        }
      }, 600);
    },
    [activeDraftId, draftCustomName, form.config.id, form.config.title]
  );

  function handleFieldChange(fieldId: string, value: string | string[] | FileAttachmentPayload) {
    setValues((prev) => {
      const next: Record<string, string | string[] | FileAttachmentPayload> = { ...prev, [fieldId]: value };

      // Cascading reset for location fields
      if (fieldId === "state") {
        delete next.district;
        delete next.block;
        delete next.school;
      } else if (fieldId === "district") {
        delete next.block;
        delete next.school;
      } else if (fieldId === "block") {
        delete next.school;
      }

      triggerAutoSave(next);
      return next;
    });

    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    for (const field of form.fields) {
      if (!field.required) continue;

      const val = values[field.id];
      if (
        val === undefined ||
        val === "" ||
        (Array.isArray(val) && val.length === 0) ||
        (typeof val === "object" && !Array.isArray(val) && !(val as FileAttachmentPayload).base64)
      ) {
        newErrors[field.id] = `${field.label} is required`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/forms/${form.config.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Submission failed");
      }

      // Immediately remove draft from device storage upon successful submission
      if (activeDraftId) {
        deleteDraft(activeDraftId);
      }
      deleteDraftsByFormId(form.config.id);
      setActiveDraftId(null);

      setSubmissionResult(data.data || {});
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed";
      setErrors({ _form: message });
    } finally {
      setSubmitting(false);
    }
  }

  // Save Draft Explicit Button Handler
  function handleOpenSaveDraftModal() {
    if (!draftCustomName) {
      setDraftCustomName(`Untitled – ${form.config.id}`);
    }
    setShowDraftModal(true);
  }

  function handleConfirmSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    const finalName = draftCustomName.trim() || `Untitled – ${form.config.id}`;

    const saved = saveFormDraft({
      id: activeDraftId || undefined,
      formId: form.config.id,
      formTitle: form.config.title,
      name: finalName,
      data: values,
    });

    setActiveDraftId(saved.id);
    setDraftCustomName(finalName);
    setShowDraftModal(false);
    showToast(`Draft saved: ${finalName}`);
  }

  // Reset Form Handler
  function handleReset() {
    if (window.confirm("Reset this form? All entered data will be cleared.")) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      setValues({});
      setErrors({});
      if (activeDraftId) {
        deleteDraft(activeDraftId);
      }
      deleteDraftsByFormId(form.config.id);
      setActiveDraftId(null);
      setDraftCustomName("");
      showToast("Form reset to initial state.");
    }
  }

  if (submitted) {
    return (
      <div className="form-success">
        <div className="form-success__icon" aria-hidden="true">✓</div>
        <h2 className="form-success__title">Response Submitted</h2>
        <p className="form-success__text">Your response has been recorded successfully.</p>
        
        {submissionResult?.id && (
          <div style={{
            marginTop: "16px",
            padding: "12px 16px",
            background: "var(--color-bg-secondary)",
            borderRadius: "var(--border-radius)",
            display: "inline-block",
            fontSize: "0.8125rem",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)"
          }}>
            <div>Reference ID: <strong style={{ color: "var(--color-text-primary)" }}>{submissionResult.id}</strong></div>
            {submissionResult.timestamp && (
              <div style={{ marginTop: "4px", fontSize: "0.75rem" }}>
                Recorded: {submissionResult.timestamp}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "24px" }}>
          <button
            className="btn btn--secondary"
            onClick={() => router.push("/")}
          >
            Back to available forms
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="draft-toast" role="status">
          {toastMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-fields">
          {form.fields.map((field) => (
            <FormFieldInput
              key={field.id}
              field={field}
              formId={form.config.id}
              value={values[field.id] ?? ""}
              allValues={values}
              locationList={locationList}
              initialDropdowns={initialDropdowns}
              onChange={(val) => handleFieldChange(field.id, val)}
              error={errors[field.id]}
            />
          ))}
        </div>

        {errors._form && (
          <div className="login-error mt-4" role="alert">
            {errors._form}
          </div>
        )}

        {/* Action Button Group: Submit, Save Draft, Reset */}
        <div className="form-action-group mt-8">
          <button
            type="submit"
            className={`btn btn--primary btn--lg btn--full${submitting ? " btn--loading" : ""}`}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="loading-spinner" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              "Submit"
            )}
          </button>

          <div className="form-action-secondary-row">
            <button
              type="button"
              className="btn btn--secondary btn--md"
              onClick={handleOpenSaveDraftModal}
              disabled={submitting}
            >
              Save Draft
            </button>

            <button
              type="button"
              className="btn btn--ghost btn--md btn--reset"
              onClick={handleReset}
              disabled={submitting}
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {/* Save Draft Modal Popup */}
      {showDraftModal && (
        <div className="modal-backdrop" onClick={() => setShowDraftModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="draft-modal-title">
            <div className="modal-header">
              <h3 id="draft-modal-title" className="modal-title">Save Draft</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowDraftModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmSaveDraft}>
              <div className="field mt-4">
                <label className="field__label" htmlFor="draft-name-input">
                  Draft Name
                </label>
                <input
                  id="draft-name-input"
                  type="text"
                  className="field__input"
                  placeholder={`e.g. School Visit – ${form.config.id}`}
                  value={draftCustomName}
                  onChange={(e) => setDraftCustomName(e.target.value)}
                  autoFocus
                  required
                />
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                  Draft is saved locally on this device and can be resumed anytime.
                </span>
              </div>

              <div className="modal-actions mt-6">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setShowDraftModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
