// Icon library offered to tenants for their landing page feature cards.
//
// Same house style as components/icons.js — 24x24 viewBox, currentColor,
// rounded 1.75 strokes — so a tenant's page never looks like a mix of icon
// sets. Each entry is stored on the tenant as its key string only; the SVG
// paths never touch the database.
//
// Keys are permanent. Renaming one orphans every card already using it.

export const LANDING_ICONS = {
  coin: {
    labelKey: "editor.icons.coin",
    paths: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <path d="M12 7.25v9.5" />
        <path d="M14.5 9.5h-3.75a1.75 1.75 0 0 0 0 3.5h2.5a1.75 1.75 0 0 1 0 3.5H9.5" />
      </>
    ),
  },
  thumbsUp: {
    labelKey: "editor.icons.thumbsUp",
    paths: (
      <>
        <path d="M7 10.5v9" />
        <path d="M7 11.5l3.5-7A2 2 0 0 1 14 5.9V10h4.4a2 2 0 0 1 1.96 2.4l-1.2 6A2 2 0 0 1 17.2 20H9a2 2 0 0 1-2-2" />
      </>
    ),
  },
  shield: {
    labelKey: "editor.icons.shield",
    paths: (
      <>
        <path d="M12 3.5l7 2.75v5.25c0 4.2-2.85 7.4-7 8.75-4.15-1.35-7-4.55-7-8.75V6.25L12 3.5Z" />
        <path d="M9 12l2.25 2.25L15.25 10" />
      </>
    ),
  },
  star: {
    labelKey: "editor.icons.star",
    paths: <path d="M12 4l2.45 5.05 5.55.8-4 3.9.95 5.5L12 16.65 7.05 19.25 8 13.75l-4-3.9 5.55-.8L12 4Z" />,
  },
  clock: {
    labelKey: "editor.icons.clock",
    paths: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  heart: {
    labelKey: "editor.icons.heart",
    paths: (
      <path d="M12 19.5s-7-4.2-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10.5c0 4.8-7 9-7 9Z" />
    ),
  },
  bolt: {
    labelKey: "editor.icons.bolt",
    paths: <path d="M13.5 3.5L5.5 13.5h5.5l-1 7 8-10h-5.5l1-7Z" />,
  },
  chat: {
    labelKey: "editor.icons.chat",
    paths: (
      <>
        <path d="M20.5 12.75c0 3.6-3.8 6.5-8.5 6.5a10.4 10.4 0 0 1-2.6-.32L4.5 20.5l1.15-3.4A6.6 6.6 0 0 1 3.5 12.75c0-3.6 3.8-6.5 8.5-6.5s8.5 2.9 8.5 6.5Z" />
      </>
    ),
  },
  truck: {
    labelKey: "editor.icons.truck",
    paths: (
      <>
        <path d="M2.75 7h10.5v9.5H2.75z" />
        <path d="M13.25 10.5h3.9l3.1 3.1v2.9h-7z" />
        <circle cx="7" cy="18" r="1.75" />
        <circle cx="17" cy="18" r="1.75" />
      </>
    ),
  },
  award: {
    labelKey: "editor.icons.award",
    paths: (
      <>
        <circle cx="12" cy="9.25" r="5.25" />
        <path d="M8.75 13.75L7.5 20.5l4.5-2.4 4.5 2.4-1.25-6.75" />
      </>
    ),
  },
  lock: {
    labelKey: "editor.icons.lock",
    paths: (
      <>
        <rect x="4.75" y="10.5" width="14.5" height="9.25" rx="1.75" />
        <path d="M8.25 10.5V7.75a3.75 3.75 0 0 1 7.5 0v2.75" />
      </>
    ),
  },
  chart: {
    labelKey: "editor.icons.chart",
    paths: (
      <>
        <path d="M4 19.5h16" />
        <path d="M7 19.5v-5.25" />
        <path d="M12 19.5V8" />
        <path d="M17 19.5v-8.5" />
      </>
    ),
  },
  phone: {
    labelKey: "editor.icons.phone",
    paths: (
      <path d="M6.5 4.5h3l1.5 3.75-2 1.25a10.5 10.5 0 0 0 5 5l1.25-2L19 14v3a2 2 0 0 1-2.15 2A14.5 14.5 0 0 1 4.5 6.65 2 2 0 0 1 6.5 4.5Z" />
    ),
  },
  handshake: {
    labelKey: "editor.icons.handshake",
    paths: (
      <>
        <path d="M2.75 12.5l3-3 4.25 1.5 2 2 2 2" />
        <path d="M21.25 12.5l-3-3-4.25 1.5" />
        <path d="M10 11l-2.25 2.25a1.6 1.6 0 0 0 2.25 2.25L12 13.75" />
        <path d="M12 13.75l1.75 1.75a1.6 1.6 0 0 0 2.25-2.25" />
      </>
    ),
  },
  leaf: {
    labelKey: "editor.icons.leaf",
    paths: (
      <>
        <path d="M20 4.5c0 8-4.75 12.25-10 12.25a5.5 5.5 0 0 1-5.5-5.5C4.5 7 9.5 4.5 20 4.5Z" />
        <path d="M4.5 20c2.5-5.5 6.5-9 12-11" />
      </>
    ),
  },
  target: {
    labelKey: "editor.icons.target",
    paths: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
  },
  tools: {
    labelKey: "editor.icons.tools",
    paths: (
      <>
        <path d="M14.5 6.5a3.75 3.75 0 0 0 4.9 4.9L21 13l-8 8-2.5-2.5" />
        <path d="M9.5 4.5L4 10l3 3 5.5-5.5" />
        <path d="M4.5 16.5l3 3" />
      </>
    ),
  },
  globe: {
    labelKey: "editor.icons.globe",
    paths: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <path d="M3.75 12h16.5" />
        <path d="M12 3.75c2.25 2.4 3.4 5.25 3.4 8.25S14.25 17.85 12 20.25c-2.25-2.4-3.4-5.25-3.4-8.25S9.75 6.15 12 3.75Z" />
      </>
    ),
  },
  calendar: {
    labelKey: "editor.icons.calendar",
    paths: (
      <>
        <rect x="4" y="5.5" width="16" height="14.5" rx="1.75" />
        <path d="M4 10h16" />
        <path d="M8.5 3.5v4" />
        <path d="M15.5 3.5v4" />
      </>
    ),
  },
  gift: {
    labelKey: "editor.icons.gift",
    paths: (
      <>
        <rect x="3.5" y="9" width="17" height="4" rx="1" />
        <path d="M5.25 13v6a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5v-6" />
        <path d="M12 9v11.5" />
        <path d="M12 9S10.5 4.5 8.25 4.5a2.25 2.25 0 0 0 0 4.5H12Z" />
        <path d="M12 9s1.5-4.5 3.75-4.5a2.25 2.25 0 0 1 0 4.5H12Z" />
      </>
    ),
  },
};

export const ICON_KEYS = Object.keys(LANDING_ICONS);

export function isValidIconKey(key) {
  return key === "" || Object.hasOwn(LANDING_ICONS, key);
}

/**
 * Renders a landing icon by key. Returns null for an unknown or empty key so
 * callers can drop it in unconditionally.
 */
export function LandingIcon({ name, size = 28, strokeWidth = 1.75, className, ...rest }) {
  const icon = LANDING_ICONS[name];
  if (!icon) return null;

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
      {icon.paths}
    </svg>
  );
}
