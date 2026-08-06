import styles from "./dashboard.module.css";
import { IconClock } from "./icons";

// Purely presentational — rendered straight from the lead detail page (a
// Server Component), same as MarkLeadRead's sibling pattern, so it needs no
// "use client" directive or hooks of its own.
function describeActivity(entry, t) {
  if (entry.type === "stage_change") {
    return t("leads.activity.stageChanged", {
      from: entry.fromStage || t("leads.activity.none"),
      to: entry.toStage || t("leads.activity.none"),
    });
  }
  return t("leads.activity.notesUpdated");
}

export default function LeadActivityTimeline({ activity, t, locale }) {
  return (
    <section className={styles.detailCard}>
      <h2 className={styles.sectionTitle}>{t("leads.activity.title")}</h2>

      {activity.length === 0 ? (
        <p className={styles.empty}>{t("leads.activity.empty")}</p>
      ) : (
        <ul className={styles.activityList}>
          {activity.map((entry) => (
            <li key={entry._id} className={styles.activityItem}>
              <IconClock size={13} className={styles.activityIcon} />
              <div>
                <p className={styles.activityText}>{describeActivity(entry, t)}</p>
                <span className={styles.activityMeta}>
                  {entry.actorName || t("leads.activity.unknownActor")}
                  {" · "}
                  {new Date(entry.createdAt).toLocaleString(locale === "he" ? "he-IL" : "en-US")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
