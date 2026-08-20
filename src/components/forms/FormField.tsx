"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { FormField, FieldOption, FileAttachmentPayload, LocationMasterRow, DropdownMasterOption } from "@/types";

interface FormFieldProps {
  field: FormField;
  formId?: string;
  value: string | string[] | FileAttachmentPayload;
  onChange: (value: string | string[] | FileAttachmentPayload) => void;
  allValues?: Record<string, unknown>;
  locationList?: LocationMasterRow[];
  initialDropdowns?: DropdownMasterOption[];
  error?: string;
}

export function FormFieldInput({
  field,
  formId,
  value,
  onChange,
  allValues = {},
  locationList = [],
  initialDropdowns = [],
  error,
}: FormFieldProps) {
  const isFileUpload = field.type === "file" || field.type === "image" || field.type === "attachment";
  const stringValue = typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
  const arrayValue: string[] = Array.isArray(value)
    ? value
    : typeof value === "string" && value.length > 0
    ? [value]
    : [];
  const fileValue = typeof value === "object" && !Array.isArray(value) && value !== null ? (value as FileAttachmentPayload) : null;

  // Filter initial dropdown options if preloaded
  const matchingInitialDropdowns = useMemo(() => {
    if (field.dynamicSource?.type !== "dropdown" || initialDropdowns.length === 0) return [];
    const targetFieldName = (field.dynamicSource.fieldName || field.id).toLowerCase();
    return initialDropdowns
      .filter((d) => (d.fieldName || "").toLowerCase() === targetFieldName)
      .map((opt) => ({
        label: opt.displayName || opt.optionValue,
        value: opt.optionValue,
      }));
  }, [field.dynamicSource, field.id, initialDropdowns]);

  const [dropdownOptions, setDropdownOptions] = useState<FieldOption[] | null>(
    matchingInitialDropdowns.length > 0 ? matchingInitialDropdowns : null
  );
  const [loadingDropdown, setLoadingDropdown] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch dynamic options from Dropdown-List sheet if not already preloaded
  useEffect(() => {
    if (field.dynamicSource?.type === "dropdown" && (!dropdownOptions || dropdownOptions.length === 0)) {
      const fieldName = field.dynamicSource.fieldName || field.id;
      setLoadingDropdown(true);

      const query = new URLSearchParams({
        formId: formId || "",
        fieldName: fieldName,
      });

      fetch(`/api/master/dropdown?${query.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.options && Array.isArray(data.options) && data.options.length > 0) {
            setDropdownOptions(
              data.options.map((opt: { displayName?: string; optionValue: string }) => ({
                label: opt.displayName || opt.optionValue,
                value: opt.optionValue,
              }))
            );
          }
        })
        .catch(() => {
          // Fallback to static options if any
        })
        .finally(() => setLoadingDropdown(false));
    }
  }, [field.dynamicSource, field.id, formId, dropdownOptions]);

  // Compute cascading options from Location-List
  const locationOptions = useMemo((): FieldOption[] => {
    if (field.dynamicSource?.type !== "location" || locationList.length === 0) {
      return [];
    }

    const column = (field.dynamicSource.column || field.dynamicSource.locationKey || field.id).toLowerCase();
    const selectedState = (((allValues.state || allValues.State || "") as string) || "").trim();
    const selectedDistrict = (((allValues.district || allValues.District || "") as string) || "").trim();
    const selectedBlock = (((allValues.block || allValues.Block || "") as string) || "").trim();

    const getState = (l: LocationMasterRow) => (l.state || (l as unknown as Record<string, string>).State || "").trim();
    const getDistrict = (l: LocationMasterRow) => (l.district || (l as unknown as Record<string, string>).District || "").trim();
    const getBlock = (l: LocationMasterRow) => (l.block || (l as unknown as Record<string, string>).Block || "").trim();
    const getSchool = (l: LocationMasterRow) => (l.school || (l as unknown as Record<string, string>).School || "").trim();

    if (column === "state") {
      const uniqueStates = Array.from(new Set(locationList.map(getState).filter(Boolean))).sort();
      return uniqueStates.map((s) => ({ label: s, value: s }));
    }

    if (column === "district") {
      if (!selectedState) return [];
      const filtered = locationList.filter((l) => getState(l).toLowerCase() === selectedState.toLowerCase());
      const uniqueDistricts = Array.from(new Set(filtered.map(getDistrict).filter(Boolean))).sort();
      return uniqueDistricts.map((d) => ({ label: d, value: d }));
    }

    if (column === "block") {
      if (!selectedState || !selectedDistrict) return [];
      const filtered = locationList.filter(
        (l) =>
          getState(l).toLowerCase() === selectedState.toLowerCase() &&
          getDistrict(l).toLowerCase() === selectedDistrict.toLowerCase()
      );
      const uniqueBlocks = Array.from(new Set(filtered.map(getBlock).filter(Boolean))).sort();
      return uniqueBlocks.map((b) => ({ label: b, value: b }));
    }

    if (column === "school") {
      if (!selectedState || !selectedDistrict || !selectedBlock) return [];
      const filtered = locationList.filter(
        (l) =>
          getState(l).toLowerCase() === selectedState.toLowerCase() &&
          getDistrict(l).toLowerCase() === selectedDistrict.toLowerCase() &&
          getBlock(l).toLowerCase() === selectedBlock.toLowerCase()
      );
      const uniqueSchools = Array.from(new Set(filtered.map(getSchool).filter(Boolean))).sort();
      return uniqueSchools.map((s) => ({ label: s, value: s }));
    }

    return [];
  }, [field.dynamicSource, field.id, locationList, allValues]);

  // Determine active options (Location cascading > Dropdown list > Static options)
  const activeOptions: FieldOption[] = useMemo(() => {
    if (field.dynamicSource?.type === "location") {
      return locationOptions;
    }
    if (dropdownOptions && dropdownOptions.length > 0) {
      return dropdownOptions;
    }
    return field.options || [];
  }, [field.dynamicSource, locationOptions, dropdownOptions, field.options]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onChange({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: base64,
      });
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveFile() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onChange("");
  }

  // Multi-select toggle handler
  function handleMultiSelectToggle(optValue: string) {
    if (arrayValue.includes(optValue)) {
      onChange(arrayValue.filter((v) => v !== optValue));
    } else {
      onChange([...arrayValue, optValue]);
    }
  }

  const isLocationField = field.dynamicSource?.type === "location";
  const isCascadeDisabled =
    isLocationField &&
    ((field.id === "district" && !allValues.state) ||
      (field.id === "block" && (!allValues.state || !allValues.district)) ||
      (field.id === "school" && (!allValues.state || !allValues.district || !allValues.block)));

  return (
    <div className="field">
      <label className="field__label" htmlFor={field.id}>
        {field.label}
        {field.required && <span className="field__required" aria-label="required">*</span>}
      </label>

      {/* 1. Textarea */}
      {field.type === "textarea" && (
        <textarea
          id={field.id}
          name={field.id}
          className="field__textarea"
          placeholder={field.placeholder}
          required={field.required}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      )}

      {/* 2. Select / Dropdown */}
      {field.type === "select" && (
        <select
          id={field.id}
          name={field.id}
          className="field__select"
          required={field.required}
          value={stringValue}
          disabled={isCascadeDisabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {field.placeholder || `Select ${field.label}`}
          </option>
          {activeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* 3. Multi-Select Dropdown / Checklist */}
      {field.type === "multiselect" && (
        <div className="field__multiselect-group" role="group" aria-label={field.label}>
          {activeOptions.length === 0 && !loadingDropdown ? (
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", padding: "8px 0" }}>
              No categories available
            </div>
          ) : (
            activeOptions.map((opt) => {
              const isSelected = arrayValue.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`field__checkbox-option${isSelected ? " field__checkbox-option--selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    name={field.id}
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => handleMultiSelectToggle(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })
          )}
        </div>
      )}

      {/* 4. Radio Group */}
      {field.type === "radio" && (
        <div className="field__radio-group" role="radiogroup" aria-labelledby={`${field.id}-label`}>
          {activeOptions.length === 0 ? (
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", padding: "8px 0" }}>
              Loading options...
            </div>
          ) : (
            activeOptions.map((opt) => (
              <label key={opt.value} className="field__radio-option">
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={stringValue === opt.value}
                  onChange={() => onChange(opt.value)}
                  required={field.required}
                />
                <span>{opt.label}</span>
              </label>
            ))
          )}
        </div>
      )}

      {/* 5. Checkbox Group */}
      {field.type === "checkbox" && (
        <div className="field__checkbox-group">
          {activeOptions.map((opt) => {
            const checked = arrayValue.includes(opt.value);
            return (
              <label key={opt.value} className="field__checkbox-option">
                <input
                  type="checkbox"
                  name={field.id}
                  value={opt.value}
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...arrayValue, opt.value]);
                    } else {
                      onChange(arrayValue.filter((v) => v !== opt.value));
                    }
                  }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* 6. Photo / Image / File Upload */}
      {isFileUpload && (
        <div style={{ marginTop: "4px" }}>
          {!fileValue && (
            <input
              ref={fileInputRef}
              id={field.id}
              name={field.id}
              type="file"
              accept={field.accept || (field.type === "image" ? "image/*" : undefined)}
              className="field__input"
              required={field.required && !fileValue}
              onChange={handleFileChange}
              style={{ padding: "8px 12px", cursor: "pointer" }}
            />
          )}

          {fileValue && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--border-radius)",
                fontSize: "0.8125rem",
              }}
            >
              <div>
                <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{fileValue.name}</span>
                {fileValue.size && (
                  <span style={{ marginLeft: "8px", color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                    ({(fileValue.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleRemoveFile}
                style={{ color: "var(--color-error)", padding: "2px 8px" }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* 7. Standard Text / Number / Tel / Date Inputs */}
      {!["textarea", "select", "multiselect", "radio", "checkbox", "file", "image", "attachment"].includes(
        field.type
      ) && (
        <input
          id={field.id}
          name={field.id}
          type={field.type}
          className="field__input"
          placeholder={field.placeholder}
          required={field.required}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          min={field.validation?.min}
          max={field.validation?.max}
          pattern={field.validation?.pattern}
        />
      )}

      {error && (
        <div className="field__error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
