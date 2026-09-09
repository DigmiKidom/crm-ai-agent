"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./loginTransition.module.css";
import BrandIntro from "./BrandIntro";
import { useT } from "@/components/i18n/LocaleProvider";

// How long the drawn intro takes to land its last beat (see
// components/brandIntro.module.css — the tagline finishes at ~1.62s and the
// progress bar reaches its holding point at ~2.64s). Nothing navigates before
// this: an animation cut off a third of the way through reads as a glitch,
// not as speed.
const INTRO_MS = 1900;

// The bar's run-out plus a beat, so the overlay doesn't vanish underneath a
// progress animation that's still moving.
const EXIT_MS = 420;

// Hard ceiling. The readiness signals below are all best-effort — a browser
// with no requestIdleCallback, a font load that never settles, a prefetch
// that throws — and none of them may leave the user staring at a logo.
const FAILSAFE_MS = 6000;

/** Resolves when the browser next has nothing better to do, or after `cap`. */
function whenIdle(cap = 800) {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => resolve(), { timeout: cap });
    } else {
      setTimeout(resolve, Math.min(cap, 200));
    }
  });
}

/**
 * The Ceramony intro, drawn between a successful login and the dashboard.
 *
 * Previously a 3.2s MP4. The clip's length was the whole timing model, which
 * meant it was wrong in both directions: it ran out before a slow dashboard
 * was ready (blank screen, then a second wait), and it held a fast one back.
 * It also couldn't say anything — a paused video and a hung app look
 * identical.
 *
 * Now the animation is DOM and CSS (see BrandIntro), so the same lockup can
 * be driven by what is actually happening:
 *
 *   floor  — the intro's own beats, which we never cut short;
 *   work   — the dashboard route prefetched, webfonts settled, and the main
 *            thread quiet, so the navigation lands on a warm route instead of
 *            trading one wait for another;
 *   ready  — the progress bar completes and the overlay lifts.
 *
 * Mounted only after auth has already succeeded, so nothing here gates
 * access — the worst case is that it navigates early.
 */
export default function LoginTransition({ target }) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState("loading");
  const doneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    function navigate() {
      if (doneRef.current) return;
      doneRef.current = true;
      router.push(target);
    }

    // Anyone who has asked their OS to reduce motion shouldn't be handed a
    // full-screen animation — send them straight through.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      navigate();
      return;
    }

    // Warm the dashboard while the intro plays. In the App Router this
    // returns nothing to await, so it's fired alongside the signals below
    // rather than being one of them.
    try {
      router.prefetch(target);
    } catch {
      // A prefetch failure costs a warm route, nothing more.
    }

    const floor = new Promise((resolve) => timers.push(setTimeout(resolve, INTRO_MS)));
    // document.fonts is absent in older browsers and can reject; either way
    // it must not be the thing that holds someone on a splash screen.
    const fonts = document.fonts?.ready?.catch?.(() => {}) ?? Promise.resolve();

    Promise.all([floor, fonts, whenIdle()]).then(() => {
      if (cancelled) return;
      setState("ready");
      timers.push(setTimeout(navigate, EXIT_MS));
    });

    timers.push(setTimeout(navigate, FAILSAFE_MS));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [router, target]);

  return (
    <div className={styles.overlay} data-state={state} role="status" aria-live="polite">
      <span className={styles.srOnly}>{t("auth.signingIn")}</span>
      <BrandIntro
        tagline={t("brand.tagline")}
        state={state}
        label={t("auth.signingIn")}
      />
    </div>
  );
}
