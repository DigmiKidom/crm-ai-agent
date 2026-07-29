"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({ className }) {
  return (
    <button className={className} onClick={() => signOut({ callbackUrl: "/login" })}>
      Sign out
    </button>
  );
}
