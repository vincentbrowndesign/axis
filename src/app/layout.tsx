import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Axis Review",
  description: "Axis video review",
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