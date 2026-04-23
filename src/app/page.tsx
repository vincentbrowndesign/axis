"use client";

import { useState } from "react";
import UploadBox from "@/components/UploadBox";
import ShotResults from "@/components/ShotResults";
import type { AnalyzeResponse } from "@/lib/types";

export default function Page() {
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  return (
    <main className="page-shell">
      <div className="page-inner">
        <div className="hero">
          <p className="eyebrow">BRIDGE SHOOTING SYSTEM V1</p>
          <h1 className="page-title">Upload. Analyze. Review.</h1>
          <p className="page-copy">
            This is the test shell for our shooting workflow. Right now it uses
            mocked shot data so we can validate the product loop before adding
            real vision.
          </p>
        </div>

        <div className="grid">
          <UploadBox onResult={setResult} />
          <ShotResults shots={result?.shots ?? []} />
        </div>
      </div>
    </main>
  );
}