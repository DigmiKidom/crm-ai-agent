"use client";

import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { eachDay, isSameDay } from "@/lib/calendar";
import EventStatusBadge from "./EventStatusBadge";
import styles from "./calendar.module.css";

/**
 * Chronological, grouped-by-day list — powers both the week and day views.
 * Driven entirely by `range.gridStart`/`gridEnd` (1 day for the day view, 7
 * for the week view), so this component doesn't need to know which one
 * it's rendering.
 */
export default function AgendaList({ range, eventsByDay, onEventClick, onDayClick }) {
  const t = useT();
  const { locale } = useLocale();
  const days = eachDay(range.gridStart, range.gridEnd);
  const today = new Date();

  return (
    <div className={styles.agendaList}>
      {days.map((day) => {
        const key = day.toISOString().slice(0, 10);
        const dayEvents = (eventsByDay.get(key) || [])
          .slice()
          .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
        const isToday = isSameDay(day, today);

        return (
          <div key={key} className={styles.agendaDayGroup}>
            <div className={styles.agendaDayHeader}>
              <span className={isToday ? styles.agendaDayHeaderToday : ""}>
                {day.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })}
              </span>
              <button type="button" className={styles.agendaAddButton} onClick={() => onDayClick(day)}>
                + {t("calendar.addEvent")}
              </button>
            </div>

            {dayEvents.length === 0 ? (
              <p className={styles.agendaEmpty}>{t("calendar.noEventsDay")}</p>
            ) : (
              <div className={styles.agendaEvents}>
                {dayEvents.map((ev) => (
                  <button
                    key={ev._id}
                    type="button"
                    className={styles.agendaEventRow}
                    onClick={() => onEventClick(ev)}
                  >
                    <span className={styles.agendaEventTime}>
                      {ev.allDay
                        ? t("calendar.allDay")
                        : new Date(ev.startAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span className={styles.agendaEventTitle}>{ev.title}</span>
                    {ev.relatedName && (
                      <span className={styles.agendaEventRelated}>{ev.relatedName}</span>
                    )}
                    <EventStatusBadge status={ev.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
