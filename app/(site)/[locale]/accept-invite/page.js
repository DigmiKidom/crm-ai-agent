"use client";

// A client component so it can translate, same reasoning as
// app/reset-password/page.js: it fetches nothing itself, so this costs no
// server round trip and the route stays statically prerendered.
import { Suspense } from "react";
import Logo from "@/components/Logo";
import AcceptInviteForm from "./AcceptInviteForm";
import styles from "./page.module.css";
import { useT } from "@/components/i18n/LocaleProvider";
import Link from "@/components/i18n/Link";

export default function AcceptInvitePage() {
  const t = useT();
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo href={null} markSize={30} />
        </div>
        <h1 className={styles.title}>{t("invite.title")}</h1>

        <Suspense fallback={<p className={styles.subtitle}>{t("common.loading")}</p>}>
          <AcceptInviteForm />
        </Suspense>

        <p className={styles.footer}>
          <Link href="/login">{t("auth.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
