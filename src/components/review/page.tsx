// src/app/review/page.tsx

"use client";

import { useState } from "react";
import AxisReviewEditor from "@/components/review/AxisReviewEditor";

export default function ReviewPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  }

  return (
    <main className="min-h-screen px-8 py-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="text-xs tracking-widest text-neutral-500">AXIS</div>
          <div className="text-neutral-300">Review Session</div>
        </div>

        <div className="text-sm text-neutral-400">
          Single Playhead • Live Tagging
        </div>
      </div>

      {/* UPLOAD */}
      {!videoUrl && (
        <div className="card p-6 rounded-xl max-w-md">
          <div className="mb-4 text-sm text-neutral-400">
            Upload video to start review
          </div>

          <input
            type="file"
            accept="video/*"
            onChange={handleUpload}
            className="block w-full text-sm"
          />
        </div>
      )}

      {/* REVIEW SYSTEM */}
      {videoUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* MAIN PLAYER + CONTROLS */}
          <div className="lg:col-span-2">
            <AxisReviewEditor src={videoUrl} />
          </div>

          {/* RIGHT PANEL */}
          <div className="card p-5 rounded-xl text-sm">
            <div className="mb-3 text-neutral-400">Session Info</div>

            <div className="space-y-2 text-neutral-300">
              <div>Single timeline</div>
              <div>Linked decisions</div>
              <div>Possession logic active</div>
            </div>

            <div className="mt-6 text-neutral-500 text-xs">
              Pass → Drive → Shot  
              Drive → Help → Kick → Shot  
              Shot → Make / Miss → Reset
            </div>
          </div>

        </div>
      )}
    </main>
  );
}