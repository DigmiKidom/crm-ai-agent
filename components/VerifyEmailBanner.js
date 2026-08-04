"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";
import { IconMail } from "./icons";

export default function VerifyEmailBanner() {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  async function handleResend() {
    setStatus("sending");
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    setStatus(res.ok ? "sent" : "error");
  }

  return (
    <div className={styles.verifyBanner}>
      <IconMail size={16} style={{ color: "#b45309", flexShrink: 0 }} />
      <span>Verify your email to make sure you can recover your account.</span>
      {status === "sent" ? (
        <span className={styles.savedNote}>Sent — check your inbox.</span>
      ) : (
        <button
          type="button"
          className={styles.linkButton}
          onClick={handleResend}
          disabled={status === "sending"}
        >
          {status === "sending" ? "Sending..." : "Resend verification email"}
        </button>
      )}
      {status === "error" && (
        <span style={{ color: "#b91c1c", fontSize: "0.8rem" }}>Could not send. Try again.</span>
      )}
    </div>
  );
}
