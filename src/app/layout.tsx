// src/app/layout.tsx

import "./globals.css";

export const metadata = {
  title: "Axis",
  description: "Review possessions. Tag decisions. Build the dataset.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}