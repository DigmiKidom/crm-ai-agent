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
  const [totp, setTotp] = useState("");
  // "credentials" for everyone; "twoFactor" only for the accounts that have a
  // second factor, and only after their password has already been accepted.
  // Deliberately not a code field shown to everyone, and deliberately not one
  // revealed by a failed attempt — the first made every ordinary owner wonder
  // what they were missing, the second made every admin fail a login on
  // purpose before they could pass one.
  const [step, setStep] = useState("credentials");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Set once auth has succeeded; its presence is what plays the outro.
  const [destination, setDestination] = useState(null);

  /** Shared tail: session now holds tenantSlug, so route to that dashboard. */
  async function finishSignIn() {
    const res = await fetch("/api/me");
    const me = await res.json();
    // Deliberately leaves `loading` true: the button stays disabled behind the
    // overlay so a second submit can't fire mid-animation.
    setDestination(`/t/${me.tenantSlug}`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Second step: password already checked, so a failure here is the code.
    if (step === "twoFactor") {
      const result = await signIn("credentials", { email, password, totp, redirect: false });
      if (result?.error) {
        setLoading(false);
        setError(t("auth.invalidCode"));
        return;
      }
      await finishSignIn();
      return;
    }

    // First step: ask whether this account needs a code before signing in.
    let requiresTwoFactor = false;
    try {
      const res = await fetch("/api/auth/precheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!data.ok) {
        setLoading(false);
        setError(t("auth.invalidCredentials"));
        return;
      }
      requiresTwoFactor = Boolean(data.requiresTwoFactor);
    } catch {
      // Precheck unreachable — fall through to a normal sign-in attempt
      // rather than blocking the login. authorize() still enforces 2FA, so
      // the failure mode is a confusing error, never a skipped factor.
      requiresTwoFactor = false;
    }

    if (requiresTwoFactor) {
      setLoading(false);
      setStep("twoFactor");
      return;
    }

    const result = await signIn("credentials", { email, password, totp: "", redirect: false });
    if (result?.error) {
      setLoading(false);
      setError(t("auth.invalidCredentials"));
      return;
    }
    await finishSignIn();
  }

  // The overlay handles navigation itself once the clip finishes.
  if (destination) return <LoginTransition target={destination} />;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo href={null} markSize={30} />
        </div>
        <h1 className={styles.title}>
          {step === "twoFactor" ? t("auth.twoFactorStep") : t("auth.logIn")}
        </h1>
        <p className={styles.subtitle}>
          {step === "twoFactor" ? t("auth.twoFactorStepHint") : t("auth.welcomeBack")}
        </p>

        <Suspense fallback={null}>
          <VerifyStatus />
        </Suspense>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          {step === "credentials" ? (
            <>
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
            </>
          ) : (
            <div className={styles.field}>
              <label htmlFor="totp">{t("auth.twoFactorCode")}</label>
              <input
                id="totp"
                type="text"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                // Long enough for a recovery code (XXXXX-XXXXX), which is
                // accepted here too.
                maxLength={14}
                required
                autoFocus
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
              />
              <span className={styles.hint}>{t("auth.twoFactorCodeHint")}</span>
            </div>
          )}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? t("auth.loggingIn") : t("auth.logIn")}
          </button>
        </form>

        {step === "twoFactor" ? (
          <p className={styles.footer}>
            <button
              type="button"
              className={styles.linkLike}
              onClick={() => {
                setStep("credentials");
                setTotp("");
                setError("");
              }}
            >
              {t("auth.twoFactorBack")}
            </button>
          </p>
        ) : (
          <p className={styles.footer}>
            <a href="/forgot-password">{t("auth.forgotPassword")}</a>
          </p>
        )}
        <p className={styles.footer}>
          {t("auth.noAccount")} <a href="/signup">{t("auth.signUpLink")}</a>
        </p>
      </div>
    </div>
  );
}
