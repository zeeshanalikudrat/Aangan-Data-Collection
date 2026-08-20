/**
 * auth.ts
 *
 * Admin authentication verifying credentials stored in environment variables:
 * - ADMIN_EMAIL
 * - ADMIN_PASSWORD
 *
 * Session is stored client-side in sessionStorage with an 8-hour expiry.
 */

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "Admin@aanganindia.org").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Aangan@123";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Server-side: Verifies submitted email and password against environment variables.
 */
export function verifyAdminCredentials(email: string, password: string): boolean {
  const cleanEmail = (email || "").toLowerCase().trim();
  const cleanPassword = (password || "").trim();

  if (!ADMIN_PASSWORD) {
    console.error("[auth] ADMIN_PASSWORD is not set in environment variables.");
    return false;
  }

  return cleanEmail === ADMIN_EMAIL && cleanPassword === ADMIN_PASSWORD;
}

/**
 * Legacy single-password check helper
 */
export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/**
 * Client-side: Checks if admin session is valid.
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const raw = sessionStorage.getItem("aangan_admin_session");
    if (!raw) return false;

    const session = JSON.parse(raw);
    if (!session.authenticated || !session.expiresAt) return false;

    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem("aangan_admin_session");
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Client-side: Saves a valid admin session to sessionStorage.
 */
export function saveAdminSession(email?: string): void {
  if (typeof window === "undefined") return;

  const session = {
    authenticated: true,
    email: email || "Admin@aanganindia.org",
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  sessionStorage.setItem("aangan_admin_session", JSON.stringify(session));
}

/**
 * Client-side: Clears admin session (logout).
 */
export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("aangan_admin_session");
}
