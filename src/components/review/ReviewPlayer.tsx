"use client";

import { useEffect, useRef } from "react";

type Props = {
  videoUrl: string;
  onReady?: (durationSec: number) => void;
  onTimeChange?: (timeSec: number) => void;
  currentTimeSec: number;
};

export default function ReviewPlayer({
  videoUrl,
  onReady,
  onTimeChange,
  currentTimeSec,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      onReady?.(video.duration || 0);
    };

    const onTimeUpdate = () => {
      onTimeChange?.(video.currentTime || 0);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [onReady, onTimeChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Math.abs(video.currentTime - currentTimeSec) > 0.05) {
      video.currentTime = currentTimeSec;
    }
  }, [currentTimeSec]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/8 bg-black">
      <div className="relative aspect-[9/16] w-full max-h-[58vh] bg-black">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/35">
            Upload a video to begin
          </div>
        )}
      </div>
    </div>
  );
}