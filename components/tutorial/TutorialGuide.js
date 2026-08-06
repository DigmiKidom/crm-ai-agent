"use client";

import { useState } from "react";
import FullTutorial from "./FullTutorial";
import QuickTutorial from "./QuickTutorial";
import styles from "./tutorial.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

export default function TutorialGuide({ tenantSlug }) {
  const t = useT();
  const [mode, setMode] = useState("full");

  return (
    <div>
      <div className={styles.modeToggle}>
        <button
          type="button"
          className={`${styles.modeToggleOption} ${mode === "full" ? styles.modeToggleOptionActive : ""}`}
          onClick={() => setMode("full")}
        >
          {t("tutorial.fullGuide")}
        </button>
        <button
          type="button"
          className={`${styles.modeToggleOption} ${mode === "quick" ? styles.modeToggleOptionActive : ""}`}
          onClick={() => setMode("quick")}
        >
          {t("tutorial.quickTour")}
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
