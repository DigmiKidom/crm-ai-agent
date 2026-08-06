"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import styles from "./page.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

export default function ForgotPasswordPage() {
  const t = useT();
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
      setError(t("auth.serverError"));
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
        <h1 className={styles.title}>{t("auth.resetTitle")}</h1>
        <p className={styles.subtitle}>
          {t("auth.resetIntro")}
        </p>

        {error && <p className={styles.error}>{error}</p>}

        {sent ? (
          <p className={styles.success}>
            {t("auth.resetSent")}
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="email">{t("auth.email")}</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? t("auth.sending") : t("auth.sendResetLink")}
            </button>
          </form>
        )}

        <p className={styles.footer}>
          <a href="/login">{t("auth.backToLogin")}</a>
        </p>
      </div>
    </div>
  );
}
