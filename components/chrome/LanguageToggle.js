"use client";

import { LOCALE_META } from "@/lib/i18n/config";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { IconCheck, IconGlobe } from "@/components/icons";
import useMenu from "./useMenu";
import styles from "./chrome.module.css";

/**
 * Globe button that opens the language list.
 *
 * A menu rather than a two-way switch: the list grows with each locale added
 * to LOCALE_META without any layout rework, and it shows every option's name
 * in its own script — a Hebrew speaker looking at an English UI sees "עברית",
 * not a two-letter code they have to decode.
 *
 * `role="menuitemradio"` (not `menuitem`) is what tells a screen reader these
 * are mutually exclusive and which one is currently chosen.
 */
export default function LanguageToggle({ showLabel = false }) {
  const { locale, locales, setLocale, t } = useLocale();
  const { open, close, menuProps, triggerProps, rootRef } = useMenu();

  const current = LOCALE_META[locale];

  function choose(code) {
    if (code !== locale) setLocale(code);
    close({ restoreFocus: true });
  }

  return (
    <div className={styles.langMenu} ref={rootRef}>
      <button
        type="button"
        {...triggerProps}
        className={styles.langButton}
        // The globe alone is ambiguous to a screen reader, so the accessible
        // name always spells out the control and its current value.
        aria-label={`${t("language.label")}: ${current.label}`}
        title={`${t("language.label")}: ${current.label}`}
      >
        <IconGlobe size={17} />
        {showLabel && <span className={styles.langButtonLabel}>{current.shortLabel}</span>}
      </button>

      {open && (
        <div
          {...menuProps}
          className={`${styles.menu} ${styles.menuNarrow}`}
          aria-label={t("language.label")}
        >
          <div className={styles.menuHeader}>
            <span className={styles.menuHeaderLabel}>{t("language.label")}</span>
          </div>

          <div className={styles.menuGroup}>
            {locales.map((code) => {
              const meta = LOCALE_META[code];
              const isActive = code === locale;
              return (
                <button
                  key={code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  className={styles.menuItem}
                  onClick={() => choose(code)}
                  // Each option renders in its own direction, so Hebrew reads
                  // right-to-left inside an otherwise English menu.
                  dir={meta.dir}
                  lang={meta.htmlLang}
                >
                  <span className={styles.langOptionName}>{meta.label}</span>
                  <span className={styles.langOptionCode}>{meta.shortLabel}</span>
                  {isActive && (
                    <IconCheck size={15} className={styles.menuItemCheck} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
