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
  // textarea isn't a real <input type>; handled as its own element below.
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
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.key, ""])));
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  function setValue(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
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
        setForm(Object.fromEntries(fields.map((f) => [f.key, ""])));
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

      {fields.map((field) => (
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
      ))}

      <button className={styles.submitButton} type="submit" disabled={status === "loading"}>
        {status === "loading" ? labels.sending : ctaLabel}
      </button>
    </form>
  );
}
