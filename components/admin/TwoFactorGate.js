"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconLock, IconCheck } from "@/components/icons";
import styles from "./admin.module.css";

/**
 * Enrolment wall for an admin who hasn't set up a second factor.
 *
 * Rendered instead of the admin surface (see app/admin/layout.js), not
 * alongside it — an admin without 2FA can enrol and nothing else.
 *
 * Three steps: request a secret, enter a code from the authenticator app,
 * then save the recovery codes. The last screen is the only time those codes
 * exist in readable form anywhere.
 */
export default function TwoFactorGate() {
  const t = useT();
  const [stage, setStage] = useState("intro"); // intro | enrol | done
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startEnrolment() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/2fa", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("admin.twoFactor.failed"));
        return;
      }
      setSecret(data.secret);
      setUri(data.otpauthUri);
      setStage("enrol");
    } catch {
      setError(t("admin.twoFactor.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrolment(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/2fa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("admin.twoFactor.failed"));
        return;
      }
      setRecoveryCodes(data.recoveryCodes || []);
      setStage("done");
    } catch {
      setError(t("admin.twoFactor.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.gate}>
        <span className={styles.badge}>
          <IconLock size={11} />
          {t("admin.platformBadge")}
        </span>

        <h1 className={styles.pageTitle} style={{ marginTop: 14 }}>
          {t("admin.twoFactor.title")}
        </h1>

        {error && <p className={styles.error}>{error}</p>}

        {stage === "intro" && (
          <>
            <p className={styles.pageHint}>{t("admin.twoFactor.intro")}</p>
            <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={startEnrolment} disabled={busy}>
              {busy ? t("common.saving") : t("admin.twoFactor.start")}
            </button>
          </>
        )}

        {stage === "enrol" && (
          <>
            <ol className={styles.gateSteps}>
              <li>{t("admin.twoFactor.step1")}</li>
              <li>{t("admin.twoFactor.step2")}</li>
              <li>{t("admin.twoFactor.step3")}</li>
            </ol>

            {/* The secret itself, for manual entry. No QR image: drawing one
                would mean shipping a QR library to the browser for a screen a
                handful of people see once, and every authenticator app
                accepts a typed key. The otpauth:// link works directly on a
                phone. */}
            <code className={styles.secretBox}>{secret}</code>
            <p className={styles.subtle}>
              <a href={uri}>{t("admin.twoFactor.openInApp")}</a>
            </p>

            <form onSubmit={confirmEnrolment} style={{ marginTop: 18 }}>
              <label htmlFor="totp-code" className={styles.statLabel}>
                {t("admin.twoFactor.codeLabel")}
              </label>
              <input
                id="totp-code"
                className={styles.codeInput}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                type="submit"
                disabled={busy || code.length !== 6}
                style={{ marginTop: 14 }}
              >
                <IconCheck size={14} />
                {busy ? t("common.saving") : t("admin.twoFactor.confirm")}
              </button>
            </form>
          </>
        )}

        {stage === "done" && (
          <>
            <p className={styles.pageHint}>{t("admin.twoFactor.savedIntro")}</p>
            <ul className={styles.recoveryList}>
              {recoveryCodes.map((rc) => (
                <li key={rc}>{rc}</li>
              ))}
            </ul>
            <p className={styles.warn}>{t("admin.twoFactor.recoveryWarning")}</p>
            {/* A full reload, not a router push: the session's own 2FA state
                is read server-side in the layout, so the surface only appears
                after a fresh request. */}
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => window.location.reload()}
              style={{ marginTop: 16 }}
            >
              {t("admin.twoFactor.continue")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
