"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      onClick={async () => { await signOut({ redirect: false }); window.location.href = "/"; }}
    >
      Sign Out
    </Button>
  );
}
