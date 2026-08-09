"use client";

import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./calendar.module.css";

// Same three-part status-token shape DESIGN_TOKENS.md documents for
// danger/success/warning/info — reused here rather than inventing new
// per-status colors. Exported so MonthGrid/AgendaList's event chips use the
// exact same status→tone mapping as the badge itself.
export const STATUS_TONE_CLASS = {
  confirmed: styles.statusSuccess,
  pending: styles.statusWarning,
  ai_followup: styles.statusInfo,
  completed: styles.statusMuted,
  cancelled: styles.statusDanger,
};

export default function EventStatusBadge({ status }) {
  const t = useT();
  return (
    <span className={`${styles.statusBadge} ${STATUS_TONE_CLASS[status] || styles.statusMuted}`}>
      {t(`calendar.status.${status}`)}
    </span>
  );
}
