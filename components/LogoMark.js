// The app's icon mark: three connected nodes (relationships — the "CRM" part)
// with a small spark accent (the "AI" part). Hand-drawn SVG, not a stock icon.
export default function LogoMark({ size = 28, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 9.5L9 21.5M16 9.5L23 21.5M9 21.5H23"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="9.5" r="3.5" fill="var(--primary)" />
      <circle cx="9" cy="21.5" r="3" fill="var(--primary)" fillOpacity="0.55" />
      <circle cx="23" cy="21.5" r="3" fill="var(--primary)" fillOpacity="0.55" />
      <path
        d="M24.5 4.5L25.4 6.9L27.8 7.8L25.4 8.7L24.5 11.1L23.6 8.7L21.2 7.8L23.6 6.9L24.5 4.5Z"
        fill="#f59e0b"
      />
    </svg>
  );
}
