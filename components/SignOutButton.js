"use client";

import { signOut } from "next-auth/react";
import { IconLogout } from "@/components/icons";

export default function SignOutButton({ className }) {
  return (
    <button
      className={className}
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <IconLogout size={16} />
      Sign out
    </button>
  );
}
