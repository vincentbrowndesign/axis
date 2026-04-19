"use client";

import { useEffect, useRef, useState } from "react";

type VideoState = {
  file: File;
  url: string;
  name: string;
  type: string;
  size: number;
};

export default function AxisReviewEditor() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [video, setVideo] = useState<VideoState | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    return () => {
      if (video?.url) URL.revokeObjectURL(video.url);
    };
  }, [video]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

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
      type: file.type,
      size: file.size,
    });

    setCurrentTime(0);
    setDuration(0);
    setStatus("loading");
    setErrorMessage("");

    event.target.value = "";
  }

  function resetVideo() {
    if (video?.url) URL.revokeObjectURL(video.url);
    setVideo(null);
    setCurrentTime(0);
    setDuration(0);
    setStatus("idle");
    setErrorMessage("");
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!video ? (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/5 p-8">
            <div className="text-xs uppercase tracking-[0.24em] text-white/40">
              Axis Review
            </div>
            <h1 className="mt-3 text-3xl font-semibold">Upload video</h1>
            <p className="mt-2 text-sm text-white/55">
              Start with one full game, one quarter, or one clip.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full bg-lime-400 px-5 py-3 text-sm font-medium text-black"
              >
                Select video
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetVideo}
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

          <div className="grid flex-1 gap-5 lg:grid-cols-[1.5fr_0.5fr]">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black">
                <video
                  ref={videoRef}
                  src={video.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full bg-black"
                  onLoadedMetadata={(event) => {
                    setDuration(event.currentTarget.duration || 0);
                    setStatus("ready");
                    setErrorMessage("");
                  }}
                  onLoadedData={() => {
                    setStatus("ready");
                  }}
                  onTimeUpdate={(event) => {
                    setCurrentTime(event.currentTarget.currentTime || 0);
                  }}
                  onError={() => {
                    setStatus("error");
                    setErrorMessage(
                      "This file was selected, but the browser could not load or decode it."
                    );
                  }}
                />
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm text-white/55">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.01}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setCurrentTime(next);
                    if (videoRef.current) {
                      videoRef.current.currentTime = next;
                    }
                  }}
                  className="w-full"
                />
              </div>

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
            </section>

            <aside className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                Debug
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <InfoRow label="Status" value={status} />
                <InfoRow label="Name" value={video.name} />
                <InfoRow label="Type" value={video.type || "Unknown"} />
                <InfoRow label="Size" value={formatBytes(video.size)} />
                <InfoRow label="Duration" value={formatTime(duration)} />
              </div>

              {errorMessage ? (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              ) : null}

              <div className="mt-6 text-sm text-white/55">
                No possession story yet.
              </div>
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-white/40">{label}</div>
      <div className="mt-1 break-all text-white/80">{value}</div>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}