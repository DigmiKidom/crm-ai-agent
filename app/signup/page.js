"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import styles from "./page.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

export default function SignupPage() {
  const t = useT();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, name, email, password }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      // Server crashed before returning JSON (e.g. an unhandled 500) —
      // don't let that show up as a blank unhandled-rejection in the console.
      data = { error: t("auth.serverError") };
    }

    if (!res.ok) {
      setError(data.error || t("common.error"));
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      // Account was created, but auto-login failed for some reason.
      router.push("/login");
      return;
    }

    router.push(`/t/${data.tenantSlug}/onboarding`);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo href={null} markSize={30} />
        </div>
        <h1 className={styles.title}>{t("auth.createYourAccount")}</h1>
        <p className={styles.subtitle}>{t("auth.signupSubtitle")}</p>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="companyName">{t("auth.companyName")}</label>
            <input
              id="companyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="name">{t("auth.yourName")}</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
          <div className={styles.field}>
            <label htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: "0.8rem",
              color: "var(--muted)",
              marginBottom: 16,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              required
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              {t("auth.agreeToThe")}{" "}
              <a href="/terms" target="_blank" rel="noreferrer">
                {t("auth.termsOfUse")}
              </a>
            </span>
          </label>
          <button className={styles.button} type="submit" disabled={loading || !agreedToTerms}>
            {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
          </button>
        </form>

        <p className={styles.footer}>
          {t("auth.haveAccount")} <a href="/login">{t("auth.logInLink")}</a>
        </p>
      </div>
    </div>
  );
}
