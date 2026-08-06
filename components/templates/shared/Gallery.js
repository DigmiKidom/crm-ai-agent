import styles from "./shared.module.css";

/* eslint-disable @next/next/no-img-element */
// Plain <img>, same reasoning as Branding.js — these already point at our own
// compressed /api/media route.

/**
 * Up to 6 photos in a CSS grid. `columns` (2, 3, or 4) comes from the
 * tenant's landingPage.galleryColumns setting and is applied as a CSS
 * variable so every template gets the same grid behaviour for free.
 *
 * `label` (the gallery's own heading, e.g. "Our work") seeds each photo's alt
 * text as "{label} — photo {n} of {total}". There's no per-photo caption
 * collected from the tenant, so this can't describe what's actually in each
 * image — but a numbered, labelled alt is a real improvement over `alt=""`
 * on what is tenant-chosen content (a portfolio, past work), not decoration.
 */
export default function Gallery({ mediaIds = [], columns = 3, label = "" }) {
  if (!mediaIds.length) return null;

  return (
    <div className={styles.galleryGrid} style={{ "--gallery-columns": columns }}>
      {mediaIds.map((id, i) => (
        <div className={styles.galleryItem} key={id}>
          <img
            src={`/api/media/${id}`}
            alt={label ? `${label} — photo ${i + 1} of ${mediaIds.length}` : ""}
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
