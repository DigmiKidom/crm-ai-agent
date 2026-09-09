"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useLocaleHref, useT } from "@/components/i18n/LocaleProvider";
import styles from "./page.module.css";

// How often to ask whether the link has been opened. Slow enough that a tab
// left on this page overnight is a rounding error against normal traffic,
// fast enough that clicking the link on a phone moves the laptop along while
// the person is still looking at it.
const POLL_MS = 5000;

// After this long with no activity the poll stops on its own. Someone who
// left the tab open and came back gets the button, which does the same check
// on demand — an unattended page polling forever is a cost with no reader.
const POLL_CEILING_MS = 15 * 60 * 1000;

/**
 * The interactive half of the waiting room: resend the link, notice when it
 * has been used, and get out.
 *
 * The awkward part this exists to smooth over is that "verified" is written
 * to the database by a GET from the visitor's mail client, which may be on an
 * entirely different device — so the session sitting on this page has no idea
 * it happened. Hence the poll: once the server says the address is confirmed,
 * `update()` re-issues the JWT (see the `trigger === "update"` branch in
 * auth.js) so the dashboard gate in proxy.js will let them through, and only
 * then do we navigate.
 */
export default function VerifyEmailPanel({ tenantSlug }) {
  const t = useT();
  const router = useRouter();
  const localeHref = useLocaleHref();
  const { update } = useSession();

  const [resend, setResend] = useState("idle"); // idle | sending | sent | error
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const doneRef = useRef(false);

  const destination = tenantSlug ? localeHref(`/t/${tenantSlug}`) : localeHref("/login");

  // `update` and `localeHref` are context values with no identity guarantee,
  // and the poll below is keyed on checkVerified. Reading them through a ref
  // keeps that callback stable across renders — otherwise every render would
  // tear down and rebuild the interval and fire another immediate check,
  // turning a five-second poll into a request per render.
  const latest = useRef({ update, destination });
  // Written in an effect, not during render: the ref is only ever read after
  // mount (from the poll or a button press), and assigning to `.current`
  // mid-render is the pattern React's own lint rule rejects.
  useEffect(() => {
    latest.current = { update, destination };
  }, [update, destination]);

  /**
   * One "has it happened yet?" round trip. Returns true once it has, so the
   * manual button can tell the visitor "not yet" without duplicating any of
   * this. Guarded by doneRef because the poll and the button can land at the
   * same moment and must not both navigate.
   */
  const checkVerified = useCallback(async () => {
    if (doneRef.current) return false;
    try {
      const res = await fetch("/api/auth/verification-status", { cache: "no-store" });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.verified) return false;

      doneRef.current = true;
      // Refresh the token before navigating: without this the dashboard gate
      // still reads the stale "unverified" claim and bounces them straight
      // back here, which looks exactly like the link not working.
      await latest.current.update();
      router.replace(latest.current.destination);
      return true;
    } catch {
      // Offline, or the API is down. Nothing to report — the next tick tries
      // again, and the resend button is still there.
      return false;
    }
  }, [router]);

  useEffect(() => {
    // Immediately, not just on the first tick: the commonest path here is
    // someone who opened the link in this very browser and was redirected
    // back by /api/auth/verify-email. Their token still says "unverified"
    // (a JWT is only reissued at sign-in), so this page renders — and it
    // should forward them on at once rather than after a five-second pause
    // that reads as the link having failed.
    checkVerified();

    const interval = setInterval(checkVerified, POLL_MS);
    const stop = setTimeout(() => clearInterval(interval), POLL_CEILING_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [checkVerified]);

  async function handleResend() {
    setResend("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      setResend(res.ok ? "sent" : "error");
    } catch {
      // A dropped connection should read the same as a rejected request —
      // without this the button would sit on "Sending…" forever.
      setResend("error");
    }
  }

  async function handleCheckNow() {
    setChecking(true);
    setNotYet(false);
    const verified = await checkVerified();
    setChecking(false);
    if (!verified) setNotYet(true);
  }

  return (
    <>
      <ol className={styles.steps}>
        <li>{t("auth.verifyStepOpen")}</li>
        <li>{t("auth.verifyStepClick")}</li>
        <li>{t("auth.verifyStepReturn")}</li>
      </ol>

      <button
        type="button"
        className={styles.button}
        onClick={handleResend}
        disabled={resend === "sending"}
      >
        {resend === "sending" ? t("auth.verifySending") : t("auth.verifyResend")}
      </button>

      {resend === "sent" && (
        <p className={`${styles.status} ${styles.success}`} role="status">
          {t("auth.verifySent")}
        </p>
      )}
      {resend === "error" && (
        <p className={`${styles.status} ${styles.error}`} role="alert">
          {t("auth.verifyFailed")}
        </p>
      )}

      <p className={styles.waiting}>
        <span className={styles.pulse} aria-hidden="true" />
        {t("auth.verifyWatching")}
      </p>

      {notYet && (
        <p className={styles.status} role="status">
          {t("auth.verifyNotYet")}
        </p>
      )}

      <p className={styles.footer}>
        <button
          type="button"
          className={styles.linkLike}
          onClick={handleCheckNow}
          disabled={checking}
        >
          {checking ? t("auth.verifyChecking") : t("auth.verifyCheckNow")}
        </button>
        {" · "}
        {/* The escape hatch for the commonest failure: the address is wrong.
            No amount of resending fixes that, so signing out (and signing up
            again, or logging in as someone else) has to be one click away. */}
        <button
          type="button"
          className={styles.linkLike}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          {t("auth.verifyUseAnotherAccount")}
        </button>
      </p>
    </>
  );
}
