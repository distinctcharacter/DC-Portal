import type { Metadata } from "next";
import { AuthRecoveryRedirect } from "@/components/AuthRecoveryRedirect";
import "./globals.css";

export const metadata: Metadata = {
  title: "Distinct Character Protocol Portal",
  description: "Distinct Character protocol operating system."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthRecoveryRedirect />
        {children}
      </body>
    </html>
  );
}
