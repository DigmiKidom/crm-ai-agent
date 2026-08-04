import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";
import styles from "./page.module.css";

export default function ResetPasswordPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Set a new password</h1>
        <p className={styles.subtitle}>Choose a new password for your account.</p>

        <Suspense fallback={<p className={styles.subtitle}>Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>

        <p className={styles.footer}>
          <a href="/login">Back to log in</a>
        </p>
      </div>
    </div>
  );
}
