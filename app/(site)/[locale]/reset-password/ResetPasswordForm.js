"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./page.module.css";
import { useT, useLocaleHref } from "@/components/i18n/LocaleProvider";
import Link from "@/components/i18n/Link";

export default function ResetPasswordForm() {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const localeHref = useLocaleHref();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: t("auth.serverError") };
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error || t("auth.resetFailed"));
      return;
    }

    setDone(true);
    setTimeout(() => router.push(localeHref("/login")), 2000);
  }

  if (!token) {
    return (
      <p className={styles.error}>
        This reset link is missing its token. Request a new one from the{" "}
        <Link href="/forgot-password">forgot password page</Link>.
      </p>
    );
  }

  if (done) {
    return <p className={styles.success}>{t("auth.passwordUpdated")}</p>;
  }

  return (
    <>
      {error && <p className={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="password">{t("auth.newPassword")}</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirmPassword">{t("auth.confirmNewPassword")}</label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? t("common.saving") : t("auth.setNewPassword")}
        </button>
      </form>
    </>
  );
}
