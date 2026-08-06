"use client";

import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./resume.module.css";

/**
 * The rendered CV. This is both the on-screen preview and the printed page —
 * there is no second layout for export.
 *
 * That's the whole reason PDF export is print-CSS rather than a canvas or a
 * server-side renderer: one layout means the PDF can never drift from what the
 * user approved, the text stays selectable and searchable, and Hebrew glyph
 * shaping is handled by the browser instead of a font pipeline we'd maintain.
 */
export default function ResumePreview({ resume, printRef }) {
  const t = useT();
  const dir = resume.language?.dir === "rtl" ? "rtl" : "ltr";

  const contact = [resume.email, resume.phone, resume.location, resume.website, resume.linkedin]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);

  const hasContent =
    resume.fullName ||
    resume.summary ||
    resume.experience?.length ||
    resume.education?.length ||
    resume.skills?.length;

  if (!hasContent) {
    return <p className={styles.previewEmpty}>{t("cv.emptyPreview")}</p>;
  }

  return (
    <article
      ref={printRef}
      className={styles.document}
      dir={dir}
      lang={resume.language?.code || "en"}
      // The printed sheet is the CV alone — see resume.module.css, which hides
      // everything outside this element at print time.
      data-cv-document="true"
    >
      <header className={styles.docHeader}>
        {resume.fullName && <h1 className={styles.docName}>{resume.fullName}</h1>}
        {resume.headline && <p className={styles.docHeadline}>{resume.headline}</p>}
        {contact.length > 0 && (
          <ul className={styles.docContact}>
            {contact.map((item) => (
              // Emails, phone numbers and URLs stay left-to-right even on an
              // RTL CV, or the bidi algorithm reorders their parts.
              <li key={item} className="ltr">
                {item}
              </li>
            ))}
          </ul>
        )}
      </header>

      {resume.summary && (
        <section className={styles.docSection}>
          <h2 className={styles.docSectionTitle}>{t("cv.summary")}</h2>
          <p className={styles.docSummary}>{resume.summary}</p>
        </section>
      )}

      {resume.experience?.length > 0 && (
        <section className={styles.docSection}>
          <h2 className={styles.docSectionTitle}>{t("cv.s2")}</h2>
          {resume.experience.map((role, i) => {
            const dates = [role.startDate, role.current ? t("cv.present") : role.endDate]
              .filter(Boolean)
              .join(" – ");
            return (
              <div key={i} className={styles.docEntry}>
                <div className={styles.docEntryHead}>
                  <span className={styles.docEntryTitle}>
                    {role.role || t("cv.untitledRole")}
                    {role.company && <span className={styles.docEntryOrg}> · {role.company}</span>}
                  </span>
                  {dates && <span className={styles.docEntryDates}>{dates}</span>}
                </div>
                {role.location && <p className={styles.docEntryMeta}>{role.location}</p>}
                {role.bullets?.filter(Boolean).length > 0 && (
                  <ul className={styles.docBullets}>
                    {role.bullets.filter(Boolean).map((b, bi) => (
                      <li key={bi}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      )}

      {resume.education?.length > 0 && (
        <section className={styles.docSection}>
          <h2 className={styles.docSectionTitle}>{t("cv.s3")}</h2>
          {resume.education.map((e, i) => {
            const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ");
            const degree = [e.degree, e.field].filter(Boolean).join(", ");
            return (
              <div key={i} className={styles.docEntry}>
                <div className={styles.docEntryHead}>
                  <span className={styles.docEntryTitle}>
                    {degree || e.institution}
                    {degree && e.institution && (
                      <span className={styles.docEntryOrg}> · {e.institution}</span>
                    )}
                  </span>
                  {dates && <span className={styles.docEntryDates}>{dates}</span>}
                </div>
                {e.note && <p className={styles.docEntryMeta}>{e.note}</p>}
              </div>
            );
          })}
        </section>
      )}

      {resume.skills?.length > 0 && (
        <section className={styles.docSection}>
          <h2 className={styles.docSectionTitle}>{t("cv.s4")}</h2>
          <ul className={styles.docSkills}>
            {resume.skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
