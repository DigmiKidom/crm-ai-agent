import styles from "./templateThumbnail.module.css";

/**
 * A small abstract wireframe of what each landing template actually looks like,
 * so the picker shows layout rather than just a name and a paragraph.
 *
 * Intentionally neutral: every thumbnail uses the same grey palette rather than
 * the tenant's brand colours, so the comparison stays about structure. The real
 * colours are what the "Preview" link is for.
 *
 * These are hand-drawn approximations, not live renders — they cost nothing to
 * display, but they do need updating by hand if a template's layout changes
 * significantly. Each one mirrors the real structure of its template:
 *
 *   classic  → centred colour-block hero, 3-up feature grid, light form card
 *   minimal  → left-aligned editorial hero, hairline divider, list rows
 *   bold     → gradient hero, pill CTA, rounded cards, dark form band
 *   showcase → split hero with a framed 2x2 photo block, numbered rows, gallery
 */
export default function TemplateThumbnail({ id }) {
  return (
    <div className={styles.thumb} aria-hidden="true">
      {renderLayout(id)}
    </div>
  );
}

function renderLayout(id) {
  switch (id) {
    case "minimal":
      return <MinimalLayout />;
    case "bold":
      return <BoldLayout />;
    case "showcase":
      return <ShowcaseLayout />;
    default:
      return <ClassicLayout />;
  }
}

function ClassicLayout() {
  return (
    <>
      <div className={styles.classicHero}>
        <span className={`${styles.barOnDark} ${styles.classicHeadline}`} />
        <span className={`${styles.barOnDarkSoft} ${styles.classicSub}`} />
        <span className={styles.classicCta} />
      </div>
      <div className={styles.body}>
        <div className={styles.grid3}>
          {[0, 1, 2].map((i) => (
            <div className={styles.classicCard} key={i}>
              <span className={styles.classicCardIcon} />
              <span className={`${styles.bar} ${styles.classicCardBar}`} />
              <span className={`${styles.bar} ${styles.classicCardBarShort}`} />
            </div>
          ))}
        </div>
        <div className={styles.formBlock} />
      </div>
    </>
  );
}

function MinimalLayout() {
  return (
    <>
      <div className={styles.minimalHero}>
        <span className={styles.minimalEyebrow} />
        <span className={`${styles.bar} ${styles.minimalHeadline}`} />
        <span className={`${styles.bar} ${styles.minimalSub}`} />
        <span className={styles.minimalCta} />
      </div>
      <div className={styles.minimalDivider} />
      <div className={styles.body}>
        <div className={styles.rows}>
          {[0, 1, 2].map((i) => (
            <div className={styles.minimalRow} key={i}>
              <span className={styles.minimalRowIcon} />
              <span className={styles.minimalRowBars}>
                <span className={styles.bar} style={{ width: "62%", height: 3 }} />
                <span className={styles.bar} style={{ width: "84%", height: 2 }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function BoldLayout() {
  return (
    <>
      <div className={styles.boldHero}>
        <span className={`${styles.barOnDark} ${styles.boldHeadline}`} />
        <span className={`${styles.barOnDarkSoft} ${styles.boldSub}`} />
        <span className={styles.boldCta} />
      </div>
      <div className={styles.body}>
        <div className={styles.grid3}>
          {[0, 1, 2].map((i) => (
            <div className={styles.boldCard} key={i}>
              <span className={styles.boldCardIcon} />
              <span className={styles.bar} style={{ width: "78%", height: 2 }} />
              <span className={styles.bar} style={{ width: "56%", height: 2 }} />
            </div>
          ))}
        </div>
        <div className={styles.boldFormBand}>
          <span className={styles.boldFormCard} />
        </div>
      </div>
    </>
  );
}

function ShowcaseLayout() {
  return (
    <>
      <div className={styles.showcaseHero}>
        <div className={styles.showcaseHeroCopy}>
          <span className={styles.showcaseEyebrow} />
          <span className={`${styles.barOnDark} ${styles.showcaseHeadline}`} />
          <span className={`${styles.barOnDarkSoft} ${styles.showcaseSub}`} />
          <span className={styles.showcaseCta} />
        </div>
        <div className={styles.showcaseFrame}>
          {[0, 1, 2, 3].map((i) => (
            <span className={styles.showcaseFrameTile} key={i} />
          ))}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.rows}>
          {[0, 1].map((i) => (
            <div className={styles.showcaseRow} key={i}>
              <span className={styles.showcaseIndex} />
              <span className={styles.showcaseRowBars}>
                <span className={styles.bar} style={{ width: "58%", height: 3 }} />
                <span className={styles.bar} style={{ width: "80%", height: 2 }} />
              </span>
            </div>
          ))}
        </div>
        <div className={styles.showcaseGallery}>
          {[0, 1, 2].map((i) => (
            <span className={styles.showcaseGalleryTile} key={i} />
          ))}
        </div>
      </div>
    </>
  );
}
