/**
 * gas-service.ts
 *
 * Isolated Google Apps Script (GAS) API service layer.
 * Communicates with the Master Google Spreadsheet and Central Drive Folder:
 * 1. Location-List   (Master location hierarchy)
 * 2. Dropdown-List   (Master dropdown options)
 * 3. Forms-Details   (Form Registry)
 * 4. Dedicated Response Spreadsheets in Central Drive Folder
 */

import type {
  GasSubmitPayload,
  GasFormDataPayload,
  FormDataRow,
  ApiResponse,
  DropdownMasterOption,
  LocationMasterRow,
  FormsDetailsMasterRow,
} from "@/types";

import fs from "fs";
import path from "path";

function getGasBaseUrl(): string {
  if (process.env.GAS_BASE_URL && process.env.GAS_BASE_URL.trim()) {
    return process.env.GAS_BASE_URL.trim();
  }

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("GAS_BASE_URL=")) {
          const val = trimmed.slice("GAS_BASE_URL=".length).trim().replace(/^["']|["']$/g, "");
          if (val) {
            process.env.GAS_BASE_URL = val;
            return val;
          }
        }
      }
    }
  } catch {
    // Ignore in non-fs environment
  }

  return "";
}

/**
 * Submits form data to Google Apps Script.
 */
export async function submitFormData(
  payload: GasSubmitPayload
): Promise<ApiResponse<{ id: string; timestamp: string; rowNumber?: number; spreadsheetUrl?: string; folderUrl?: string }>> {
  const baseUrl = getGasBaseUrl();

  if (!baseUrl) {
    const cleanId = (payload.formId || "FORM").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const timestamp = new Date().toISOString();
    const randomSuffix = ("000" + Math.floor(Math.random() * 10000)).slice(-4);
    const mockId = `RESP-${cleanId}-${Date.now()}-${randomSuffix}`;

    console.info("[gas-service] GAS_BASE_URL not configured. Generated local mock ID:", mockId);
    return {
      success: true,
      data: {
        id: mockId,
        timestamp,
        rowNumber: 2,
      },
    };
  }

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        formId: payload.formId,
        formTitle: payload.formTitle,
        data: payload.data,
        fields: payload.fields || [],
        attachments: payload.attachments || [],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`GAS returned HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.error || "GAS submission failed" };
    }

    return {
      success: true,
      data: {
        id: result.data.id,
        timestamp: result.data.timestamp,
        rowNumber: result.data.rowNumber,
        spreadsheetUrl: result.data.spreadsheetUrl,
        folderUrl: result.data.folderUrl,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error during form submission";
    console.error("[gas-service] submitFormData error:", message);
    return { success: false, error: message };
  }
}

/**
 * Fetches form responses for Admin Data Viewer.
 */
export async function fetchFormData(
  payload: GasFormDataPayload
): Promise<ApiResponse<FormDataRow[]>> {
  const baseUrl = getGasBaseUrl();
  if (!baseUrl) {
    return { success: true, data: [] };
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("action", "getData");
    url.searchParams.set("formId", payload.formId);
    if (payload.limit) url.searchParams.set("limit", String(payload.limit));
    if (payload.offset) url.searchParams.set("offset", String(payload.offset));

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`GAS returned HTTP ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.rows ?? [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch form data";
    console.error("[gas-service] fetchFormData error:", message);
    return { success: false, error: message };
  }
}

/**
 * Fetches the active Form Registry from `Forms-Details` sheet.
 */
export async function fetchFormsRegistryFromGAS(): Promise<ApiResponse<FormsDetailsMasterRow[]>> {
  const baseUrl = getGasBaseUrl();
  if (!baseUrl) {
    return { success: true, data: [] };
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("action", "getFormsRegistry");

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`GAS returned HTTP ${response.status}`);

    const result = await response.json();
    return { success: true, data: result.forms ?? [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch forms registry";
    console.error("[gas-service] fetchFormsRegistry error:", message);
    return { success: false, error: message };
  }
}

/**
 * Fetches active dropdown options from `Dropdown-List` sheet.
 */
export async function fetchDropdownOptionsFromGAS(
  formId?: string,
  fieldName?: string
): Promise<ApiResponse<DropdownMasterOption[]>> {
  const baseUrl = getGasBaseUrl();
  if (!baseUrl) {
    return { success: true, data: [] };
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("action", "getDropdownList");
    if (formId) url.searchParams.set("formId", formId);
    if (fieldName) url.searchParams.set("fieldName", fieldName);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`GAS returned HTTP ${response.status}`);

    const result = await response.json();
    const rawOptions = result.options ?? [];

    const options: DropdownMasterOption[] = rawOptions.map((o: Record<string, unknown>) => ({
      formId: String(o.formId || o["Form ID"] || ""),
      fieldName: String(o.fieldName || o["Field Name"] || ""),
      optionValue: String(o.optionValue || o["Option Value"] || o.value || ""),
      displayName: String(o.displayName || o["Display Name"] || o.label || o.optionValue || ""),
      sortOrder: Number(o.sortOrder ?? o["Sort Order"] ?? 0),
      status: String(o.status || o.Status || "Active"),
    }));

    return { success: true, data: options };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch dropdown options";
    console.error("[gas-service] fetchDropdownOptions error:", message);
    return { success: false, error: message };
  }
}

/**
 * Fetches master locations from `Location-List` sheet with no-cache live updates.
 */
export async function fetchLocationListFromGAS(): Promise<ApiResponse<LocationMasterRow[]>> {
  const baseUrl = getGasBaseUrl();
  if (!baseUrl) {
    return { success: true, data: [] };
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("action", "getLocationList");

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`GAS returned HTTP ${response.status}`);

    const result = await response.json();
    const rawLocations = result.locations ?? [];

    const locations: LocationMasterRow[] = rawLocations.map((l: Record<string, unknown>) => ({
      schoolSafetyId: String(l.schoolSafetyId || l["School Safety ID"] || l.school_safety_id || ""),
      state: String(l.state || l.State || "").trim(),
      district: String(l.district || l.District || "").trim(),
      thaana: String(l.thaana || l.Thaana || l.thana || "").trim(),
      block: String(l.block || l.Block || "").trim(),
      gp: String(l.gp || l.GP || l.GramPanchayat || "").trim(),
      school: String(l.school || l.School || "").trim(),
      assignedGsg: String(l.assignedGsg || l["Assigned GSG"] || "").trim(),
      responsiblePerson: String(l.responsiblePerson || l["Responsible Person"] || "").trim(),
    }));

    return { success: true, data: locations };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch location list";
    console.error("[gas-service] fetchLocationList error:", message);
    return { success: false, error: message };
  }
}

/**
 * Updates a response row in dedicated Response spreadsheet.
 */
export async function updateFormRow(
  formId: string,
  rowId: string,
  data: Record<string, unknown>
): Promise<ApiResponse<void>> {
  const baseUrl = getGasBaseUrl();
  if (!baseUrl) {
    return { success: true };
  }

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateRow", formId, rowId, data }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`GAS returned HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    console.error("[gas-service] updateFormRow error:", message);
    return { success: false, error: message };
  }
}
