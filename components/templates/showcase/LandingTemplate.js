import styles from "./showcase.module.css";
import shared from "../shared/shared.module.css";
import LeadForm from "../default/LeadForm";
import HeroBackground from "../shared/HeroBackground";
import Gallery from "../shared/Gallery";
import { TenantLogo, BrandFooter, cardAccent } from "../shared/Branding";
import { LandingIcon } from "@/lib/landingIcons";

export default function LandingTemplate({ tenant }) {
  const { name, slug, theme, landingPage } = tenant;

  const themeVars = {
    "--tenant-primary": theme?.primaryColor || "#2563eb",
    "--tenant-accent": theme?.accentColor || "#111827",
    "--tenant-font": theme?.fontFamily || "system-ui, sans-serif",
  };

  const backgrounds = landingPage?.backgroundMediaIds || [];
  const hasPhoto = backgrounds.length > 0;
  const gallery = landingPage?.galleryMediaIds || [];
  const galleryColumns = landingPage?.galleryColumns || 3;
  // The hero's own mini preview borrows straight from the gallery so a
  // photo-forward business sees its work up top, not just in the hero photo.
  const heroPreview = gallery.slice(0, 4);

  return (
    <div className={styles.page} style={themeVars}>
      <section className={`${styles.hero} ${hasPhoto ? styles.heroWithPhoto : ""}`}>
        <HeroBackground mediaIds={backgrounds} overlay={landingPage?.backgroundOverlay ?? 0.7} />

        <div className={`${styles.heroInner} ${heroPreview.length === 0 ? styles.heroInnerSolo : ""}`}>
          <div>
            <TenantLogo tenant={tenant} align="left" />
            {tenant.profile?.tagline && <div className={styles.eyebrow}>{tenant.profile.tagline}</div>}
            <h1 className={styles.headline}>{landingPage?.headline || `Grow ${name}`}</h1>
            <p className={styles.subheadline}>
              {landingPage?.subheadline || "Tell your visitors why they should reach out."}
            </p>
            <a className={styles.ctaButton} href="#lead-form">
              {landingPage?.ctaLabel || "Get in touch"}
            </a>
          </div>

          {heroPreview.length > 0 && (
            <div className={styles.heroShowcase}>
              <Gallery mediaIds={heroPreview} columns={heroPreview.length > 1 ? 2 : 1} />
            </div>
          )}
        </div>
      </section>

      {landingPage?.features?.length > 0 && (
        <section className={styles.features}>
          {landingPage.features.map((feature, i) => {
            const accent = cardAccent(feature, styles);
            return (
              <div
                className={`${styles.featureRow} ${accent.className}`}
                style={accent.style}
                key={i}
              >
                <div className={styles.featureIndex}>{String(i + 1).padStart(2, "0")}</div>
                <div className={styles.featureCard}>
                  {feature.icon && (
                    <span className={styles.featureIcon}>
                      <LandingIcon name={feature.icon} size={20} strokeWidth={2} />
                    </span>
                  )}
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {gallery.length > 0 && (
        <section className={styles.gallerySection}>
          <h2>Our work</h2>
          <Gallery mediaIds={gallery} columns={galleryColumns} />
        </section>
      )}

      <section className={styles.formSection} id="lead-form">
        <div className={styles.formCard}>
          <h2>{landingPage?.ctaLabel || "Get in touch"}</h2>
          <LeadForm tenantSlug={slug} ctaLabel={landingPage?.ctaLabel} styles={styles} />
        </div>
      </section>

      <footer className={styles.footer}>
        <BrandFooter tenant={tenant} />
      </footer>
    </div>
  );
}
