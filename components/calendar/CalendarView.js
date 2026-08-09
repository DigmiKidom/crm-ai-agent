"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { resolveCalendarRange, shiftRef, formatRangeLabel, VIEWS, DEFAULT_VIEW } from "@/lib/calendar";
import MonthGrid from "./MonthGrid";
import AgendaList from "./AgendaList";
import EventForm from "./EventForm";
import { IconArrowLeft, IconArrowRight, IconPlus, IconCalendar } from "@/components/icons";
import styles from "./calendar.module.css";

export default function CalendarView({ tenantSlug, leads, contacts }) {
  const t = useT();
  const { locale } = useLocale();

  const [view, setView] = useState(DEFAULT_VIEW);
  const [refDate, setRefDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formState, setFormState] = useState(null); // null | { event } | { defaultStart }

  const range = useMemo(() => resolveCalendarRange(view, refDate), [view, refDate]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        from: range.gridStart.toISOString(),
        to: range.gridEnd.toISOString(),
      });
      const res = await fetch(`/api/calendar/events?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("calendar.loadFailed"));
        setEvents([]);
        return;
      }
      setEvents(data.events || []);
    } catch {
      setError(t("calendar.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [range.gridStart, range.gridEnd, t]);

  useEffect(() => {
    // Data load driven by the view/range changing — same pattern (and same
    // lint accommodation) as the contacts page's initial-load effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, [loadEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      // A multi-day (or all-day) event is filed under every day it
      // overlaps, not just its start day, so it shows up when browsing any
      // of those days.
      const start = new Date(ev.startAt);
      const end = new Date(ev.endAt);
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const stopAt = new Date(end);
      while (cursor <= stopAt) {
        const key = cursor.toISOString().slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(ev);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  function openNewEvent(defaultStart) {
    setFormState({ defaultStart });
  }

  function openEditEvent(event) {
    setFormState({ event });
  }

  function closeForm() {
    setFormState(null);
  }

  function handleSaved(event) {
    setEvents((current) => {
      const exists = current.some((e) => e._id === event._id);
      return exists ? current.map((e) => (e._id === event._id ? event : e)) : [...current, event];
    });
    closeForm();
  }

  function handleDeleted(id) {
    setEvents((current) => current.filter((e) => e._id !== id));
    closeForm();
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarNav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setRefDate((d) => shiftRef(view, d, -1))}
            aria-label={t("calendar.previous")}
          >
            <IconArrowLeft size={14} className="dirFlip" />
          </button>
          <button type="button" className={styles.todayButton} onClick={() => setRefDate(new Date())}>
            {t("calendar.today")}
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setRefDate((d) => shiftRef(view, d, 1))}
            aria-label={t("calendar.next")}
          >
            <IconArrowRight size={14} className="dirFlip" />
          </button>
          <h2 className={styles.rangeLabel}>{formatRangeLabel(view, refDate, locale)}</h2>
        </div>

        <div className={styles.toolbarActions}>
          <div className={styles.viewSwitch} role="radiogroup" aria-label={t("calendar.viewLabel")}>
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={v === view}
                className={`${styles.viewOption} ${v === view ? styles.viewOptionActive : ""}`}
                onClick={() => setView(v)}
              >
                {t(`calendar.view.${v}`)}
              </button>
            ))}
          </div>
          <button type="button" className={styles.newEventButton} onClick={() => openNewEvent(new Date())}>
            <IconPlus size={14} />
            {t("calendar.newEvent")}
          </button>
        </div>
      </div>

      {error && (
        <p className={styles.loadError} role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className={styles.loadingNote}>{t("common.loading")}</p>
      ) : events.length === 0 ? (
        <div className={styles.emptyState}>
          <IconCalendar size={28} />
          <p>{t("calendar.emptyState")}</p>
          <button type="button" className={styles.newEventButton} onClick={() => openNewEvent(new Date())}>
            <IconPlus size={14} />
            {t("calendar.newEvent")}
          </button>
        </div>
      ) : view === "month" ? (
        <MonthGrid
          range={range}
          refDate={refDate}
          eventsByDay={eventsByDay}
          onDayClick={(day) => openNewEvent(day)}
          onEventClick={openEditEvent}
        />
      ) : (
        <AgendaList
          range={range}
          eventsByDay={eventsByDay}
          onDayClick={(day) => openNewEvent(day)}
          onEventClick={openEditEvent}
        />
      )}

      {formState && (
        <EventForm
          initialEvent={formState.event}
          defaultStart={formState.defaultStart}
          leads={leads}
          contacts={contacts}
          tenantSlug={tenantSlug}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
