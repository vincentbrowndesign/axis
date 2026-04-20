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

  function handleUpload(file: File) {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  }

  function clearVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
  }

  return (
    <div className="min-h-screen w-full bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-neutral-800 bg-black/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between p-4">
          <h1 className="text-lg font-semibold">Review</h1>

          {videoUrl && (
            <button
              onClick={clearVideo}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
            >
              New Clip
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-6xl">
        {videoUrl ? (
          <AxisReviewEditor videoUrl={videoUrl} />
        ) : (
          <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-6 p-6 text-center">
            <div className="text-sm text-neutral-400">
              Upload one clip. Build possessions from it.
            </div>

            <label className="cursor-pointer rounded-xl bg-white px-5 py-3 text-black text-sm font-medium">
              Upload Video
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  handleUpload(file);
                }}
              />
            </label>

            <div className="text-xs text-neutral-600">
              Tip: shorter clips = faster tagging
            </div>
          </div>
        )}
      </div>
    </div>
  );
}