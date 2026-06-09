import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Distinct Character Protocol Portal",
  description: "Functional MVP prototype for the Distinct Character protocol operating system."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
