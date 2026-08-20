"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clearAdminSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Forms" },
  { href: "/admin/data", label: "Data" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearAdminSession();
    router.push("/admin");
  }

  return (
    <header className="admin-header">
      <div className="admin-header__inner">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <Image
            src="/logo.png"
            alt="Aangan Trust"
            width={120}
            height={40}
            style={{ height: "28px", width: "auto", objectFit: "contain", display: "block" }}
            priority
          />
        </Link>
        <span className="admin-header__brand">Admin</span>
        <nav className="admin-header__nav">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`admin-nav-link${pathname.startsWith(link.href) ? " admin-nav-link--active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleLogout}
          className="btn btn--ghost btn--sm"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
