"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Logo from "@/components/Logo";
import { useT } from "@/components/i18n/LocaleProvider";
import LoginTransition from "@/components/LoginTransition";
import styles from "./page.module.css";
import VerifyStatus from "./VerifyStatus";

export default function LoginPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Set once auth has succeeded; its presence is what plays the outro.
  const [destination, setDestination] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError(t("auth.invalidCredentials"));
      return;
    }

    // Session now holds tenantSlug; fetch it and route to that tenant's dashboard.
    const res = await fetch("/api/me");
    const me = await res.json();

    // Deliberately leaves `loading` true: the button stays disabled behind the
    // overlay so a second submit can't fire mid-animation.
    setDestination(`/t/${me.tenantSlug}`);
  }

  // The overlay handles navigation itself once the clip finishes.
  if (destination) return <LoginTransition target={destination} />;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo href={null} markSize={30} />
        </div>
        <h1 className={styles.title}>{t("auth.logIn")}</h1>
        <p className={styles.subtitle}>{t("auth.welcomeBack")}</p>

        <Suspense fallback={null}>
          <VerifyStatus />
        </Suspense>

        {error && <p className={styles.error}>{error}</p>}

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
          <div className={styles.field}>
            <label htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? t("auth.loggingIn") : t("auth.logIn")}
          </button>
        </form>

        <p className={styles.footer}>
          <a href="/forgot-password">{t("auth.forgotPassword")}</a>
        </p>
        <p className={styles.footer}>
          {t("auth.noAccount")} <a href="/signup">{t("auth.signUpLink")}</a>
        </p>
      </div>
    </div>
  );
}
