// The locale now lives in the URL, so these helpers are what every link,
// redirect and guard in the app agrees on. A bug here doesn't throw — it
// quietly serves the wrong language, or strips a tenant's landing page out of
// its own URL space, which is exactly the class of thing worth pinning down.
import assert from "node:assert/strict";
import {
  isUnlocalizedPath,
  localeHref,
  localePath,
  splitLocale,
  swapLocale,
} from "../lib/i18n/routing.js";
import { localeFromAcceptLanguage, normalizeLocale } from "../lib/i18n/config.js";

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log("  ok   " + name); pass++; }
  catch (e) { console.log("  FAIL " + name + "\n        " + e.message); fail++; }
}

console.log("\n— locale routing —");

check("splits a locale off the front of a path", () => {
  assert.deepEqual(splitLocale("/he/t/acme"), { locale: "he", rest: "/t/acme" });
  assert.deepEqual(splitLocale("/en"), { locale: "en", rest: "/" });
  assert.deepEqual(splitLocale("/login"), { locale: null, rest: "/login" });
});

check("a path segment that merely starts with a locale code is not a locale", () => {
  // /english-lessons must not be read as /en + "glish-lessons".
  assert.deepEqual(splitLocale("/english-lessons"), { locale: null, rest: "/english-lessons" });
  assert.deepEqual(splitLocale("/hebrew"), { locale: null, rest: "/hebrew" });
});

check("prefixes an app path", () => {
  assert.equal(localePath("he", "/login"), "/he/login");
  assert.equal(localePath("he", "/"), "/he");
  assert.equal(localePath("en", "/t/acme/leads"), "/en/t/acme/leads");
});

check("prefixing is idempotent", () => {
  // Link renders hrefs that may already carry a locale; doing it twice must
  // not produce /he/he/login.
  assert.equal(localePath("he", "/he/login"), "/he/login");
  assert.equal(localePath("he", localePath("he", "/login")), "/he/login");
});

check("switching language keeps the page", () => {
  assert.equal(swapLocale("/he/t/acme/leads", "en"), "/en/t/acme/leads");
  assert.equal(swapLocale("/en", "he"), "/he");
});

check("an unknown locale falls back rather than landing in the URL", () => {
  assert.equal(localePath("fr", "/login"), "/en/login");
  assert.equal(normalizeLocale("fr"), "en");
});

check("tenant-owned routes never get a locale", () => {
  // A landing page is written in the tenant's content language; prefixing it
  // would both mislabel it and split one page across three URLs for search.
  for (const path of ["/pages/acme", "/l/acme", "/cv/abc123", "/custom-domain", "/suspended"]) {
    assert.equal(isUnlocalizedPath(path), true, path);
    assert.equal(localePath("he", path), path, path);
  }
});

check("API routes never get a locale", () => {
  assert.equal(isUnlocalizedPath("/api/leads"), true);
  assert.equal(localePath("he", "/api/leads"), "/api/leads");
});

check("framework paths are left alone", () => {
  assert.equal(isUnlocalizedPath("/_next/static/chunk.js"), true);
  assert.equal(isUnlocalizedPath("/favicon.ico"), true);
});

check("a prefix is not a path segment", () => {
  // /pagesomething is not under /pages.
  assert.equal(isUnlocalizedPath("/pagesomething"), false);
  assert.equal(localePath("he", "/pagesomething"), "/he/pagesomething");
});

check("query and hash survive prefixing", () => {
  assert.equal(localeHref("he", "/leads?status=open"), "/he/leads?status=open");
  assert.equal(localeHref("he", "/#features"), "/he#features");
  assert.equal(localeHref("he", "/t/acme?a=1#top"), "/he/t/acme?a=1#top");
});

check("external and non-path hrefs pass straight through", () => {
  assert.equal(localeHref("he", "https://wa.me/972500000000"), "https://wa.me/972500000000");
  assert.equal(localeHref("he", "mailto:hi@example.com"), "mailto:hi@example.com");
  assert.equal(localeHref("he", "#section"), "#section");
});

check("the redirect target for a bare URL follows Accept-Language", () => {
  assert.equal(localeFromAcceptLanguage("he-IL,he;q=0.9,en;q=0.8"), "he");
  assert.equal(localeFromAcceptLanguage("iw"), "he"); // legacy Hebrew tag
  assert.equal(localeFromAcceptLanguage("fr-FR,fr;q=0.9"), "en");
  assert.equal(localeFromAcceptLanguage(null), "en");
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
