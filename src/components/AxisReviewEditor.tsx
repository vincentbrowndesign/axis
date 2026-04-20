"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  videoUrl: string;
};

function formatTime(time: number) {
  if (!Number.isFinite(time)) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function AxisReviewEditor({ videoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [videoUrl]);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function handleSeek(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  }

  function skipBy(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = next;
    setCurrentTime(next);
  }

  return (
    <div className="flex h-full w-full flex-col bg-black text-white">
      <div className="flex-1 p-4">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-2xl border border-neutral-800 bg-neutral-950">
          <div className="flex-1 flex items-center justify-center p-4">
            <video
              ref={videoRef}
              src={videoUrl}
              className="max-h-full w-full rounded-xl bg-black"
              playsInline
              preload="metadata"
            />
          </div>

          <div className="border-t border-neutral-800 p-4">
            <div className="mb-3 flex items-center justify-between text-sm text-neutral-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full"
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => skipBy(-5)}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
              >
                -5s
              </button>

              <button
                onClick={togglePlay}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>

              <button
                onClick={() => skipBy(5)}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
              >
                +5s
              </button>
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              Progress: {progress.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}