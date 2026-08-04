"use client";

import { useState } from "react";
import defaultStyles from "./default.module.css";

// Style-agnostic: any template can hand in its own CSS module so the form
// matches that template's look, without duplicating the submit logic.
export default function LeadForm({ tenantSlug, ctaLabel, styles = defaultStyles }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug, ...form }),
    });

    if (res.ok) {
      setStatus("success");
      setForm({ name: "", email: "", phone: "", message: "" });
    } else {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <p className={styles.success}>Thanks — we&apos;ll be in touch shortly.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {status === "error" && (
        <p className={styles.error}>Something went wrong. Please try again.</p>
      )}
      <div className={styles.field}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="phone">Phone (optional)</label>
        <input
          id="phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="message">Message (optional)</label>
        <textarea
          id="message"
          rows={3}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>
      <button className={styles.submitButton} type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Sending..." : ctaLabel || "Get in touch"}
      </button>
    </form>
  );
}
