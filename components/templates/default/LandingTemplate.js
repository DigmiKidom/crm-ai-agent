import styles from "./default.module.css";
import shared from "../shared/shared.module.css";
import LeadForm from "./LeadForm";
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

  return (
    <div className={styles.page} style={themeVars}>
      {/* With a photo the hero drops its solid colour block and lets the
          image plus overlay carry the background instead. */}
      <section className={`${styles.hero} ${hasPhoto ? styles.heroWithPhoto : ""}`}>
        <HeroBackground mediaIds={backgrounds} overlay={landingPage?.backgroundOverlay ?? 0.55} />

        <div className={shared.heroContent}>
          <TenantLogo tenant={tenant} />
          <h1 className={styles.headline}>{landingPage?.headline || `Grow ${name}`}</h1>
          <p className={styles.subheadline}>
            {landingPage?.subheadline || "Tell your visitors why they should reach out."}
          </p>
          <a className={styles.ctaButton} href="#lead-form">
            {landingPage?.ctaLabel || "Get in touch"}
          </a>
        </div>
      </section>

      {landingPage?.features?.length > 0 && (
        <section className={styles.features}>
          {landingPage.features.map((feature, i) => {
            const accent = cardAccent(feature, styles);
            return (
            <div className={`${styles.featureCard} ${accent.className}`} style={accent.style} key={i}>
              {feature.icon && (
                <span className={styles.featureIcon}>
                  <LandingIcon name={feature.icon} size={26} />
                </span>
              )}
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
            );
          })}
        </section>
      )}

      {gallery.length > 0 && (
        <section className={styles.gallerySection}>
          <h2>Gallery</h2>
          <Gallery mediaIds={gallery} columns={landingPage?.galleryColumns || 3} />
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
