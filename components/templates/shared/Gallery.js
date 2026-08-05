import styles from "./shared.module.css";

/* eslint-disable @next/next/no-img-element */
// Plain <img>, same reasoning as Branding.js — these already point at our own
// compressed /api/media route.

/**
 * Up to 6 photos in a CSS grid. `columns` (2, 3, or 4) comes from the
 * tenant's landingPage.galleryColumns setting and is applied as a CSS
 * variable so every template gets the same grid behaviour for free.
 */
export default function Gallery({ mediaIds = [], columns = 3 }) {
  if (!mediaIds.length) return null;

  return (
    <div className={styles.galleryGrid} style={{ "--gallery-columns": columns }}>
      {mediaIds.map((id) => (
        <div className={styles.galleryItem} key={id}>
          <img src={`/api/media/${id}`} alt="" loading="lazy" />
        </div>
      ))}
    </div>
  );
}
