import styles from "./bold.module.css";
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

  return (
    <div className={styles.page} style={themeVars}>
      {/* Bold keeps its gradient even with a photo — the gradient sits over the
          image at reduced opacity so the brand colour stays present instead of
          handing the whole hero over to the photo. */}
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
              <div
                className={`${styles.featureCard} ${accent.className}`}
                style={accent.style}
                key={i}
              >
                {/* Bold's icon tile is part of the layout, so it renders even
                    without an icon chosen — it just sits empty. */}
                <div className={styles.featureIcon}>
                  <LandingIcon name={feature.icon} size={22} strokeWidth={2} />
                </div>
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
