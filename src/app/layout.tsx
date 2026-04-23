import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bridge Shooting System V1",
  description: "Upload, analyze, and review mock shooting data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}