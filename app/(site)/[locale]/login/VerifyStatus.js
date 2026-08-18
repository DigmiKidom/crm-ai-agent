"use client";

import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

const MESSAGES = {
  success: { key: "auth.verifySuccess", className: "success" },
  invalid: { key: "auth.verifyInvalid", className: "error" },
  error: { key: "auth.verifyError", className: "error" },
};

export default function VerifyStatus() {
  const t = useT();
  const searchParams = useSearchParams();
  const verify = searchParams.get("verify");
  const info = verify && MESSAGES[verify];

  if (!info) return null;

  return <p className={info.className === "success" ? styles.success : styles.error}>{t(info.key)}</p>;
}
