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

export function IconDocument(props) {
  return (
    <Base {...props}>
      <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5Z" />
      <path d="M13.5 3.5v5h5" />
      <path d="M8.5 13h7" />
      <path d="M8.5 16.5h4.5" />
    </Base>
  );
}

export function IconTable(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17" />
      <path d="M9.5 9.5v10" />
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

export function IconSettings(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Base>
  );
}

export function IconImage(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="8.75" cy="9.75" r="1.75" />
      <path d="M4 16.5l4.75-4.25 4 3.5 3-2.5 4.25 3.75" />
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

/* ---------------------------------------------------------------- analytics */

export function IconChart(props) {
  return (
    <Base {...props}>
      <path d="M3.5 20.5h17" />
      <rect x="4.5" y="12" width="4" height="6" rx="1" />
      <rect x="10" y="7.5" width="4" height="10.5" rx="1" />
      <rect x="15.5" y="4" width="4" height="14" rx="1" />
    </Base>
  );
}

export function IconTrendUp(props) {
  return (
    <Base {...props}>
      <path d="M3.5 16.5 9 11l3.5 3.5L20.5 6.5" />
      <path d="M15.5 6.5h5v5" />
    </Base>
  );
}

export function IconTrendDown(props) {
  return (
    <Base {...props}>
      <path d="M3.5 7.5 9 13l3.5-3.5 8 8" />
      <path d="M15.5 17.5h5v-5" />
    </Base>
  );
}

export function IconTarget(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.75" />
      <circle cx="12" cy="12" r="1.25" />
    </Base>
  );
}

export function IconCalendar(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </Base>
  );
}

export function IconForm(props) {
  return (
    <Base {...props}>
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M8 8.5h8M8 12.5h8M8 16.5h4" />
    </Base>
  );
}

export function IconAlert(props) {
  return (
    <Base {...props}>
      <path d="M12 4.5 21 19.5H3L12 4.5Z" />
      <path d="M12 10v3.5" />
      <circle cx="12" cy="16.75" r="0.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconInfo(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.9" r="0.65" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconSun(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4.25" />
      <path d="M12 2.75v2.5M12 18.75v2.5M4.85 4.85l1.77 1.77M17.38 17.38l1.77 1.77M2.75 12h2.5M18.75 12h2.5M4.85 19.15l1.77-1.77M17.38 6.62l1.77-1.77" />
    </Base>
  );
}

export function IconMoon(props) {
  return (
    <Base {...props}>
      <path d="M20 14.2A8.25 8.25 0 1 1 9.8 4a6.5 6.5 0 0 0 10.2 10.2Z" />
    </Base>
  );
}

export function IconFlame(props) {
  return (
    <Base {...props}>
      <path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.6.7-3 1.5-4 .2 1.2.9 2 1.8 2 1 0 1.5-1 1.2-2.5-.3-1.6-.8-3-1.5-4.5Z" />
    </Base>
  );
}
