"use client";

import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";

const MESSAGES = {
  success: { text: "Email verified — you're all set.", className: "success" },
  invalid: { text: "That verification link is invalid or expired.", className: "error" },
  error: { text: "Something went wrong verifying your email. Try again from your account.", className: "error" },
};

export default function VerifyStatus() {
  const searchParams = useSearchParams();
  const verify = searchParams.get("verify");
  const info = verify && MESSAGES[verify];

  if (!info) return null;

  return <p className={info.className === "success" ? styles.success : styles.error}>{info.text}</p>;
}
