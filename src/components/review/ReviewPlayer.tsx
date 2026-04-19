"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

type Props = {
  videoUrl: string;
  onReady?: (durationSec: number) => void;
  onTimeChange?: (timeSec: number) => void;
  currentTimeSec: number;
  isPlaying?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
};

const ReviewPlayer = forwardRef<HTMLVideoElement | null, Props>(
  function ReviewPlayer(
    {
      videoUrl,
      onReady,
      onTimeChange,
      currentTimeSec,
      isPlaying = false,
      onPlayStateChange,
    }: Props,
    ref
  ) {
    const innerRef = useRef<HTMLVideoElement | null>(null);

    useImperativeHandle(ref, () => innerRef.current, []);

    useEffect(() => {
      const video = innerRef.current;
      if (!video) return;

      const handleLoadedMetadata = () => {
        onReady?.(video.duration || 0);
      };

      const handleTimeUpdate = () => {
        onTimeChange?.(video.currentTime || 0);
      };

      const handlePlay = () => {
        onPlayStateChange?.(true);
      };

      const handlePause = () => {
        onPlayStateChange?.(false);
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
      };
    }, [onReady, onTimeChange, onPlayStateChange, videoUrl]);

    useEffect(() => {
      const video = innerRef.current;
      if (!video) return;

      if (Math.abs(video.currentTime - currentTimeSec) > 0.05) {
        video.currentTime = currentTimeSec;
      }
    }, [currentTimeSec]);

    useEffect(() => {
      const video = innerRef.current;
      if (!video || !videoUrl) return;

      if (isPlaying) {
        video.play().catch(() => {
          onPlayStateChange?.(false);
        });
      } else {
        video.pause();
      }
    }, [isPlaying, videoUrl, onPlayStateChange]);

    return (
      <div className="overflow-hidden rounded-[24px] border border-white/8 bg-black">
        <div className="relative aspect-[9/16] w-full max-h-[58vh] bg-black">
          {videoUrl ? (
            <video
              ref={innerRef}
              src={videoUrl}
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
);

export default ReviewPlayer;