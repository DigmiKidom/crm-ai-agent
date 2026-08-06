"use client";

// A client component so it can translate. It fetches nothing, so this costs no
// server round trip and — unlike reading the locale cookie on the server — the
// route stays statically prerendered.
import { Suspense } from "react";
import Logo from "@/components/Logo";
import ResetPasswordForm from "./ResetPasswordForm";
import styles from "./page.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

export default function ResetPasswordPage() {
  const t = useT();
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo href={null} markSize={30} />
        </div>
        <h1 className={styles.title}>{t("auth.setNewTitle")}</h1>
        <p className={styles.subtitle}>{t("auth.setNewSubtitle")}</p>

        <Suspense fallback={<p className={styles.subtitle}>{t("common.loading")}</p>}>
          <ResetPasswordForm />
        </Suspense>

        <p className={styles.footer}>
          <a href="/login">{t("auth.backToLogin")}</a>
        </p>
      </div>
    </div>
  );
}
