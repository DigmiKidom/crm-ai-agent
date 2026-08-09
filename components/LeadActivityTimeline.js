import styles from "./dashboard.module.css";
import { IconClock, IconInbox, IconCalendar, IconClose, IconSparkles, IconCheck } from "./icons";
import { formatMoney } from "@/lib/money";

// Purely presentational — rendered straight from the lead detail page (a
// Server Component), same as MarkLeadRead's sibling pattern, so it needs no
// "use client" directive or hooks of its own.

// A small icon per event type — the closest thing this timeline has to the
// "status badges" the CRM-deepening brief asked for: at a glance, a scan
// down the list shows what KIND of thing happened before reading any text.
const TYPE_ICON = {
  lead_captured: IconInbox,
  stage_change: IconClock,
  notes_updated: IconClock,
  meeting_scheduled: IconCalendar,
  meeting_cancelled: IconClose,
  ai_reply_drafted: IconSparkles,
  deal_won: IconCheck,
  deal_lost: IconClose,
};

function describeActivity(entry, t, locale, currency) {
  switch (entry.type) {
    case "lead_captured":
      return t("leads.activity.captured");
    case "stage_change":
      return t("leads.activity.stageChanged", {
        from: entry.fromStage || t("leads.activity.none"),
        to: entry.toStage || t("leads.activity.none"),
      });
    case "meeting_scheduled":
      return t("leads.activity.meetingScheduled", {
        title: entry.meetingTitle || t("calendar.newEvent"),
        date: entry.meetingStartAt
          ? new Date(entry.meetingStartAt).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
              month: "short",
              day: "numeric",
            })
          : "",
      });
    case "meeting_cancelled":
      return t("leads.activity.meetingCancelled", { title: entry.meetingTitle || t("calendar.newEvent") });
    case "ai_reply_drafted":
      return t("leads.activity.aiReplyDrafted");
    case "deal_won":
      return entry.dealValue > 0
        ? t("leads.activity.dealWon", { amount: formatMoney(entry.dealValue, currency, locale) })
        : t("leads.activity.dealWonNoValue");
    case "deal_lost":
      return t("leads.activity.dealLost");
    default:
      return t("leads.activity.notesUpdated");
  }
}

export default function LeadActivityTimeline({ activity, t, locale, currency = "USD" }) {
  return (
    <section className={styles.detailCard}>
      <h2 className={styles.sectionTitle}>{t("leads.activity.title")}</h2>

      {activity.length === 0 ? (
        <p className={styles.empty}>{t("leads.activity.empty")}</p>
      ) : (
        <ul className={styles.activityList}>
          {activity.map((entry) => {
            const Icon = TYPE_ICON[entry.type] || IconClock;
            // A visitor filling out a public form isn't signed in, so
            // lead_captured has no human actor — showing "Someone" there
            // would misleadingly suggest a teammate did something.
            const showActor = entry.type !== "lead_captured";
            return (
              <li key={entry._id} className={styles.activityItem}>
                <Icon size={13} className={styles.activityIcon} />
                <div>
                  <p className={styles.activityText}>{describeActivity(entry, t, locale, currency)}</p>
                  <span className={styles.activityMeta}>
                    {showActor && (
                      <>
                        {entry.actorName || t("leads.activity.unknownActor")}
                        {" · "}
                      </>
                    )}
                    {new Date(entry.createdAt).toLocaleString(locale === "he" ? "he-IL" : "en-US")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
