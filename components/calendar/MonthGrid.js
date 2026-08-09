"use client";

import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { eachDay, isSameDay } from "@/lib/calendar";
import { STATUS_TONE_CLASS } from "./EventStatusBadge";
import styles from "./calendar.module.css";

const MAX_VISIBLE = 3;

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

export default function MonthGrid({ range, refDate, eventsByDay, onDayClick, onEventClick }) {
  const t = useT();
  const { locale } = useLocale();

  const days = eachDay(range.gridStart, range.gridEnd);
  // The grid's own first week always starts on Sunday (see
  // resolveCalendarRange), so its first 7 days ARE Sun..Sat — using them
  // for the header labels means this never drifts out of sync with a
  // reference date, and stays correct under any locale's own weekday names.
  const weekdayLabels = days.slice(0, 7).map((d) => d.toLocaleDateString(locale, { weekday: "short" }));

  const today = new Date();

  return (
    <div className={styles.monthGrid}>
      <div className={styles.monthWeekdays}>
        {weekdayLabels.map((label, i) => (
          <div key={i} className={styles.monthWeekdayCell}>
            {label}
          </div>
        ))}
      </div>
      <div className={styles.monthDays}>
        {days.map((day) => {
          const key = dayKey(day);
          const dayEvents = eventsByDay.get(key) || [];
          const inMonth = day.getMonth() === refDate.getMonth();
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              className={`${styles.monthDayCell} ${!inMonth ? styles.monthDayOutside : ""}`}
            >
              <button
                type="button"
                className={`${styles.monthDayNumber} ${isToday ? styles.monthDayNumberToday : ""}`}
                onClick={() => onDayClick(day)}
              >
                {day.getDate()}
              </button>
              <div className={styles.monthDayEvents}>
                {dayEvents.slice(0, MAX_VISIBLE).map((ev) => (
                  <button
                    key={ev._id}
                    type="button"
                    className={`${styles.monthEventChip} ${STATUS_TONE_CLASS[ev.status] || ""}`}
                    onClick={() => onEventClick(ev)}
                  >
                    {!ev.allDay && (
                      <span className={styles.monthEventTime}>
                        {new Date(ev.startAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                    <span className={styles.monthEventTitle}>{ev.title}</span>
                  </button>
                ))}
                {dayEvents.length > MAX_VISIBLE && (
                  <button type="button" className={styles.monthEventMore} onClick={() => onDayClick(day)}>
                    {t("calendar.moreEvents", { count: dayEvents.length - MAX_VISIBLE })}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
