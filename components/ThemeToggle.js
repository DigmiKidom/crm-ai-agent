"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./icons";
import styles from "./dashboard.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

// Local-only preference — dark mode isn't a tenant setting, it's a browser
// preference, so it's read/written straight to localStorage rather than
// going through the tenant settings API. See dashboard.module.css for how
// [data-theme="dark"] on <html> actually repaints the dashboard shell.
export default function ThemeToggle() {
  const t = useT();
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // One-time read of an attribute the beforeInteractive script in
    // app/layout.js already set on <html> pre-hydration — this mirrors that
    // external state into the component once, it doesn't cascade into
    // further renders, so the sync-setState lint rule doesn't apply cleanly
    // here the way it does for data-fetch-driven effects.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggle}
      aria-pressed={dark}
      disabled={!ready}
    >
      <span className={styles.themeToggleIcon}>
        {dark ? <IconMoon size={16} /> : <IconSun size={16} />}
      </span>
      <span>{dark ? t("theme.dark") : t("theme.light")}</span>
      <span className={styles.themeToggleTrack} data-on={dark}>
        <span className={styles.themeToggleThumb} />
      </span>
    </button>
  );
}
