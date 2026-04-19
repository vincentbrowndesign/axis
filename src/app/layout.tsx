import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Axis Review",
  description: "Axis BDT tagging system",
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