import LogoMark from "./LogoMark";
import styles from "./Logo.module.css";

// iconOnly=true renders just the mark (compact contexts). Otherwise renders
// the full mark + wordmark lockup. Pass href={null} to render as a plain
// (non-link) span instead of an anchor.
export default function Logo({ href = "/", iconOnly = false, markSize = 28 }) {
  const inner = (
    <>
      <LogoMark size={markSize} />
      {!iconOnly && (
        <span className={styles.wordmark}>
          CRM<span className={styles.wordmarkAccent}> AI</span>
          <span className={styles.wordmarkMuted}> Agent</span>
        </span>
      )}
    </>
  );

  if (!href) return <span className={styles.lockup}>{inner}</span>;
  return (
    <a href={href} className={styles.lockup}>
      {inner}
    </a>
  );
}
