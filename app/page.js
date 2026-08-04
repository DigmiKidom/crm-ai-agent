import Logo from "@/components/Logo";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.logoRow}>
          <Logo href={null} markSize={36} />
        </div>
        <h1 className={styles.title}>CRM AI Agent</h1>
        <p className={styles.subtitle}>
          Sign up, tell us about your company, and get a lead-capturing landing page plus a
          CRM tailored to your business — generated for you.
        </p>
        <div className={styles.ctas}>
          <a className={styles.primary} href="/signup">
            Get started
          </a>
          <a className={styles.secondary} href="/login">
            Log in
          </a>
        </div>
        <p className={styles.footer}>
          <a href="/terms">Terms of Use</a>
        </p>
      </div>
    </div>
  );
}
