"use client";

import { signOut } from "next-auth/react";
import { IconLogout } from "@/components/icons";
import { useT } from "@/components/i18n/LocaleProvider";

export default function SignOutButton({ className }) {
  const t = useT();

  return (
    <button
      className={className}
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <IconLogout size={16} />
      {t("account.signOut")}
    </button>
  );
}
