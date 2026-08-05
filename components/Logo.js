import LogoMark from "./LogoMark";
import styles from "./Logo.module.css";

// iconOnly=true renders just the mark (compact contexts). Otherwise renders
// the full Ceramony logo lockup (served from /public/logo/ceramony-logo.svg).
// Pass href={null} to render as a plain (non-link) span instead of an anchor.
export default function Logo({ href = "/", iconOnly = false, markSize = 28 }) {
  const inner = iconOnly ? (
    <LogoMark size={markSize} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo/ceramony-logo.svg"
      alt="Ceramony"
      style={{ height: markSize, width: "auto", display: "block" }}
    />
  );

  if (!href) return <span className={styles.lockup}>{inner}</span>;
  return (
    <a href={href} className={styles.lockup}>
      {inner}
    </a>
  );
}
