"use client";

import { useCallback } from "react";
import LocaleProvider, { useT } from "@/components/i18n/LocaleProvider";
import ResumePreview from "@/components/resume/ResumePreview";
import styles from "./page.module.css";

function PublicCvContent({ resume, tenantName }) {
  const t = useT();
  // Same print-CSS export the builder uses (see ResumePreview / resume.module.css)
  // — no separate render path, so this can never drift from what's on screen.
  const handlePrint = useCallback(() => window.print(), []);

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <span className={styles.via}>
          {tenantName ? t("cv.publicVia", { tenantName }) : ""}
        </span>
        <button type="button" className={styles.printButton} onClick={handlePrint}>
          {t("cv.exportPdf")}
        </button>
      </div>
      <div className={styles.sheet}>
        <ResumePreview resume={resume} />
      </div>
    </div>
  );
}

// A nested provider scoped to this one page, same pattern as the tenant
// dashboard layout and the public landing page: the CV's own content
// language drives the chrome (section headings, the print button label),
// independent of whatever the visitor's browser/cookie locale is. Falls back
// to English for any content language outside the two the product UI
// dictionary supports, same graceful degradation as everywhere else.
export default function PublicCvView({ resume, tenantName }) {
  const locale = resume.language?.code === "he" ? "he" : "en";

  return (
    <LocaleProvider initialLocale={locale}>
      <PublicCvContent resume={resume} tenantName={tenantName} />
    </LocaleProvider>
  );
}
