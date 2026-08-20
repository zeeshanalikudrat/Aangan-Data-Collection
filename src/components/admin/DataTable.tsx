"use client";

import { useState, useEffect } from "react";
import type { FormConfig, FormDataRow } from "@/types";

interface DataTableProps {
  forms: FormConfig[];
}

function downloadCSV(rows: FormDataRow[], formTitle: string) {
  if (rows.length === 0) return;

  const allKeys = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.data)))
  );
  const headers = ["Form ID", "ID", "Timestamp", ...allKeys];

  const csvRows = [
    headers.join(","),
    ...rows.map((row) => {
      const cells = [
        `"${row.formId || ""}"`,
        `"${row.id || ""}"`,
        `"${row.submittedAt || ""}"`,
        ...allKeys.map((key) => {
          const val = row.data[key] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        }),
      ];
      return cells.join(",");
    }),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${formTitle.replace(/\s+/g, "-").toLowerCase()}-responses.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderCellValue(val: unknown) {
  if (val === undefined || val === null || val === "") return "—";
  const str = String(val);

  // If it's a Drive or HTTP URL, display clickable link
  if (str.startsWith("https://") || str.startsWith("http://")) {
    const urls = str.split(/[\n,]+/);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {urls.map((u, i) => (
          <a
            key={i}
            href={u.trim()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-accent)", fontSize: "0.8125rem", textDecoration: "underline" }}
          >
            View File ↗
          </a>
        ))}
      </div>
    );
  }

  return str;
}

export function DataTable({ forms }: DataTableProps) {
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [rows, setRows] = useState<FormDataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewRow, setViewRow] = useState<FormDataRow | null>(null);

  const selectedForm = forms.find((f) => f.id === selectedFormId);

  useEffect(() => {
    if (!selectedFormId) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError("");

    fetch(`/api/data/${selectedFormId}`, {
      headers: {
        "x-admin-token": "",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch data");
        return res.json();
      })
      .then((data) => {
        setRows(data.rows ?? []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [selectedFormId]);

  const allKeys =
    rows.length > 0
      ? Array.from(new Set(rows.flatMap((r) => Object.keys(r.data))))
      : [];

  return (
    <div>
      {/* Form selector */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <select
          id="form-select"
          className="select"
          value={selectedFormId}
          onChange={(e) => setSelectedFormId(e.target.value)}
        >
          <option value="">Select Form</option>
          {forms.map((form) => (
            <option key={form.id} value={form.id}>
              {form.title} ({form.id})
            </option>
          ))}
        </select>

        {rows.length > 0 && selectedForm && (
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => downloadCSV(rows, selectedForm.title)}
          >
            Download CSV
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <span className="loading-spinner" style={{ width: "24px", height: "24px" }} aria-hidden="true" />
          <p className="text-sm text-muted mt-4">Loading data from Google Drive response sheet...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="login-error mt-4" role="alert">{error}</div>
      )}

      {/* No form selected */}
      {!selectedFormId && !loading && (
        <div className="empty-state">
          <p className="empty-state__text">Select a form from the dropdown above to view submitted data.</p>
        </div>
      )}

      {/* Empty results */}
      {selectedFormId && !loading && !error && rows.length === 0 && (
        <div className="empty-state">
          <p className="empty-state__text">No response records found for <code>{selectedFormId}</code>.</p>
        </div>
      )}

      {/* Data table */}
      {rows.length > 0 && !loading && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
            <p className="text-sm text-muted">
              {rows.length} {rows.length === 1 ? "response record" : "response records"}
            </p>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              Drive Folder: <code>{selectedForm?.title}_ Response_{selectedFormId}</code>
            </span>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Form ID</th>
                  <th scope="col">ID</th>
                  <th scope="col">Timestamp</th>
                  {allKeys.map((key) => (
                    <th key={key} scope="col">{key}</th>
                  ))}
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {row.formId || selectedFormId}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {row.id}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.8125rem" }}>
                      {row.submittedAt}
                    </td>
                    {allKeys.map((key) => (
                      <td key={key}>{renderCellValue(row.data[key])}</td>
                    ))}
                    <td>
                      <div className="data-table__actions">
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => setViewRow(row)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => alert(`Edit record ${row.id}`)}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* View modal */}
      {viewRow && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 200,
          }}
          onClick={() => setViewRow(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              padding: "24px",
              maxWidth: "540px",
              width: "100%",
              maxHeight: "85vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Response Record Details</h2>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontFamily: "monospace", marginTop: "2px" }}>
                  {viewRow.formId || selectedFormId} / {viewRow.id}
                </div>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setViewRow(null)}>Close</button>
            </div>
            
            <dl style={{ display: "grid", gap: "12px" }}>
              <div>
                <dt style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "2px" }}>Form ID</dt>
                <dd style={{ fontSize: "0.875rem", fontFamily: "monospace" }}>{viewRow.formId || selectedFormId}</dd>
              </div>
              <div>
                <dt style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "2px" }}>Response ID</dt>
                <dd style={{ fontSize: "0.875rem", fontFamily: "monospace" }}>{viewRow.id}</dd>
              </div>
              <div>
                <dt style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "2px" }}>Timestamp</dt>
                <dd style={{ fontSize: "0.875rem" }}>{viewRow.submittedAt}</dd>
              </div>
              {Object.entries(viewRow.data).map(([key, val]) => (
                <div key={key}>
                  <dt style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "2px" }}>{key}</dt>
                  <dd style={{ fontSize: "0.875rem" }}>{renderCellValue(val)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
