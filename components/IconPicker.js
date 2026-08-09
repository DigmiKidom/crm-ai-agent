"use client";

import { LANDING_ICONS, ICON_KEYS, LandingIcon } from "@/lib/landingIcons";
import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./dashboard.module.css";

/**
 * Grid of the 20 available feature-card icons plus a "no icon" option.
 * Controlled: `value` is an icon key ("" for none), `onChange` gets the new key.
 * Clicking the already-selected icon clears it.
 */
export default function IconPicker({ value, onChange, label }) {
  const t = useT();
  const fieldLabel = label || t("editor.featureIcon");

  return (
    <div className={styles.iconPicker}>
      <span className={styles.iconPickerLabel}>
        {fieldLabel}
        <em className={styles.iconPickerHint}>
          {" — "}
          {value && LANDING_ICONS[value] ? t(LANDING_ICONS[value].labelKey) : t("editor.icons.noneSelected")}
        </em>
      </span>

      <div className={styles.iconGrid} role="radiogroup" aria-label={fieldLabel}>
        {ICON_KEYS.map((key) => {
          const selected = value === key;
          const iconLabel = t(LANDING_ICONS[key].labelKey);
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={iconLabel}
              title={iconLabel}
              className={`${styles.iconOption} ${selected ? styles.iconOptionActive : ""}`}
              onClick={() => onChange(selected ? "" : key)}
            >
              <LandingIcon name={key} size={20} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
