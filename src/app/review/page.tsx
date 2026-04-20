"use client";

import { useEffect, useState } from "react";
import AxisReviewEditor from "@/components/AxisReviewEditor";

export default function ReviewPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  function clearVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
  }

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="sticky top-0 z-40 border-b border-neutral-800 bg-black/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between p-4">
          <h1 className="text-lg font-semibold">Review</h1>

          {videoUrl && (
            <button
              onClick={clearVideo}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
            >
              Clear Video
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl">
        {videoUrl ? (
          <AxisReviewEditor videoUrl={videoUrl} />
        ) : (
          <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
            <label className="cursor-pointer rounded-xl bg-white px-4 py-2 text-black">
              Upload Video
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  setVideoUrl(url);
                }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}