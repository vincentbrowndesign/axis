import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Axis Review",
  description: "Possession review and export",
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