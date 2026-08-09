"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconCheck } from "./icons";
import styles from "./dashboard.module.css";

// Rendered only for owner/admin viewers, same as TeamSettings — see
// app/t/[tenantSlug]/settings/page.js.
export default function BillingSettings({ plan, hasSubscription }) {
  const t = useT();
  const searchParams = useSearchParams();
  const billingResult = searchParams.get("billing"); // "success" | "cancelled" | null

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function goTo(path) {
    setLoading(true);
    setError("");

    const res = await fetch(path, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.url) {
      setLoading(false);
      setError(data.error || t("settings.billing.failed"));
      return;
    }

    // Full navigation, not client-side routing — the destination is Stripe's
    // own hosted checkout/portal, not a route in this app.
    window.location.href = data.url;
  }

  return (
    <section className={styles.detailCard}>
      <h2 className={styles.sectionTitle}>{t("settings.billing.title")}</h2>
      <p className={styles.sectionHint}>{t("settings.billing.hint")}</p>

      {billingResult === "success" && (
        <p className={styles.savedNote} role="status">
          {t("settings.billing.checkoutSuccess")}
        </p>
      )}
      {billingResult === "cancelled" && (
        <p className={styles.sectionHint} role="status">
          {t("settings.billing.checkoutCancelled")}
        </p>
      )}
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <div className={styles.checkboxRow} style={{ marginBottom: 16 }}>
        {plan === "pro" && <IconCheck size={15} style={{ color: "var(--success)" }} />}
        <strong>{t(plan === "pro" ? "settings.billing.currentPlanPro" : "settings.billing.currentPlanFree")}</strong>
      </div>

      {plan === "pro" ? (
        <button
          type="button"
          className={`${styles.saveButton} ${styles.iconLabel}`}
          onClick={() => goTo("/api/billing/portal")}
          disabled={loading || !hasSubscription}
        >
          {loading ? t("common.loading") : t("settings.billing.manageSubscription")}
        </button>
      ) : (
        <button
          type="button"
          className={`${styles.saveButton} ${styles.iconLabel}`}
          onClick={() => goTo("/api/billing/checkout")}
          disabled={loading}
        >
          {loading ? t("common.loading") : t("settings.billing.upgrade")}
        </button>
      )}
    </section>
  );
}
