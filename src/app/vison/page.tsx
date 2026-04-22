"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Lane = "Left" | "Middle" | "Right";
type SuggestionState = {
  lane: Lane;
  downhill: boolean;
  help: "Unknown";
};

type Point = {
  x: number; // 0..1
  y: number; // 0..1
  t: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getLane(x: number): Lane {
  if (x < 1 / 3) return "Left";
  if (x > 2 / 3) return "Right";
  return "Middle";
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function averageDelta(points: Point[]) {
  if (points.length < 2) return { dx: 0, dy: 0 };
  let dx = 0;
  let dy = 0;

  for (let i = 1; i < points.length; i += 1) {
    dx += points[i].x - points[i - 1].x;
    dy += points[i].y - points[i - 1].y;
  }

  return {
    dx: dx / (points.length - 1),
    dy: dy / (points.length - 1),
  };
}

function inferSuggestions(points: Point[]): SuggestionState {
  const last = points[points.length - 1];
  const lane = last ? getLane(last.x) : "Middle";
  const { dy } = averageDelta(points);

  // Smaller y means moving toward top/rim on the overlay.
  // Negative dy = moving upward = downhill.
  const downhill = dy < -0.003;

  return {
    lane,
    downhill,
    help: "Unknown",
  };
}

export default function VisionOverlayPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [durationSec, setDurationSec] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [trackedPoints, setTrackedPoints] = useState<Point[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => setDurationSec(video.duration || 0);
    const onTime = () => setCurrentSec(video.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnded);
    };
  }, [videoUrl]);

  const suggestions = useMemo(() => inferSuggestions(trackedPoints), [trackedPoints]);

  const currentPoint = trackedPoints[trackedPoints.length - 1] ?? null;

  function openPicker() {
    fileInputRef.current?.click();
  }

  function handleUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      alert("Please choose a video file.");
      return;
    }

    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setVideoName(file.name);
    setDurationSec(0);
    setCurrentSec(0);
    setIsPlaying(false);
    setTrackedPoints([]);
    setTrackingEnabled(false);
  }

  function playPause() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function seekTo(sec: number) {
    const video = videoRef.current;
    if (!video) return;

    const safe = clamp(sec, 0, durationSec || 0);
    video.currentTime = safe;
    setCurrentSec(safe);
  }

  function toNormalizedPoint(clientX: number, clientY: number) {
    const overlay = overlayRef.current;
    if (!overlay) return null;

    const rect = overlay.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);

    return { x, y };
  }

  function commitPoint(x: number, y: number) {
    const video = videoRef.current;
    const t = video?.currentTime ?? currentSec;

    setTrackedPoints((prev) => {
      const next = [...prev, { x, y, t }];
      return next.slice(-24);
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!trackingEnabled) return;
    const point = toNormalizedPoint(e.clientX, e.clientY);
    if (!point) return;

    setDragging(true);
    commitPoint(point.x, point.y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!trackingEnabled || !dragging) return;
    const point = toNormalizedPoint(e.clientX, e.clientY);
    if (!point) return;

    commitPoint(point.x, point.y);
  }

  function handlePointerUp() {
    setDragging(false);
  }

  function dropLastPoint() {
    setTrackedPoints((prev) => prev.slice(0, -1));
  }

  function resetTracking() {
    setTrackedPoints([]);
  }

  const progressPct = durationSec > 0 ? (currentSec / durationSec) * 100 : 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex flex-col gap-3 border-b border-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Axis</p>
            <h1 className="text-lg font-semibold tracking-tight">Vision Overlay</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={openPicker}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:border-white/20"
            >
              Upload video
            </button>
            <button
              onClick={() => setTrackingEnabled((v) => !v)}
              disabled={!videoUrl}
              className={`rounded-xl px-3 py-2 text-sm transition disabled:opacity-40 ${
                trackingEnabled
                  ? "bg-lime-400 text-black"
                  : "border border-white/10 text-white/85 hover:border-white/20"
              }`}
            >
              {trackingEnabled ? "Tracking on" : "Tracking off"}
            </button>
            <button
              onClick={dropLastPoint}
              disabled={!trackedPoints.length}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:border-white/20 disabled:opacity-40"
            >
              Undo point
            </button>
            <button
              onClick={resetTracking}
              disabled={!trackedPoints.length}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:border-white/20 disabled:opacity-40"
            >
              Reset points
            </button>
          </div>
        </header>

        {!videoUrl ? (
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-10 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-lime-400">Vision bridge</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Suggest the tag before the tap.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60">
              Upload a clip, place a tracked point on the ball handler path, and let the system
              infer lane and downhill from movement.
            </p>

            <button
              onClick={openPicker}
              className="mt-8 rounded-2xl bg-lime-400 px-6 py-4 text-base font-medium text-black transition hover:opacity-90"
            >
              Upload clip
            </button>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_360px]">
            <section className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03]">
                <div
                  ref={overlayRef}
                  className="relative bg-black"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls={false}
                    playsInline
                    className="h-[260px] w-full bg-black object-contain md:h-[420px]"
                  />

                  {/* Court-ish overlay */}
                  <div className="pointer-events-none absolute inset-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full">
                      <line x1="33.33" y1="0" x2="33.33" y2="100" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
                      <line x1="66.66" y1="0" x2="66.66" y2="100" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
                      <rect x="28" y="6" width="44" height="18" fill="transparent" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" />
                      <circle cx="50" cy="12" r="1.2" fill="rgba(255,255,255,0.45)" />

                      {trackedPoints.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="rgba(163,230,53,0.95)"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={trackedPoints.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
                        />
                      )}

                      {currentPoint && (
                        <circle
                          cx={currentPoint.x * 100}
                          cy={currentPoint.y * 100}
                          r="2.2"
                          fill="rgba(163,230,53,0.98)"
                        />
                      )}
                    </svg>
                  </div>

                  {!trackingEnabled ? (
                    <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white/70 backdrop-blur">
                      Turn on tracking, then drag on the video to mark the ball-handler path.
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4 border-t border-white/8 px-4 py-4">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{formatTime(currentSec)}</span>
                    <span>{formatTime(durationSec)}</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={durationSec || 0}
                    step={0.01}
                    value={currentSec}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
                  />

                  <div className="h-1.5 w-full rounded-full bg-white/5">
                    <div className="h-1.5 rounded-full bg-white" style={{ width: `${progressPct}%` }} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={playPause}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm transition hover:border-white/20"
                    >
                      {isPlaying ? "Pause" : "Play"}
                    </button>
                    <button
                      onClick={() => seekTo(currentSec - 2)}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm transition hover:border-white/20"
                    >
                      -2s
                    </button>
                    <button
                      onClick={() => seekTo(currentSec + 2)}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm transition hover:border-white/20"
                    >
                      +2s
                    </button>

                    <div className="ml-auto text-[10px] uppercase tracking-[0.22em] text-white/35">
                      {videoName}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">How this works</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
                    <p className="text-sm font-medium text-white">1. Track path</p>
                    <p className="mt-2 text-sm text-white/60">
                      Drag over the ball-handler path to create point samples.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
                    <p className="text-sm font-medium text-white">2. Infer movement</p>
                    <p className="mt-2 text-sm text-white/60">
                      The system reads lane from x-position and downhill from upward movement.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
                    <p className="text-sm font-medium text-white">3. Confirm later</p>
                    <p className="mt-2 text-sm text-white/60">
                      Next step is feeding these suggestions into the capture prompts.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Vision suggestions</p>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Where</p>
                    <p className="mt-1 text-lg text-white">{suggestions.lane}</p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Downhill</p>
                    <p className="mt-1 text-lg text-white">{suggestions.downhill ? "Yes" : "No"}</p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Help</p>
                    <p className="mt-1 text-lg text-white/70">{suggestions.help}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Tracked signal</p>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Points</p>
                    <p className="mt-1 text-lg text-white">{trackedPoints.length}</p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Current x / y</p>
                    <p className="mt-1 text-sm text-white">
                      {currentPoint
                        ? `${currentPoint.x.toFixed(2)} / ${currentPoint.y.toFixed(2)}`
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Next build</p>
                    <p className="mt-1 text-sm text-white/70">
                      Add help detection from a second tracked defender entering the lane radius.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}