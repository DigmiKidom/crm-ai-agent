"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import styles from "./page.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo href={null} markSize={30} />
        </div>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        {sent ? (
          <p className={styles.success}>
            If an account exists for that email, a reset link is on its way. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className={styles.footer}>
          <a href="/login">Back to log in</a>
        </p>
      </div>
    </div>
  );
}
