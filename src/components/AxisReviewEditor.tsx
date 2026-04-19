"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VideoState } from "@/lib/review-types";

export default function AxisReviewEditor() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [video, setVideo] = useState<VideoState | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (video?.url) URL.revokeObjectURL(video.url);
    };
  }, [video]);

  function handlePickFile(file: File) {
    if (!file.type.startsWith("video/")) {
      alert("Please choose a video file.");
      return;
    }

    if (video?.url) URL.revokeObjectURL(video.url);

    const url = URL.createObjectURL(file);
    setVideo({
      file,
      url,
      name: file.name,
    });

    setCurrentTime(0);
    setDuration(0);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    handlePickFile(file);
    event.target.value = "";
  }

  const timeLabel = useMemo(() => formatTime(currentTime), [currentTime]);
  const durationLabel = useMemo(() => formatTime(duration), [duration]);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {!video ? (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/5 p-8">
            <div className="mb-6">
              <div className="text-xs uppercase tracking-[0.24em] text-white/40">
                Axis Review
              </div>
              <h1 className="mt-3 text-3xl font-semibold">Upload video</h1>
              <p className="mt-2 text-sm text-white/55">
                Start with one full video. Review comes after.
              </p>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-lime-400 px-5 py-3 text-sm font-medium text-black"
            >
              Select video
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setVideo(null)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
            >
              Back
            </button>

            <div className="min-w-0 flex-1 text-center text-sm text-white/60">
              <div className="truncate">{video.name}</div>
            </div>

            <button
              type="button"
              className="rounded-full bg-lime-400/70 px-4 py-2 text-sm font-medium text-black"
            >
              Save
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
              <video
                ref={videoRef}
                src={video.url}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-black"
                onLoadedMetadata={(event) => {
                  setDuration(event.currentTarget.duration || 0);
                }}
                onTimeUpdate={(event) => {
                  setCurrentTime(event.currentTarget.currentTime || 0);
                }}
              />
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between text-sm text-white/55">
                <span>{timeLabel}</span>
                <span>{durationLabel}</span>
              </div>

              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.01}
                value={currentTime}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setCurrentTime(next);
                  if (videoRef.current) videoRef.current.currentTime = next;
                }}
                className="w-full"
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-full bg-lime-400 px-4 py-2 text-sm font-medium text-black">
                  Start
                </button>
                <button className="rounded-full bg-lime-400 px-4 py-2 text-sm font-medium text-black">
                  End
                </button>
                <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                  Undo
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85">
                  Drive
                </button>
                <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85">
                  Pass
                </button>
                <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85">
                  Shot
                </button>
              </div>

              <div className="mt-6 text-sm text-white/55">
                No possession story yet.
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}