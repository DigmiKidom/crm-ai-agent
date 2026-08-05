"use client";

import { LANDING_ICONS, ICON_KEYS, LandingIcon } from "@/lib/landingIcons";
import styles from "./dashboard.module.css";

/**
 * Grid of the 20 available feature-card icons plus a "no icon" option.
 * Controlled: `value` is an icon key ("" for none), `onChange` gets the new key.
 * Clicking the already-selected icon clears it.
 */
export default function IconPicker({ value, onChange, label = "Icon" }) {
  return (
    <div className={styles.iconPicker}>
      <span className={styles.iconPickerLabel}>
        {label}
        {value && LANDING_ICONS[value] ? (
          <em className={styles.iconPickerHint}> — {LANDING_ICONS[value].label}</em>
        ) : (
          <em className={styles.iconPickerHint}> — none selected</em>
        )}
      </span>

      <div className={styles.iconGrid} role="radiogroup" aria-label={label}>
        {ICON_KEYS.map((key) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={LANDING_ICONS[key].label}
              title={LANDING_ICONS[key].label}
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
