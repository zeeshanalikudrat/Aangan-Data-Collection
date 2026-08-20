import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found — Aangan Trust",
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        textAlign: "center",
        fontFamily: "var(--font-family, system-ui, sans-serif)",
      }}
    >
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>
        Page not found
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "24px" }}>
        This form may have been disabled or does not exist.
      </p>
      <Link
        href="/"
        style={{
          fontSize: "0.875rem",
          color: "#1d4ed8",
          textDecoration: "none",
        }}
      >
        ← Back to forms
      </Link>
    </div>
  );
}
