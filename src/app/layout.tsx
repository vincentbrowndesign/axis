import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Axis Review",
  description: "Review and insights",
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