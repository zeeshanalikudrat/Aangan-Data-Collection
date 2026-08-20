interface AanganLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Aangan Trust logo — minimal SVG icon
 * An arch / shelter symbol representing a protective space
 */
export function AanganLogo({ className, style }: AanganLogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role="img"
      aria-label="Aangan Trust"
    >
      {/* Roof / peak */}
      <path
        d="M20 6L36 18H4L20 6Z"
        fill="#1d2a4a"
      />
      {/* Body with arch opening */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 18H32V36H24V27C24 24.791 22.209 23 20 23C17.791 23 16 24.791 16 27V36H8V18Z"
        fill="#1d2a4a"
      />
    </svg>
  );
}
