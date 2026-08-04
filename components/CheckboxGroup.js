"use client";

import styles from "./Pills.module.css";
import { IconCheck } from "./icons";

// Multi-select pill row of toggles.
export default function CheckboxGroup({ options, values, onChange, ariaLabel }) {
  function toggle(value) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  }

  return (
    <div className={styles.group} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            className={`${styles.pill} ${styles.pillCheck} ${selected ? styles.pillSelected : ""}`}
            onClick={() => toggle(opt.value)}
          >
            {selected && <IconCheck size={13} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
