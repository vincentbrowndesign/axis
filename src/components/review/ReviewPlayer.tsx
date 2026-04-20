"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ChangeEvent,
} from "react";

type Props = {
  src: string | null;
  currentTimeSec: number;
  isPlaying?: boolean;
  onTimeUpdate?: (timeSec: number) => void;
  onDurationChange?: (durationSec: number) => void;
  onLoadedMetadata?: (durationSec: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  className?: string;
};

const ReviewPlayer = forwardRef<HTMLVideoElement, Props>(function ReviewPlayer(
  {
    src,
    currentTimeSec,
    isPlaying = false,
    onTimeUpdate,
    onDurationChange,
    onLoadedMetadata,
    onPlayStateChange,
    className,
  },
  ref
) {
  const innerRef = useRef<HTMLVideoElement | null>(null);

  useImperativeHandle(ref, () => {
    if (!innerRef.current) {
      throw new Error("Video ref not ready");
    }
    return innerRef.current;
  }, []);

  useEffect(() => {
    const video = innerRef.current;
    if (!video || !src) return;

    const safeCurrent = Number.isFinite(currentTimeSec) ? currentTimeSec : 0;
    const diff = Math.abs(video.currentTime - safeCurrent);

    if (diff > 0.2) {
      video.currentTime = safeCurrent;
    }
  }, [currentTimeSec, src]);

  useEffect(() => {
    const video = innerRef.current;
    if (!video || !src) return;

    if (isPlaying) {
      void video.play().catch(() => {
        onPlayStateChange?.(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, src, onPlayStateChange]);

  function handleTimeUpdate(e: ChangeEvent<HTMLVideoElement> | React.SyntheticEvent<HTMLVideoElement>) {
    onTimeUpdate?.(e.currentTarget.currentTime);
  }

  function handleLoadedMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    const duration = e.currentTarget.duration || 0;
    onDurationChange?.(duration);
    onLoadedMetadata?.(duration);
  }

  function handlePlay() {
    onPlayStateChange?.(true);
  }

  function handlePause() {
    onPlayStateChange?.(false);
  }

  if (!src) {
    return (
      <div
        className={
          className ??
          "flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/50"
        }
      >
        No video selected.
      </div>
    );
  }

  return (
    <video
      ref={innerRef}
      src={src}
      controls
      playsInline
      preload="metadata"
      className={
        className ??
        "aspect-video w-full rounded-2xl border border-white/10 bg-black"
      }
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onPlay={handlePlay}
      onPause={handlePause}
    />
  );
});

export default ReviewPlayer;