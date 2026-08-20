"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { saveAdminSession } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("Admin@aanganindia.org");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Invalid credentials");
        return;
      }

      saveAdminSession(email);
      router.push("/admin/dashboard");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo" style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <Image
              src="/logo.png"
              alt="Aangan Trust"
              width={160}
              height={54}
              style={{ height: "48px", width: "auto", objectFit: "contain" }}
              priority
            />
          </div>
          <h1 className="login-card__title">Admin Login</h1>
          <p className="login-card__subtitle">Aangan Trust Portal</p>
        </div>

        <form className="login-card__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="email">
              Admin Email
            </label>
            <input
              id="email"
              type="email"
              className="field__input"
              placeholder="Admin@aanganindia.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="field" style={{ marginTop: "16px" }}>
            <label className="field__label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field__input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`btn btn--primary btn--full btn--lg${loading ? " btn--loading" : ""}`}
            disabled={loading || !password || !email}
            style={{ marginTop: "24px" }}
          >
            {loading ? (
              <>
                <span className="loading-spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
