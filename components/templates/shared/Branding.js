import styles from "./shared.module.css";

/* eslint-disable @next/next/no-img-element */
// Plain <img> throughout: these point at our own /api/media route, which already
// serves a browser-compressed WebP with a one-year immutable cache. Routing them
// through next/image would only add a second optimization hop.

/**
 * Tenant logo, rendered only when one is uploaded and the tenant hasn't hidden
 * it on the landing page.
 */
export function TenantLogo({ tenant, align = "center", className }) {
  const show = tenant?.landingPage?.showLogo !== false && tenant?.logoMediaId;
  if (!show) return null;

  return (
    <img
      src={`/api/media/${tenant.logoMediaId}`}
      alt={`${tenant.name} logo`}
      className={`${styles.logo} ${align === "left" ? styles.logoLeft : ""} ${className || ""}`}
    />
  );
}

const SOCIAL_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
};

/**
 * Footer block: logo, contact details, social links, and the legal line —
 * all driven by whatever the tenant filled in under Settings. Anything left
 * blank is simply omitted.
 */
export function BrandFooter({ tenant }) {
  const p = tenant?.profile || {};
  const social = Object.entries(p.social || {}).filter(([, url]) => url?.trim());

  const location = [p.addressLine, p.city, p.country].filter(Boolean).join(", ");
  const hasContact = p.contactEmail || p.contactPhone || location || p.website;

  return (
    <div className={styles.footerBrand}>
      {tenant?.logoMediaId && (
        <img
          src={`/api/media/${tenant.logoMediaId}`}
          alt=""
          className={styles.footerLogo}
        />
      )}

      {hasContact && (
        <div className={styles.footerContact}>
          {p.contactEmail && <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a>}
          {p.contactPhone && <a href={`tel:${p.contactPhone}`}>{p.contactPhone}</a>}
          {location && <span>{location}</span>}
          {p.website && (
            <a href={p.website} target="_blank" rel="noreferrer noopener">
              {p.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      )}

      {social.length > 0 && (
        <div className={styles.footerSocial}>
          {social.map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noreferrer noopener">
              {SOCIAL_LABELS[key] || key}
            </a>
          ))}
        </div>
      )}

      <span className={styles.footerLegal}>
        © {new Date().getFullYear()} {p.legalName || tenant?.name} — powered by CRM AI Agent
      </span>
    </div>
  );
}
