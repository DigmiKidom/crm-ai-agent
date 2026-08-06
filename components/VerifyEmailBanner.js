"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";
import { IconMail } from "./icons";
import { useT } from "@/components/i18n/LocaleProvider";

export default function VerifyEmailBanner() {
  const t = useT();
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  async function handleResend() {
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      // A dropped connection should read the same as a rejected request —
      // without this the banner would sit on "Sending…" forever.
      setStatus("error");
    }
  }

  return (
    <div className={styles.verifyBanner}>
      <IconMail size={16} style={{ color: "var(--warning)", flexShrink: 0 }} />
      <span>{t("auth.verifyBanner")}</span>
      {status === "sent" ? (
        <span className={styles.savedNote} role="status">
          {t("auth.verifySent")}
        </span>
      ) : (
        <button
          type="button"
          className={styles.linkButton}
          onClick={handleResend}
          disabled={status === "sending"}
        >
          {status === "sending" ? t("auth.verifySending") : t("auth.verifyResend")}
        </button>
      )}
      {status === "error" && (
        <span style={{ color: "var(--danger)", fontSize: "0.8rem" }} role="alert">
          {t("auth.verifyFailed")}
        </span>
      )}
    </div>
  );
}
