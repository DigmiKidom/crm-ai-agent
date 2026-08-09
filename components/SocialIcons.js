// Brand glyphs for the platforms in lib/socialLinks.js.
//
// Hand-drawn paths, in the same spirit as components/icons.js: no icon
// library, nothing fetched at runtime, and every glyph inherits currentColor
// so one component works on a dark hero, a light footer, and inside a
// dashboard input row without a variant each.
//
// Deliberately simplified marks rather than pixel-exact brand logos — they
// read at 18px, which is the size that matters here.

function Svg({ size = 20, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconWhatsApp(props) {
  return (
    <Svg {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.23 8.23 0 0 1 0 16.47Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.74 2.65 4.2 3.72.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </Svg>
  );
}

export function IconInstagram(props) {
  return (
    <Svg {...props} fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" />
    </Svg>
  );
}

export function IconFacebook(props) {
  return (
    <Svg {...props}>
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.54-1.5h1.66V3.63A22 22 0 0 0 14.3 3.5c-2.4 0-4.05 1.47-4.05 4.16V9.9H7.5V13h2.75v8h3.25Z" />
    </Svg>
  );
}

export function IconLinkedIn(props) {
  return (
    <Svg {...props}>
      <path d="M6.94 8.5H3.9V21h3.04V8.5ZM5.42 3a1.77 1.77 0 1 0 0 3.53 1.77 1.77 0 0 0 0-3.53ZM20.1 21h-3.03v-6.1c0-1.45-.03-3.32-2.02-3.32-2.03 0-2.34 1.58-2.34 3.21V21H9.68V8.5h2.9v1.71h.05c.4-.77 1.4-1.58 2.87-1.58 3.07 0 3.64 2.02 3.64 4.65V21Z" />
    </Svg>
  );
}

export function IconGitHub(props) {
  return (
    <Svg {...props}>
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85l-.01 2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </Svg>
  );
}

export function IconX(props) {
  return (
    <Svg {...props}>
      <path d="M17.53 3h3.17l-6.92 7.9L21.5 21h-5.9l-4.62-6.04L5.7 21H2.53l7.4-8.46L2.5 3h6.05l4.18 5.52L17.53 3Zm-1.11 16.1h1.75L7.66 4.8H5.78l10.64 14.3Z" />
    </Svg>
  );
}

const ICONS = {
  whatsapp: IconWhatsApp,
  instagram: IconInstagram,
  facebook: IconFacebook,
  linkedin: IconLinkedIn,
  github: IconGitHub,
  x: IconX,
};

/** Looks a glyph up by the platform key used in lib/socialLinks.js. */
export function SocialIcon({ platform, size = 20, ...rest }) {
  const Glyph = ICONS[platform];
  if (!Glyph) return null;
  return <Glyph size={size} {...rest} />;
}
