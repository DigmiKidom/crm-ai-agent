"use client";

import { useEffect, useState } from "react";
import styles from "./shared.module.css";

/**
 * Renders up to 3 hero background photos behind whatever the template puts in
 * the hero. One image is static; two or three cross-fade on a timer.
 *
 * The overlay is a solid scrim tinted with the tenant's accent colour — without
 * it, white headline text on a bright photo is unreadable.
 */
export default function HeroBackground({ mediaIds = [], overlay = 0.55 }) {
  const [active, setActive] = useState(0);
  const count = mediaIds.length;

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % count), 6000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  return (
    <div className={styles.bgWrap} aria-hidden="true">
      {mediaIds.map((id, i) => (
        <div
          key={id}
          className={`${styles.bgLayer} ${i === active ? styles.bgLayerActive : ""}`}
          style={{ backgroundImage: `url(/api/media/${id})` }}
        />
      ))}
      <div className={styles.bgOverlay} style={{ opacity: overlay }} />
    </div>
  );
}
