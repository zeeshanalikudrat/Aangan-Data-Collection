import Link from "next/link";
import Image from "next/image";

interface HeaderProps {
  rightContent?: React.ReactNode;
}

export function Header({ rightContent }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        {/* Left: Logo */}
        <Link href="/" className="site-header__logo" aria-label="Aangan Home">
          <Image
            src="/logo.png"
            alt="Aangan Trust"
            width={140}
            height={46}
            style={{
              height: "36px",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
            priority
          />
        </Link>

        {/* Center: Portal Title */}
        <div className="site-header__center">
          <span className="site-header__portal-title">Data Collection Portal</span>
        </div>

        {/* Right: Small Login Button (opens admin in new tab) */}
        <div className="site-header__actions">
          {rightContent ? (
            rightContent
          ) : (
            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="site-header__login-btn"
              title="Admin Login (Opens in new tab)"
              aria-label="Admin Login"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ marginRight: "5px" }}
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Login</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
