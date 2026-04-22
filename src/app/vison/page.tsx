"use client";

import dynamic from "next/dynamic";

const VisionOverlay = dynamic(
  () => import("@/components/VisionOverlay"),
  { ssr: false }
);

export default function Page() {
  return <VisionOverlay />;
}