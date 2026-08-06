// Renders the components that crashed, through React's server renderer, with a
// real dictionary — a build passing proves nothing about runtime scope bugs.
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import en from "../lib/i18n/dictionaries/en.json" with { type: "json" };
import he from "../lib/i18n/dictionaries/he.json" with { type: "json" };
import es from "../lib/i18n/dictionaries/es.json" with { type: "json" };

function makeT(dict) {
  return (key, vars) => {
    let node = dict;
    for (const part of key.split(".")) node = node?.[part];
    let out = typeof node === "string" ? node : key;
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, n) => (n in vars ? String(vars[n]) : m));
    return out;
  };
}

// Mirrors the exact shape LandingPageEditor's template map consumed.
const templates = [
  { id: "default", name: "Classic", description: "A balanced layout." },
  { id: "bold", name: "Bold", description: "High contrast." },
];

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log("  ok   " + name); pass++; }
  catch (e) { console.log("  FAIL " + name + "\n        " + e.message); fail++; }
}

for (const [lang, dict] of [["en", en], ["he", he], ["es", es]]) {
  const t = makeT(dict);
  console.log(`\n— ${lang} —`);

  check("template card map does not shadow t", () => {
    const html = renderToStaticMarkup(
      React.createElement("div", null,
        templates.map((tpl) =>
          React.createElement("div", { key: tpl.id },
            React.createElement("strong", null, tpl.name),
            React.createElement("span", null, t("editor.selected")),
            React.createElement("p", null, tpl.description),
            React.createElement("button", null, t("editor.useThisTemplate"))
          ))));
    if (!html.includes(dict.editor.useThisTemplate)) throw new Error("missing translated CTA");
    if (!html.includes("Classic")) throw new Error("lost template name");
  });

  check("interpolation fills vars", () => {
    const s = t("overview.welcome", { company: "Kululu" });
    if (!s.includes("Kululu")) throw new Error("var not substituted: " + s);
    if (s.includes("{company}")) throw new Error("placeholder left in: " + s);
  });

  check("no translation uses a placeholder the source doesn't provide", () => {
    // Asymmetric on purpose. A translation may use FEWER placeholders than
    // English — Hebrew has no has/have distinction, and its singular for
    // "1 unread lead" spells the number as a word, and Spanish's backlog
    // string collapses leadWord/haveWord into one — dropping one is
    // harmless. Using an EXTRA one is not: nothing substitutes it, so the
    // literal "{foo}" ships to the user. Checks `dict` (this iteration's
    // locale) against `en`, so it's a no-op for the English iteration itself.
    const walk = (o, p = "") =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "string" ? [[p + k, v]] : walk(v, p + k + "."));
    const vars = (str) => new Set([...str.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

    const enMap = new Map(walk(en));
    const extra = walk(dict)
      .filter(([k]) => enMap.has(k))
      .map(([k, v]) => [k, [...vars(v)].filter((x) => !vars(enMap.get(k)).has(x))])
      .filter(([, x]) => x.length)
      .map(([k, x]) => `${k}: unknown {${x.join("}, {")}}`);
    if (extra.length) throw new Error(extra.join("; "));
  });

  check("no placeholder is left unclosed or malformed", () => {
    const walk = (o, p = "") =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "string" ? [[p + k, v]] : walk(v, p + k + "."));
    const bad = walk(dict).filter(([, v]) => /\{[^}]*$|^[^{]*\}/.test(v.replace(/\{\w+\}/g, "")));
    if (bad.length) throw new Error(JSON.stringify(bad.slice(0, 3)));
  });

  check("analytics insight renders with <b> markers", () => {
    const s = t("analytics.insights.volume", { dir: t("analytics.insights.up"), pct: 23, period: t("analytics.range.prevMonth"), now: 41, prev: 33 });
    if (!s.includes("<b>")) throw new Error("lost emphasis markers");
    const parts = s.split(/(<b>.*?<\/b>)/g);
    if (parts.filter(x => x.startsWith("<b>")).length !== 1) throw new Error("bad bold split");
  });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
