import styles from "./shared.module.css";
import { getAppUrl } from "@/lib/email";
import { resolveSocialLinks } from "@/lib/socialLinks";
import SocialBar from "./SocialBar";
import ReportPageLink from "./ReportPageLink";

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

/**
 * Per-card accenting. Returns the className and inline style a template should
 * spread onto its feature card.
 *
 * The colour is resolved to the tenant's theme CSS variables rather than a
 * stored hex, so re-branding in Settings instantly re-colours every card
 * instead of leaving stale colours baked into the landing page document.
 */
export function cardAccent(feature, templateStyles) {
  if (!feature?.topStrip && !feature?.border) return { className: "", style: undefined };

  const color =
    feature.accentColor === "accent"
      ? "var(--tenant-accent, #111827)"
      : "var(--tenant-primary, #2563eb)";

  const className = [
    feature.topStrip ? templateStyles.cardStrip : "",
    feature.border ? templateStyles.cardBordered : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { className, style: { "--card-accent": color } };
}

/**
 * Footer block: logo, contact details, social links, and the legal line —
 * all driven by whatever the tenant filled in under Settings. Anything left
 * blank is simply omitted.
 *
 * `socialLabel` is passed in rather than hardcoded: the footer renders on a
 * page whose copy may be in any language, so the landmark's accessible name
 * has to come from the same place that copy does (lib/landingCopy.js).
 */
export function BrandFooter({ tenant, poweredByLabel, socialLabel, reportLabels }) {
  const p = tenant?.profile || {};
  // Resolved rather than read raw — this turns handles into URLs and builds
  // the WhatsApp deep link, and drops anything the tenant left blank.
  const social = resolveSocialLinks(p.social);

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

      <SocialBar links={social} variant="footer" label={socialLabel} />

      <span className={styles.footerLegal}>
        © {new Date().getFullYear()} {p.legalName || tenant?.name}
      </span>

      {/* Absolute, not relative: this footer renders identically on a
          tenant's own custom domain (app/custom-domain/page.js), where a
          relative href would point back at the tenant's own site instead of
          ours. */}
      <a
        href={getAppUrl()}
        target="_blank"
        rel="noreferrer noopener"
        className={styles.footerPoweredBy}
      >
        {poweredByLabel}
      </a>

      {/* Every generated page carries this. Quiet by design — it's a safety
          valve, not a call to action — but present without exception, because
          a reporting route that some pages lack isn't a reporting route. */}
      {reportLabels && <ReportPageLink tenantSlug={tenant?.slug} labels={reportLabels} />}
    </div>
  );
}
