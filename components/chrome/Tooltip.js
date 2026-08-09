"use client";

import { useId, useState } from "react";
import { IconInfo } from "@/components/icons";
import styles from "./chrome.module.css";

/**
 * A small info-icon trigger that reveals a text bubble on hover OR keyboard
 * focus (never mouse-only — a hover-only tooltip is unreachable by keyboard,
 * which is exactly the kind of gap ACCESSIBILITY.md's audit was written to
 * catch). `aria-describedby` links the trigger to the bubble so a screen
 * reader announces the tooltip content when the trigger receives focus,
 * not just visually.
 */
export default function Tooltip({ text }) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span className={styles.tooltipWrap}>
      <button
        type="button"
        className={styles.tooltipTrigger}
        aria-describedby={visible ? id : undefined}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onKeyDown={(e) => e.key === "Escape" && setVisible(false)}
      >
        <IconInfo size={14} />
      </button>
      {visible && (
        <span role="tooltip" id={id} className={styles.tooltipBubble}>
          {text}
        </span>
      )}
    </span>
  );
}
