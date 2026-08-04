// Small hand-built line-icon set, kept intentionally minimal and consistent
// (24x24 viewBox, rounded strokes, currentColor) rather than pulling in an
// icon library — every icon here is used somewhere in the app.

function Base({ size = 20, strokeWidth = 1.75, className, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconOverview(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </Base>
  );
}

export function IconInbox(props) {
  return (
    <Base {...props}>
      <path d="M3.5 12h4l1.5 2.5h6L16.5 12h4" />
      <path d="M5.5 6.5h13l2 5.5v6a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18v-6l2-5.5Z" />
    </Base>
  );
}

export function IconPipeline(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="4" width="5" height="16" rx="1.25" />
      <rect x="9.75" y="4" width="5" height="10" rx="1.25" />
      <rect x="16" y="4" width="5" height="13" rx="1.25" />
    </Base>
  );
}

export function IconContacts(props) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <circle cx="17" cy="7.5" r="2.25" />
      <path d="M15.5 13.25c2.4.3 4.25 2.5 4.25 5.25" />
    </Base>
  );
}

export function IconEdit(props) {
  return (
    <Base {...props}>
      <path d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 7.5l3 3" />
    </Base>
  );
}

export function IconSparkles(props) {
  return (
    <Base {...props}>
      <path d="M11 3.5l1.2 3.3 3.3 1.2-3.3 1.2L11 12.5l-1.2-3.3-3.3-1.2 3.3-1.2L11 3.5Z" />
      <path d="M18 13l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" />
    </Base>
  );
}

export function IconExternalLink(props) {
  return (
    <Base {...props}>
      <path d="M9.5 5.5h-4a1.5 1.5 0 0 0-1.5 1.5v11a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-4" />
      <path d="M13.5 4.5h6v6" />
      <path d="M19 5l-8.5 8.5" />
    </Base>
  );
}

export function IconLogout(props) {
  return (
    <Base {...props}>
      <path d="M9.5 20H6a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 6 4h3.5" />
      <path d="M15.5 16l4-4-4-4" />
      <path d="M19.25 12h-10" />
    </Base>
  );
}

export function IconSearch(props) {
  return (
    <Base {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </Base>
  );
}

export function IconFilter(props) {
  return (
    <Base {...props}>
      <path d="M3.5 5h17l-6.25 7.5v5.25L9.75 20v-7.5L3.5 5Z" />
    </Base>
  );
}

export function IconPlus(props) {
  return (
    <Base {...props}>
      <path d="M12 4.5v15" />
      <path d="M4.5 12h15" />
    </Base>
  );
}

export function IconTrash(props) {
  return (
    <Base {...props}>
      <path d="M4.5 7h15" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6.5 7l.75 12A1.5 1.5 0 0 0 8.75 20.5h6.5a1.5 1.5 0 0 0 1.5-1.5L17.5 7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Base>
  );
}

export function IconCheck(props) {
  return (
    <Base {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Base>
  );
}

export function IconChevronUp(props) {
  return (
    <Base {...props}>
      <path d="M5 15l7-7 7 7" />
    </Base>
  );
}

export function IconChevronDown(props) {
  return (
    <Base {...props}>
      <path d="M5 9l7 7 7-7" />
    </Base>
  );
}

export function IconClose(props) {
  return (
    <Base {...props}>
      <path d="M5.5 5.5l13 13" />
      <path d="M18.5 5.5l-13 13" />
    </Base>
  );
}

export function IconMail(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="M4.5 7l7.5 6 7.5-6" />
    </Base>
  );
}

export function IconClock(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3 2" />
    </Base>
  );
}

export function IconArrowRight(props) {
  return (
    <Base {...props}>
      <path d="M4.5 12h15" />
      <path d="M13 5.5l6.5 6.5-6.5 6.5" />
    </Base>
  );
}

export function IconUsers(props) {
  return (
    <Base {...props}>
      <circle cx="8.5" cy="8" r="3.25" />
      <path d="M2.75 19.5c0-3.2 2.6-5.75 5.75-5.75s5.75 2.55 5.75 5.75" />
      <circle cx="17" cy="7.5" r="2.25" />
      <path d="M15.25 13.5c2.5.25 4.5 2.55 4.5 6" />
    </Base>
  );
}
