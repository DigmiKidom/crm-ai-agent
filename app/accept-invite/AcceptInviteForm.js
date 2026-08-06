"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import styles from "./page.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

export default function AcceptInviteForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  // "loading" the preview → "ready" to fill in the form → "submitting" →
  // "done". "invalid" covers both a missing token and an expired/used one —
  // the preview fetch and the accept POST report the same error either way.
  // `token` is derived synchronously from useSearchParams(), so a missing
  // token is known at first render — no effect needed to discover that,
  // which is what let this double as an unconditional setState-in-effect.
  const [previewState, setPreviewState] = useState(() => (token ? "loading" : "invalid"));
  const [invite, setInvite] = useState(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/invites/accept?token=${encodeURIComponent(token)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setPreviewState("invalid");
          return;
        }
        setInvite(data);
        setPreviewState("ready");
      })
      .catch(() => {
        if (!cancelled) setPreviewState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: t("auth.serverError") };
    }

    if (!res.ok) {
      setError(data.error || t("common.error"));
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email: invite.email,
      password,
      redirect: false,
    });
    setSubmitting(false);

    if (result?.error) {
      // Account was created, but auto-login failed for some reason.
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
      return;
    }

    router.push(`/t/${data.tenantSlug}`);
  }

  if (previewState === "loading") {
    return <p className={styles.subtitle}>{t("common.loading")}</p>;
  }

  if (previewState === "invalid") {
    return (
      <p className={styles.error}>
        {t("invite.linkInvalid")} <a href="/login">{t("auth.backToLogin")}</a>
      </p>
    );
  }

  if (done) {
    return <p className={styles.success}>{t("invite.accountReady")}</p>;
  }

  return (
    <>
      <p className={styles.subtitle}>
        {t("invite.joinIntro", { tenantName: invite.tenantName, role: t(`roles.${invite.role}`) })}
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">{t("auth.email")}</label>
          <input id="email" type="email" value={invite.email} disabled />
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
        <button className={styles.button} type="submit" disabled={submitting}>
          {submitting ? t("auth.creatingAccount") : t("invite.joinTeam")}
        </button>
      </form>
    </>
  );
}
