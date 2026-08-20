/**
 * drafts.ts
 *
 * Device-isolated local draft storage management.
 * Drafts are stored purely on the client device (localStorage) and associated
 * with a unique, persistent Device ID.
 *
 * Drafts are NEVER sent to Google Sheets, Google Drive, or Google Apps Script.
 */

export interface FormDraft {
  id: string;          // Unique Draft ID e.g. draft_FORM-001_1724151234567
  deviceId: string;    // Unique Device ID e.g. device_a8f9c123-xxxx
  formId: string;      // Form ID e.g. FORM-001
  formTitle: string;   // Form Title e.g. Child Safety & Incident Report
  name: string;        // Custom or default draft name e.g. "School Visit – Dumka"
  updatedAt: string;   // ISO timestamp
  data: Record<string, unknown>; // Form values entered so far
}

const STORAGE_KEY = "aangan_form_drafts_v1";
const DEVICE_ID_KEY = "aangan_device_id_v1";

/**
 * Returns the persistent unique Device ID for this browser/device.
 * Generates and stores a new cryptographically random ID on first use.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "device_server";

  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        deviceId = `device_${crypto.randomUUID()}`;
      } else {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      }
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return "device_fallback";
  }
}

/**
 * Returns all saved drafts belonging ONLY to the current Device ID.
 */
export function getAllDrafts(): FormDraft[] {
  if (typeof window === "undefined") return [];

  try {
    const currentDeviceId = getOrCreateDeviceId();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const allDrafts: FormDraft[] = JSON.parse(raw);
    
    // Strict isolation: only return drafts created on this device
    return allDrafts
      .filter((d) => d.deviceId === currentDeviceId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    console.error("[drafts] Failed to read drafts from localStorage:", err);
    return [];
  }
}

/**
 * Returns a specific draft by its ID (if matching current Device ID).
 */
export function getDraftById(draftId: string): FormDraft | null {
  const drafts = getAllDrafts();
  return drafts.find((d) => d.id === draftId) || null;
}

/**
 * Returns the most recent draft for a given Form ID on this device.
 */
export function getLatestDraftForForm(formId: string): FormDraft | null {
  const drafts = getAllDrafts();
  return drafts.find((d) => d.formId === formId) || null;
}

/**
 * Saves or updates a draft for the current device.
 */
export function saveFormDraft(payload: {
  id?: string;
  formId: string;
  formTitle: string;
  name?: string;
  data: Record<string, unknown>;
}): FormDraft {
  const currentDeviceId = getOrCreateDeviceId();
  const draftId = payload.id || `draft_${payload.formId}_${Date.now()}`;
  const draftName = payload.name && payload.name.trim() !== ""
    ? payload.name.trim()
    : `Untitled – ${payload.formId}`;

  const updatedDraft: FormDraft = {
    id: draftId,
    deviceId: currentDeviceId,
    formId: payload.formId,
    formTitle: payload.formTitle,
    name: draftName,
    updatedAt: new Date().toISOString(),
    data: payload.data,
  };

  if (typeof window === "undefined") return updatedDraft;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const allDrafts: FormDraft[] = raw ? JSON.parse(raw) : [];

    const existingIndex = allDrafts.findIndex(
      (d) => d.id === draftId && d.deviceId === currentDeviceId
    );

    if (existingIndex !== -1) {
      allDrafts[existingIndex] = updatedDraft;
    } else {
      // If there's an existing untitled draft for this form on this device, update it
      const untitledIndex = allDrafts.findIndex(
        (d) => d.formId === payload.formId &&
               d.deviceId === currentDeviceId &&
               d.name.startsWith("Untitled") &&
               !payload.id
      );

      if (untitledIndex !== -1 && !payload.name) {
        allDrafts[untitledIndex] = updatedDraft;
      } else {
        allDrafts.unshift(updatedDraft);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(allDrafts));
    window.dispatchEvent(new Event("aangan_drafts_updated"));
  } catch (err) {
    console.error("[drafts] Failed to save draft to localStorage:", err);
  }

  return updatedDraft;
}

/**
 * Deletes a draft by its ID (for the current device).
 */
export function deleteDraft(draftId: string): void {
  if (typeof window === "undefined") return;

  try {
    const currentDeviceId = getOrCreateDeviceId();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const allDrafts: FormDraft[] = JSON.parse(raw);
    const filtered = allDrafts.filter(
      (d) => !(d.id === draftId && d.deviceId === currentDeviceId)
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event("aangan_drafts_updated"));
  } catch (err) {
    console.error("[drafts] Failed to delete draft:", err);
  }
}

/**
 * Deletes drafts associated with a specific Form ID on this device.
 */
export function deleteDraftsByFormId(formId: string): void {
  if (typeof window === "undefined") return;

  try {
    const currentDeviceId = getOrCreateDeviceId();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const allDrafts: FormDraft[] = JSON.parse(raw);
    const filtered = allDrafts.filter(
      (d) => !(d.formId === formId && d.deviceId === currentDeviceId)
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event("aangan_drafts_updated"));
  } catch (err) {
    console.error("[drafts] Failed to delete drafts for form:", err);
  }
}
