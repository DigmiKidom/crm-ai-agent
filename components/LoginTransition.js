"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./loginTransition.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

// The clip is 3.2s. This is the hard ceiling before we navigate regardless —
// if autoplay is blocked, the file 404s, or `ended` never fires, the user must
// still land on their dashboard rather than staring at a blank screen.
const FAILSAFE_MS = 4200;

/**
 * The Ceramony outro, played once between a successful login and the
 * dashboard. Mounted only after auth has already succeeded, so nothing here
 * gates access — the worst case is that it navigates early.
 */
export default function LoginTransition({ target }) {
  const t = useT();
  const router = useRouter();
  const videoRef = useRef(null);
  const doneRef = useRef(false);

  useEffect(() => {
    // Warm the dashboard while the animation plays, so the navigation at the
    // end is instant instead of trading one wait for another.
    router.prefetch(target);

    function finish() {
      if (doneRef.current) return;
      doneRef.current = true;
      router.push(target);
    }

    // Anyone who has asked their OS to reduce motion shouldn't be handed a
    // full-screen animation — send them straight through.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) {
      finish();
      return;
    }

    const video = videoRef.current;
    // play() rejects when autoplay is blocked. Muted + playsInline satisfies
    // every current browser's policy, but a hard failure still shouldn't trap
    // the user here.
    video?.play?.().catch(finish);

    const failsafe = setTimeout(finish, FAILSAFE_MS);
    return () => clearTimeout(failsafe);
  }, [router, target]);

  function handleEnded() {
    if (doneRef.current) return;
    doneRef.current = true;
    router.push(target);
  }

  return (
    <div className={styles.overlay} role="status">
      <span className={styles.srOnly}>{t("auth.signingIn")}</span>
      <video
        ref={videoRef}
        className={styles.video}
        src="/video/ceramony-outro.mp4"
        poster="/video/ceramony-outro-poster.jpg"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onEnded={handleEnded}
        onError={handleEnded}
      />
    </div>
  );
}
