/**
 * forms-registry.ts
 *
 * Reads form configurations from the backend/forms/ directory and merges
 * live metadata (Status, Priority, New Form) in real-time from Google Sheet `Forms-Details`.
 */

import path from "path";
import fs from "fs";
import type { FormConfig, FormDefinition, FormField, FormsDetailsMasterRow } from "@/types";
import { fetchFormsRegistryFromGAS } from "@/lib/gas-service";

const FORMS_DIR = path.join(process.cwd(), "backend", "forms");

function checkIsTrueOrYes(val: unknown): boolean {
  if (val === true) return true;
  if (typeof val === "string") {
    const clean = val.trim().toLowerCase();
    return clean === "yes" || clean === "true" || clean === "1";
  }
  if (typeof val === "number") return val === 1;
  return false;
}

function getPriorityScore(val: number | boolean | string | undefined): number {
  if (typeof val === "number") return val;
  if (checkIsTrueOrYes(val)) return 1;
  if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 999;
}

/**
 * Returns all local form configs.
 */
export function getAllForms(includeDisabled = false): FormConfig[] {
  if (!fs.existsSync(FORMS_DIR)) {
    return [];
  }

  const formFolders = fs
    .readdirSync(FORMS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const forms: FormConfig[] = [];

  for (const folder of formFolders) {
    const configPath = path.join(FORMS_DIR, folder, "config.json");
    if (!fs.existsSync(configPath)) continue;

    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const config: FormConfig = JSON.parse(raw);
      config.id = folder;
      config.status = config.status || (config.enabled ? "Active" : "Inactive");

      if (includeDisabled || config.status === "Active" || config.status === "Closed" || config.enabled) {
        forms.push(config);
      }
    } catch (err) {
      console.error(`[forms-registry] Failed to parse config for ${folder}:`, err);
    }
  }

  return forms.sort((a, b) => {
    const pA = getPriorityScore(a.priority ?? a.isPriority);
    const pB = getPriorityScore(b.priority ?? b.isPriority);
    if (pA !== pB) return pA - pB;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Returns all forms with real-time live metadata merged from Google Sheet `Forms-Details`.
 */
export async function getAllFormsLive(includeDisabled = false): Promise<FormConfig[]> {
  const localForms = getAllForms(includeDisabled);

  try {
    const gasRes = await fetchFormsRegistryFromGAS();
    if (gasRes.success && gasRes.data && Array.isArray(gasRes.data)) {
      const sheetFormsMap = new Map<string, FormsDetailsMasterRow>();
      for (const row of gasRes.data) {
        if (row.formId) {
          sheetFormsMap.set(String(row.formId).trim().toUpperCase(), row);
        }
      }

      for (const form of localForms) {
        const liveRow = sheetFormsMap.get(form.id.trim().toUpperCase());
        if (liveRow) {
          if (liveRow.formTitle) form.title = liveRow.formTitle;
          if (liveRow.status) form.status = liveRow.status;

          const pVal = (liveRow as Record<string, unknown>).isPriority !== undefined
            ? (liveRow as Record<string, unknown>).isPriority
            : liveRow.priority;
          if (pVal !== undefined && pVal !== null && pVal !== "") {
            form.priority = pVal as boolean | string | number;
            form.isPriority = pVal as boolean | string | number;
          }

          const nVal = (liveRow as Record<string, unknown>).isNew !== undefined
            ? (liveRow as Record<string, unknown>).isNew
            : liveRow.newForm;
          if (nVal !== undefined && nVal !== null && nVal !== "") {
            form.newForm = nVal as boolean | string;
          }
        }
      }
    }
  } catch (err) {
    console.warn("[forms-registry] Live Forms-Details fetch failed, using local config:", err);
  }

  return localForms.sort((a, b) => {
    const pA = getPriorityScore(a.priority ?? a.isPriority);
    const pB = getPriorityScore(b.priority ?? b.isPriority);
    if (pA !== pB) return pA - pB;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Returns a single form definition (config + fields) by form ID with live sheet metadata.
 */
export function getFormById(formId: string): FormDefinition | null {
  const formDir = path.join(FORMS_DIR, formId);

  if (!fs.existsSync(formDir)) {
    return null;
  }

  const configPath = path.join(formDir, "config.json");
  const fieldsPath = path.join(formDir, "fields.json");

  if (!fs.existsSync(configPath) || !fs.existsSync(fieldsPath)) {
    return null;
  }

  try {
    const config: FormConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const fields: FormField[] = JSON.parse(fs.readFileSync(fieldsPath, "utf-8"));

    config.id = formId;

    return { config, fields };
  } catch (err) {
    console.error(`[forms-registry] Failed to load form ${formId}:`, err);
    return null;
  }
}

/**
 * Updates a form's config.json file with new properties.
 */
export function updateFormConfig(
  formId: string,
  updates: Partial<FormConfig>
): boolean {
  const configPath = path.join(FORMS_DIR, formId, "config.json");

  if (!fs.existsSync(configPath)) {
    return false;
  }

  try {
    const existing: FormConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const updated: FormConfig = {
      ...existing,
      ...updates,
      id: formId,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error(`[forms-registry] Failed to update config for ${formId}:`, err);
    return false;
  }
}
