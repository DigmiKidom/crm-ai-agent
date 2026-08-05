"use client";

import { useState } from "react";
import FullTutorial from "./FullTutorial";
import QuickTutorial from "./QuickTutorial";
import styles from "./tutorial.module.css";

export default function TutorialGuide({ tenantSlug }) {
  const [mode, setMode] = useState("full");

  return (
    <div>
      <div className={styles.modeToggle}>
        <button
          type="button"
          className={`${styles.modeToggleOption} ${mode === "full" ? styles.modeToggleOptionActive : ""}`}
          onClick={() => setMode("full")}
        >
          Full guide
        </button>
        <button
          type="button"
          className={`${styles.modeToggleOption} ${mode === "quick" ? styles.modeToggleOptionActive : ""}`}
          onClick={() => setMode("quick")}
        >
          Quick tour (3 pages)
        </button>
      </div>

      {mode === "full" ? (
        <FullTutorial tenantSlug={tenantSlug} />
      ) : (
        <QuickTutorial tenantSlug={tenantSlug} />
      )}
    </div>
  );
}
