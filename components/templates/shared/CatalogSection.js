import styles from "./shared.module.css";
import CtaLink from "./CtaLink";

/* eslint-disable @next/next/no-img-element */
// Plain <img>, same reasoning as Gallery.js and Branding.js — these already
// point at our own compressed /api/media route.

/**
 * The item list: a menu, price list, or product range, up to fifteen cards.
 *
 * There is no way to buy anything here, on purpose. No cart, no quantity, no
 * checkout, no "add to basket" — this product cannot take a payment on a
 * tenant's behalf, and a button that looked like it could would be lying to
 * the visitor and exposing the business to a complaint it can't answer. What
 * the section does instead is what the rest of the page does: it turns
 * interest into a lead. One link, on the section rather than on every card,
 * pointing at the contact form.
 *
 * Every string arrives as a prop, resolved by resolveLandingCopy() in the
 * tenant's own content language — the same rule as the rest of the public
 * page, where the visitor's UI locale is irrelevant.
 *
 * Shared chrome like FaqSection and TeamSection: undecorated beyond the
 * tenant's brand colour, so it sits convincingly inside all four templates.
 */
export default function CatalogSection({
  items = [],
  heading,
  note = "",
  inquireLabel = "",
  photoAlt,
  tenantSlug,
  className,
}) {
  if (!items.length) return null;

  // A list of two behaves badly in a three-column grid; letting the count
  // drive the maximum keeps a short menu centred instead of stranded.
  const columns = Math.min(items.length, 3);

  return (
    <section className={`${styles.catalogSection} ${className || ""}`}>
      <h2>{heading}</h2>
      {note && <p className={styles.catalogNote}>{note}</p>}

      <ul className={styles.catalogGrid} style={{ "--catalog-columns": columns }}>
        {items.map((item, i) => (
          <li className={styles.catalogCard} key={`${item.title}-${i}`}>
            {item.mediaId && (
              <div className={styles.catalogMedia}>
                <img
                  src={`/api/media/${item.mediaId}`}
                  alt={photoAlt ? photoAlt(item.title) : item.title}
                  loading="lazy"
                />
              </div>
            )}
            <div className={styles.catalogBody}>
              <h3 className={styles.catalogTitle}>{item.title}</h3>
              {item.description && <p className={styles.catalogDescription}>{item.description}</p>}
              {/* Free text, and shown exactly as the business typed it —
                  "₪120", "From $50", "Price on request" are all valid, and
                  none of them is a number this page should be formatting.

                  The <bdi>, not a dir="ltr" on the paragraph: a price is read
                  left-to-right even inside a Hebrew page, but the paragraph
                  itself still belongs to that page and must sit against its
                  reading edge. Putting the direction on the <p> did both jobs
                  with one switch and got the second one wrong — the price
                  ended up alone on the left of a right-aligned card. */}
              {item.price && (
                <p className={styles.catalogPrice}>
                  <bdi dir="ltr">{item.price}</bdi>
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {inquireLabel && (
        <div className={styles.catalogAction}>
          {/* CtaLink, not a bare anchor: it records the click against the
              landing page's A/B variant like every other CTA on the page. */}
          <CtaLink tenantSlug={tenantSlug} className={styles.catalogCta} href="#lead-form">
            {inquireLabel}
          </CtaLink>
        </div>
      )}
    </section>
  );
}
