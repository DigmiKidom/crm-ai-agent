"use client";

import styles from "./Pills.module.css";
import { IconCheck } from "./icons";

export default function ColorSwatchGroup({ options, value, onChange, ariaLabel }) {
  return (
    <div className={styles.swatchRow} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const selected = value.toLowerCase() === opt.value.toLowerCase();
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.label}
            title={opt.label}
            className={`${styles.swatch} ${selected ? styles.swatchSelected : ""}`}
            style={{ background: opt.value }}
            onClick={() => onChange(opt.value)}
          >
            {selected && <IconCheck size={15} style={{ color: "white" }} />}
          </button>
        );
      })}
    </div>
  );
}
