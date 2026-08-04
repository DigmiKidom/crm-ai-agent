"use client";

import styles from "./Pills.module.css";

// Single-select pill row (radio-group behavior).
export default function PillGroup({ options, value, onChange, ariaLabel }) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`${styles.pill} ${selected ? styles.pillSelected : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
