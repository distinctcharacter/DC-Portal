"use client";

import { useEffect } from "react";

export function AuthRecoveryRedirect() {
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash.includes("type=recovery")) return;
    if (window.location.pathname === "/reset-password") return;

    window.location.replace(`/reset-password${hash}`);
  }, []);

  return null;
}
