"use client";

import { useState } from "react";
import defaultStyles from "./default.module.css";
import { readHeadlineVariant } from "@/lib/abTest";

// Style-agnostic: any template can hand in its own CSS module so the form
// matches that template's look, without duplicating the submit logic.
//
// `fields` drives everything rendered here — it comes from
// lib/landingCopy.js, which resolves either the tenant's own saved form
// (edited in the dashboard's "Edit landing page" screen) or four sensible
// defaults for a tenant who hasn't touched it yet. Nothing about a field is
// hardcoded in this component: not its label, not which of the four inputs
// below it becomes, not whether it's required. That's deliberate — these
// labels sit next to AI-generated copy that may be in any language, and the
// set of fields itself is now something a tenant configures per-business.
const HTML_TYPE = {
  text: "text",
  email: "email",
  tel: "tel",
  number: "number",
  date: "date",
  // textarea, select and checkbox aren't <input type>s; each is handled as
  // its own element below.
};

// Email/phone/number/date all read left-to-right regardless of page
// direction — the browser's bidi algorithm otherwise reorders an address or
// a number as the visitor types it on an RTL page.
const LTR_TYPES = new Set(["email", "tel", "number", "date"]);

export default function LeadForm({
  tenantSlug,
  ctaLabel,
  labels,
  fields = [],
  styles = defaultStyles,
}) {
  // A checkbox group holds an array (any number of answers); everything else
  // holds a string. Both are serialized as-is and normalized server-side.
  const emptyState = () =>
    Object.fromEntries(fields.map((f) => [f.key, f.type === "checkbox" ? [] : ""]));

  const [form, setForm] = useState(emptyState);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  function setValue(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleOption(key, option, checked) {
    setForm((f) => {
      const current = Array.isArray(f[key]) ? f[key] : [];
      return {
        ...f,
        // Filter-then-append rather than push, so the stored order follows
        // the tenant's option order instead of click order.
        [key]: checked ? [...current, option] : current.filter((v) => v !== option),
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // null when this tenant isn't running a headline test — the cookie
        // was never assigned, so there's nothing to attribute.
        body: JSON.stringify({ tenantSlug, fields: form, variant: readHeadlineVariant() }),
      });

      if (res.ok) {
        setStatus("success");
        setForm(emptyState());
      } else {
        setStatus("error");
      }
    } catch {
      // A dropped connection previously left the button stuck on "Sending…"
      // with no way back — a visitor would just leave.
      setStatus("error");
    }
  }

  if (status === "success") {
    return <p className={styles.success}>{labels.success}</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {status === "error" && <p className={styles.error}>{labels.error}</p>}

      {fields.map((field) => {
        // A checkbox group has no single control to point a <label for> at,
        // so it's a <fieldset>/<legend> instead — the group's own name is
        // what a screen reader needs to announce, not one box's.
        if (field.type === "checkbox") {
          const selected = Array.isArray(form[field.key]) ? form[field.key] : [];
          return (
            <fieldset className={styles.field} key={field.key} style={{ border: 0, padding: 0, margin: "0 0 14px" }}>
              <legend>{field.label}</legend>
              {field.options.map((option) => (
                <label key={option} className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    value={option}
                    checked={selected.includes(option)}
                    onChange={(e) => toggleOption(field.key, option, e.target.checked)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
          );
        }

        return (
          <div className={styles.field} key={field.key}>
            <label htmlFor={field.key}>{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                id={field.key}
                rows={3}
                required={field.required}
                value={form[field.key] || ""}
                onChange={(e) => setValue(field.key, e.target.value)}
              />
            ) : field.type === "select" ? (
              <select
                id={field.key}
                required={field.required}
                value={form[field.key] || ""}
                onChange={(e) => setValue(field.key, e.target.value)}
              >
                {/* Empty first option so a required dropdown starts
                    genuinely unanswered rather than silently defaulting to
                    the tenant's first choice. Its label is the field's own,
                    which keeps this in the page's language with no extra
                    string to translate. */}
                <option value="">{field.label}</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={field.key}
                type={HTML_TYPE[field.type] || "text"}
                required={field.required}
                dir={LTR_TYPES.has(field.type) ? "ltr" : undefined}
                value={form[field.key] || ""}
                onChange={(e) => setValue(field.key, e.target.value)}
              />
            )}
          </div>
        );
      })}

      <button className={styles.submitButton} type="submit" disabled={status === "loading"}>
        {status === "loading" ? labels.sending : ctaLabel}
      </button>
    </form>
  );
}
