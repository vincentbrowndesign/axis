"use client";

import AxisReviewEditor from "@/components/review/AxisReviewEditor";
import type { SavedPossession } from "@/lib/review-types";

export default function Page() {
  function handleSavePossession(possession: SavedPossession) {
    console.log("saved possession", possession);
  }

  return <AxisReviewEditor onSavePossession={handleSavePossession} />;
}