"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { MEETING_TYPES, MEETING_STATUSES } from "@/lib/meetingConstants";
import { IconClose, IconTrash, IconCheck, IconSearch } from "@/components/icons";
import styles from "./calendar.module.css";
import dash from "@/components/dashboard.module.css";
import Link from "@/components/i18n/Link";

// datetime-local inputs read/write local time with no timezone suffix —
// toISOString() is UTC, so it can't be used directly here or every save
// would silently shift by the viewer's UTC offset.
function toLocalInputValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateInputValue(date) {
  return toLocalInputValue(date).slice(0, 10);
}

function addOneHour(date) {
  return new Date(new Date(date).getTime() + 60 * 60 * 1000);
}

/** Lightweight search-and-pick for linking a meeting to an existing Lead or Contact — no combobox library, just a filtered list under a text input. */
function RelatedPicker({ leads, contacts, value, onChange }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [
      ...leads.map((l) => ({ kind: "lead", id: l._id, name: l.name })),
      ...contacts.map((c) => ({ kind: "contact", id: c._id, name: c.name })),
    ];
    if (!q) return all.slice(0, 8);
    return all.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [leads, contacts, query]);

  if (value) {
    return (
      <div className={styles.relatedChip}>
        <span className={styles.relatedChipKind}>
          {t(value.kind === "lead" ? "calendar.kindLead" : "calendar.kindContact")}
        </span>
        <span>{value.name}</span>
        <button type="button" onClick={() => onChange(null)} aria-label={t("common.cancel")}>
          <IconClose size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.relatedPicker}>
      <div className={styles.relatedPickerInput}>
        <IconSearch size={14} />
        <input
          placeholder={t("calendar.searchLeadsContacts")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && options.length > 0 && (
        <div className={styles.relatedPickerMenu}>
          {options.map((o) => (
            <button
              key={`${o.kind}-${o.id}`}
              type="button"
              className={styles.relatedPickerOption}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className={styles.relatedChipKind}>
                {t(o.kind === "lead" ? "calendar.kindLead" : "calendar.kindContact")}
              </span>
              <span>{o.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventForm({
  initialEvent,
  defaultStart,
  leads,
  contacts,
  tenantSlug,
  onSaved,
  onDeleted,
  onClose,
}) {
  const t = useT();
  const isEditing = Boolean(initialEvent?._id);

  const start = initialEvent ? new Date(initialEvent.startAt) : defaultStart || new Date();
  const end = initialEvent ? new Date(initialEvent.endAt) : addOneHour(start);

  const [form, setForm] = useState({
    title: initialEvent?.title || "",
    type: initialEvent?.type || "meeting",
    status: initialEvent?.status || "confirmed",
    allDay: Boolean(initialEvent?.allDay),
    startAt: start,
    endAt: end,
    location: initialEvent?.location || "",
    notes: initialEvent?.notes || "",
  });
  const [related, setRelated] = useState(
    initialEvent?.relatedKind
      ? { kind: initialEvent.relatedKind, id: initialEvent.relatedLead || initialEvent.relatedContact, name: initialEvent.relatedName }
      : null
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      title: form.title,
      type: form.type,
      status: form.status,
      allDay: form.allDay,
      startAt: form.startAt.toISOString(),
      endAt: form.endAt.toISOString(),
      location: form.location,
      notes: form.notes,
      relatedLeadId: related?.kind === "lead" ? related.id : null,
      relatedContactId: related?.kind === "contact" ? related.id : null,
    };

    const url = isEditing ? `/api/calendar/events/${initialEvent._id}` : "/api/calendar/events";
    const res = await fetch(url, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error || t("calendar.saveFailed"));
      return;
    }
    onSaved(data.event);
  }

  async function handleDelete() {
    if (!confirm(t("calendar.confirmDelete", { title: form.title }))) return;
    setDeleting(true);
    const res = await fetch(`/api/calendar/events/${initialEvent._id}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("calendar.deleteFailed"));
      return;
    }
    onDeleted(initialEvent._id);
  }

  return (
    <div className={styles.formOverlay} onMouseDown={onClose}>
      <form
        className={styles.formPanel}
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className={styles.formHeader}>
          <h2>{t(isEditing ? "calendar.editEvent" : "calendar.newEvent")}</h2>
          <button type="button" className={styles.formCloseButton} onClick={onClose} aria-label={t("common.close")}>
            <IconClose size={16} />
          </button>
        </div>

        {error && (
          <p className={dash.formError} role="alert">
            {error}
          </p>
        )}

        <div className={dash.detailField}>
          <label htmlFor="ev-title">{t("calendar.eventTitle")}</label>
          <input
            id="ev-title"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t("calendar.eventTitlePlaceholder")}
          />
        </div>

        <div className={styles.formRow}>
          <div className={dash.detailField}>
            <label htmlFor="ev-type">{t("calendar.eventType")}</label>
            <select id="ev-type" value={form.type} onChange={(e) => update("type", e.target.value)}>
              {MEETING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`calendar.type.${type}`)}
                </option>
              ))}
            </select>
          </div>
          <div className={dash.detailField}>
            <label htmlFor="ev-status">{t("calendar.eventStatus")}</label>
            <select id="ev-status" value={form.status} onChange={(e) => update("status", e.target.value)}>
              {MEETING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`calendar.status.${status}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className={dash.checkboxRow}>
          <input type="checkbox" checked={form.allDay} onChange={(e) => update("allDay", e.target.checked)} />
          <span>{t("calendar.allDayEvent")}</span>
        </label>

        <div className={styles.formRow}>
          <div className={dash.detailField}>
            <label htmlFor="ev-start">{t("calendar.startsAt")}</label>
            {form.allDay ? (
              <input
                id="ev-start"
                type="date"
                required
                value={toLocalDateInputValue(form.startAt)}
                onChange={(e) => update("startAt", new Date(`${e.target.value}T00:00`))}
              />
            ) : (
              <input
                id="ev-start"
                type="datetime-local"
                required
                value={toLocalInputValue(form.startAt)}
                onChange={(e) => update("startAt", new Date(e.target.value))}
              />
            )}
          </div>
          <div className={dash.detailField}>
            <label htmlFor="ev-end">{t("calendar.endsAt")}</label>
            {form.allDay ? (
              <input
                id="ev-end"
                type="date"
                required
                value={toLocalDateInputValue(form.endAt)}
                onChange={(e) => update("endAt", new Date(`${e.target.value}T23:59`))}
              />
            ) : (
              <input
                id="ev-end"
                type="datetime-local"
                required
                value={toLocalInputValue(form.endAt)}
                onChange={(e) => update("endAt", new Date(e.target.value))}
              />
            )}
          </div>
        </div>

        <div className={dash.detailField}>
          <label>{t("calendar.linkedRecord")}</label>
          <RelatedPicker leads={leads} contacts={contacts} value={related} onChange={setRelated} />
        </div>

        {form.status === "ai_followup" && related?.kind === "lead" && (
          <p className={styles.aiFollowupHint}>
            {t("calendar.aiFollowupHint")}{" "}
            <Link href={`/t/${tenantSlug}/leads/${related.id}`}>{t("calendar.aiFollowupLink")}</Link>
          </p>
        )}

        <div className={dash.detailField}>
          <label htmlFor="ev-location">{t("calendar.location")}</label>
          <input
            id="ev-location"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder={t("calendar.locationPlaceholder")}
          />
        </div>

        <div className={dash.detailField}>
          <label htmlFor="ev-notes">{t("calendar.notes")}</label>
          <textarea
            id="ev-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>

        <div className={dash.actionsRow}>
          <button type="submit" className={`${dash.saveButton} ${dash.iconLabel}`} disabled={saving}>
            <IconCheck size={14} />
            {saving ? t("common.saving") : t("common.save")}
          </button>
          {isEditing && (
            <button
              type="button"
              className={`${dash.deleteButton} ${dash.iconLabel}`}
              onClick={handleDelete}
              disabled={deleting}
            >
              <IconTrash size={14} />
              {deleting ? t("leads.deleting") : t("calendar.deleteEvent")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
