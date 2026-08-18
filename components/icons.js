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

// A 3x3 dot grid (the conventional "app launcher" mark) — deliberately
// distinct from IconOverview's 2x2 rounded squares so the Hub and Overview
// nav entries don't read as the same icon.
export function IconGrid(props) {
  return (
    <Base {...props} fill="currentColor" stroke="none">
      {[4, 12, 20].flatMap((cy) => [4, 12, 20].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" />))}
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

export function IconLock(props) {
  return (
    <Base {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
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

export function IconMenu(props) {
  return (
    <Base {...props}>
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </Base>
  );
}

export function IconCookie(props) {
  return (
    <Base {...props}>
      <path d="M20.5 12.9a1.4 1.4 0 0 0-1.55-1.4 2.3 2.3 0 0 1-2.45-2.45 1.4 1.4 0 0 0-1.65-1.55A2.3 2.3 0 0 1 12.2 4.9 1.4 1.4 0 0 0 10.6 3.5 8.5 8.5 0 1 0 20.5 12.9Z" />
      <circle cx="9" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8.25" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="13" cy="16.25" r="0.9" fill="currentColor" stroke="none" />
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

export function IconGlobe(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.2 2.3 3.3 5.2 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.2-3.3-8.5S9.8 5.8 12 3.5Z" />
    </Base>
  );
}

export function IconUser(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
    </Base>
  );
}

export function IconCamera(props) {
  return (
    <Base {...props}>
      <path d="M4 8h3l1.5-2.5h7L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8Z" />
      <circle cx="12" cy="13" r="3.25" />
    </Base>
  );
}

export function IconBriefcase(props) {
  return (
    <Base {...props}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M8.75 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3.5A1.5 1.5 0 0 1 15.25 6v1.5" />
      <path d="M3 12.5h18" />
    </Base>
  );
}

export function IconGraduation(props) {
  return (
    <Base {...props}>
      <path d="M12 4.5 21 9l-9 4.5L3 9l9-4.5Z" />
      <path d="M6.75 10.9V15c0 1.6 2.35 2.9 5.25 2.9s5.25-1.3 5.25-2.9v-4.1" />
      <path d="M20 9.6v4.4" />
    </Base>
  );
}

export function IconDownload(props) {
  return (
    <Base {...props}>
      <path d="M12 4v10.5" />
      <path d="m7.75 10.5 4.25 4.25 4.25-4.25" />
      <path d="M4.5 18.5h15" />
    </Base>
  );
}

export function IconArrowLeft(props) {
  return (
    <Base {...props}>
      <path d="M19 12H5" />
      <path d="m10.5 6.5-5.5 5.5 5.5 5.5" />
    </Base>
  );
}

export function IconChevronRight(props) {
  return (
    <Base {...props}>
      <path d="m9 5.5 6.5 6.5L9 18.5" />
    </Base>
  );
}

export function IconFileText(props) {
  return (
    <Base {...props}>
      <path d="M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-5.5-5.5Z" />
      <path d="M13.5 3.5V9H19" />
      <path d="M8.5 13h7" />
      <path d="M8.5 16.5h5" />
    </Base>
  );
}

// ── Plugin module icons ──────────────────────────────────────────────────
// One per optional tool in lib/plugins.js, plus the puzzle mark for the
// "Tools & plugins" screen itself. Deliberately distinct silhouettes: these
// sit in the same sidebar column as the core nav, so a glance has to
// separate "tasks" from "notes" without reading the label.

export function IconCheckSquare(props) {
  return (
    <Base {...props}>
      <path d="M20.5 11.5v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h9" />
      <path d="M8.5 11.5l3 3 9-9.5" />
    </Base>
  );
}

export function IconNote(props) {
  return (
    <Base {...props}>
      <path d="M19.5 4.5v9.5l-5.5 5.5H6a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 6 3.5h12a1.5 1.5 0 0 1 1.5 1Z" />
      <path d="M19.5 14H15.5a1.5 1.5 0 0 0-1.5 1.5v4" />
      <path d="M8 8.5h8" />
      <path d="M8 12h5" />
    </Base>
  );
}

export function IconWallet(props) {
  return (
    <Base {...props}>
      <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h11a2 2 0 0 1 2 2" />
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M20.5 11.5h-4a2 2 0 0 0 0 4h4" />
    </Base>
  );
}

export function IconQuote(props) {
  return (
    <Base {...props}>
      <path d="M9.5 6.5c-2.5 1-4 3.2-4 6v5h5.5v-5.5H7.5c0-1.8.8-3.2 2.5-4Z" />
      <path d="M19 6.5c-2.5 1-4 3.2-4 6v5h5.5v-5.5H17c0-1.8.8-3.2 2.5-4Z" />
    </Base>
  );
}

export function IconStar(props) {
  return (
    <Base {...props}>
      <path d="m12 4 2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.8 9.6 9Z" />
    </Base>
  );
}

export function IconPuzzle(props) {
  return (
    <Base {...props}>
      <path d="M10 3.5a2 2 0 0 1 4 0v1h3.5a1 1 0 0 1 1 1V9h1a2 2 0 0 1 0 4h-1v4.5a1 1 0 0 1-1 1H14v-1a2 2 0 0 0-4 0v1H6.5a1 1 0 0 1-1-1V13h-1a2 2 0 0 1 0-4h1V5.5a1 1 0 0 1 1-1H10Z" />
    </Base>
  );
}

export function IconCopy(props) {
  return (
    <Base {...props}>
      <rect x="9" y="9" width="11.5" height="11.5" rx="2" />
      <path d="M15 6.5V5.5a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2V13a2 2 0 0 0 2 2h1" />
    </Base>
  );
}

export function IconWhatsApp(props) {
  return (
    <Base {...props}>
      <path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.5a8.4 8.4 0 1 1 15.5-4.3Z" />
      <path d="M9 9c0 3.3 2.7 6 6 6 .6 0 1-.5 1-1v-1l-2-1-1 1a5.6 5.6 0 0 1-2-2l1-1-1-2h-1c-.6 0-1 .4-1 1Z" />
    </Base>
  );
}
