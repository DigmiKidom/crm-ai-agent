// Server/client boundary checks.
//
// These catch the failure mode that neither `next build` nor ESLint sees: a
// component that calls a client-only hook without a "use client" directive
// compiles fine and only explodes when the route is requested. RangePicker and
// DeltaBadge both shipped that way — server components calling useT(), which
// reads React context that doesn't exist on the server.
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components"];

const CLIENT_HOOKS =
  /\b(useT|useLocale|useState|useEffect|useLayoutEffect|useReducer|useContext|useId|useRouter|usePathname|useSearchParams|useSession|useSyncExternalStore)\s*\(/g;

// Hooks that are legitimate in either environment aren't listed above:
// useRef/useCallback/useMemo are only meaningful in a client render, but they
// don't throw on the server, so flagging them would be noise.

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.name.endsWith(".js") ? [full] : [];
  });
}

/** Strips comments and string literals so prose can't trigger a match. */
function stripNonCode(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
}

const isClient = (src) => /^\s*["']use client["']/.test(src);

let pass = 0;
const failures = [];
const check = (name, fn) => {
  try {
    fn();
    console.log("  ok   " + name);
    pass++;
  } catch (e) {
    console.log("  FAIL " + name + "\n        " + e.message);
    failures.push(name);
  }
};

const files = ROOTS.flatMap(walk).filter((f) => !f.includes(`${path.sep}api${path.sep}`));

check("no server component calls a client-only hook", () => {
  const bad = [];
  for (const f of files) {
    const raw = fs.readFileSync(f, "utf8");
    if (isClient(raw)) continue;
    // The module that defines the hook is obviously exempt.
    if (/export function useT\b/.test(raw)) continue;
    const hits = [...new Set([...stripNonCode(raw).matchAll(CLIENT_HOOKS)].map((m) => m[1]))];
    if (hits.length) bad.push(`${f} -> ${hits.join(", ")}`);
  }
  if (bad.length) throw new Error(`${bad.length} file(s):\n        ` + bad.join("\n        "));
});

check("every file calling useT()/useLocale() imports it", () => {
  const bad = [];
  for (const f of files) {
    const src = stripNonCode(fs.readFileSync(f, "utf8"));
    const raw = fs.readFileSync(f, "utf8");
    if (/export function useT\b/.test(raw)) continue;
    for (const hook of ["useT", "useLocale"]) {
      if (new RegExp(`\\b${hook}\\s*\\(`).test(src) && !new RegExp(`import[^;]*\\b${hook}\\b`).test(raw)) {
        bad.push(`${f} -> ${hook} used without import`);
      }
    }
  }
  if (bad.length) throw new Error(bad.join("\n        "));
});

check("every file calling getServerT() imports it and is not a client component", () => {
  const bad = [];
  for (const f of files) {
    const raw = fs.readFileSync(f, "utf8");
    if (!/\bgetServerT\s*\(/.test(stripNonCode(raw))) continue;
    if (!/import[^;]*getServerT/.test(raw)) bad.push(`${f} -> used without import`);
    if (isClient(raw)) bad.push(`${f} -> getServerT() in a "use client" file`);
  }
  if (bad.length) throw new Error(bad.join("\n        "));
});

check("no client component imports the server-only i18n module", () => {
  const bad = files.filter((f) => {
    const raw = fs.readFileSync(f, "utf8");
    return isClient(raw) && /from "@\/lib\/i18n\/server"/.test(raw);
  });
  if (bad.length) throw new Error(bad.join("\n        "));
});

check("no client component imports a Mongoose model", () => {
  // A "use client" file importing lib/models/* pulls Mongoose — and its
  // node-only `async_hooks` dependency — into the browser bundle, which fails
  // the build. Constants a client needs must live in a model-free module
  // (e.g. lib/resumeLimits.js).
  const bad = files.filter((f) => {
    const raw = fs.readFileSync(f, "utf8");
    return isClient(raw) && /from ["']@\/lib\/models\//.test(raw);
  });
  if (bad.length) throw new Error(bad.join("\n        "));
});

check("no client component imports server-only modules", () => {
  const SERVER_ONLY = ["@/lib/db", "@/auth", "@/lib/agent", "@/lib/resumeAgent", "@/lib/analytics"];
  const bad = [];
  for (const f of files) {
    const raw = fs.readFileSync(f, "utf8");
    if (!isClient(raw)) continue;
    for (const mod of SERVER_ONLY) {
      // lib/analytics exports pure constants used by RangePicker, so only the
      // data-fetching entry point is off-limits.
      const re = new RegExp(`from ["']${mod.replace("/", "\\/")}["']`);
      if (re.test(raw) && !(mod === "@/lib/analytics" && !/getAnalytics/.test(raw))) {
        bad.push(`${f} -> ${mod}`);
      }
    }
  }
  if (bad.length) throw new Error(bad.join("\n        "));
});

check("no untranslated user-facing English in UI components", () => {
  // The earlier version of this scan only matched single-line JSX text nodes,
  // which is how 19 line-wrapped strings shipped untranslated. Both shapes are
  // checked now.
  const SKIP = /\/api\/|terms\/page\.js|\/i18n\/|icons\.js/;
  const BRANDS = /Ceramony|Facebook|Instagram|LinkedIn|Twitter/;
  const PATTERNS = [
    />\s*\n\s+([A-Z][a-z][^<>{}]{8,}?)\s*\n\s*<\//gs,
    />([A-Z][a-z][^<>{}\n]{4,})</g,
    /placeholder="([A-Z][^"]*)"/g,
    /aria-label="([A-Z][^"]*)"/g,
  ];
  const bad = [];
  for (const f of files) {
    if (SKIP.test(f)) continue;
    const src = fs.readFileSync(f, "utf8");
    for (const re of PATTERNS) {
      for (const m of src.matchAll(re)) {
        const text = m[1].split(/\s+/).join(" ");
        if (BRANDS.test(text)) continue;
        bad.push(`${f}: "${text.slice(0, 60)}"`);
      }
    }
  }
  if (bad.length) throw new Error(`${bad.length} string(s):\n        ` + bad.slice(0, 10).join("\n        "));
});

console.log(`\n${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
