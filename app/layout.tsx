import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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
        <ClerkProvider>
          <AuthRecoveryRedirect />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
