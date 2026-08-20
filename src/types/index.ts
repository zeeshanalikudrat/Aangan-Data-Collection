// ─── Master Sheet Types ───────────────────────────────────────────────────

/**
 * Location-List Master Sheet Row
 * Columns: School Safety ID, State, District, Thaana, Block, GP, School, Assigned GSG, Responsible Person
 */
export interface LocationMasterRow {
  schoolSafetyId: string;
  state: string;
  district: string;
  thaana: string;
  block: string;
  gp: string;
  school: string;
  assignedGsg: string;
  responsiblePerson: string;
}

/**
 * Dropdown-List Master Sheet Row
 * Columns: Form ID, Field Name, Option Value, Display Name, Sort Order, Status
 */
export interface DropdownMasterOption {
  formId: string;
  fieldName: string;
  optionValue: string;
  displayName: string;
  sortOrder: number;
  status: "Active" | "Inactive" | string;
}

/**
 * Forms-Details Master Sheet Row (Form Registry)
 * Columns: Form ID, Form Title, Status, Priority, New Form, Form Folder, Response Sheet, Response Folder
 */
export interface FormsDetailsMasterRow {
  formId: string;
  formTitle: string;
  status: "Active" | "Inactive" | "Enabled" | "Disabled" | string;
  priority: number;
  newForm: boolean | string;
  formFolder: string;
  responseSheet: string;
  responseFolder: string;
}

// ─── Form Configuration & Field Types ──────────────────────────────────────

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "tel"
  | "textarea"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "date"
  | "file"
  | "image"
  | "attachment";

export interface FieldOption {
  label: string;
  value: string;
}

/**
 * Dynamic data source configuration for a field
 */
export interface DynamicSourceConfig {
  type: "dropdown" | "location";
  fieldName?: string; // For dropdown-list matching
  formId?: string;
  column?: "state" | "district" | "thaana" | "block" | "gp" | "school" | "schoolSafetyId" | string;
  locationKey?: "state" | "district" | "thaana" | "block" | "gp" | "school" | "schoolSafetyId" | string;
  parentField?: string;
  dependsOn?: string; // For cascading dropdowns
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: FieldOption[]; // Static options fallback
  dynamicSource?: DynamicSourceConfig; // If populated dynamically from Master Sheets
  accept?: string; // e.g. "image/*,.pdf" for file upload fields
  maxSizeMB?: number;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FormConfig {
  id: string;           // matches Form ID / folder name (e.g. FORM-001)
  title: string;
  description?: string;
  enabled: boolean;
  status?: "Active" | "Closed" | "Inactive" | string;
  newForm?: boolean | string;
  isPriority?: boolean | string | number;
  priority?: number | boolean | string;
  version: number;
  createdAt: string;
  updatedAt: string;
  gasEndpoint?: string;
  sheetId?: string;
  responseFolderId?: string; // Central or form-specific Drive folder ID
}

export interface FormDefinition {
  config: FormConfig;
  fields: FormField[];
}

// ─── File Attachment Payload ────────────────────────────────────────────────

export interface FileAttachmentPayload {
  name: string;
  type: string;
  size?: number;
  base64: string; // Base64 data string
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FormsListResponse {
  forms: FormConfig[];
}

export interface FormDataRow {
  id: string;          // Auto Response ID e.g. RESP-FORM001-XXXXXX (Column B)
  formId: string;      // Form ID (Column A)
  submittedAt: string; // IST Timestamp (Column C)
  data: Record<string, unknown>; // Column D onward
}

export interface FormDataResponse {
  rows: FormDataRow[];
  total: number;
  headers?: string[];
  spreadsheetUrl?: string;
}

// ─── Admin Auth Types ───────────────────────────────────────────────────────

export interface AdminSession {
  authenticated: boolean;
  expiresAt: number;
}

// ─── GAS Service Types ──────────────────────────────────────────────────────

export interface GasFieldHeader {
  id: string;
  label: string;
  type?: FieldType;
}

export interface GasSubmitPayload {
  formId: string;
  formTitle?: string;
  data: Record<string, unknown>;
  fields: GasFieldHeader[]; // Ordered fields establishing Column D onward headers
  attachments?: unknown[];
  submittedAt?: string;
  sheetId?: string;
}

export interface GasFormDataPayload {
  formId: string;
  sheetId?: string;
  limit?: number;
  offset?: number;
}
