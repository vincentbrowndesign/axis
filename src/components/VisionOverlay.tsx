"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Lane = "Left" | "Middle" | "Right";

type SuggestionState = {
  lane: Lane;
  downhill: boolean;
  help: "Unknown";
  confidence: number;
};

type Sample = {
  t: number;
  x: number;
  y: number;
  score: number;
};

type KeypointLite = {
  name?: string;
  x: number;
  y: number;
  score?: number;
};

type PoseDetectorLite = {
  estimatePoses: (
    input: HTMLVideoElement,
    config?: { flipHorizontal?: boolean }
  ) => Promise<Array<{ keypoints: KeypointLite[] }>>;
  dispose?: () => Promise<void> | void;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getLane(x: number): Lane {
  if (x < 1 / 3) return "Left";
  if (x > 2 / 3) return "Right";
  return "Middle";
}

function averageDelta(samples: Sample[]) {
  if (samples.length < 2) return { dx: 0, dy: 0 };

  let dx = 0;
  let dy = 0;

  for (let i = 1; i < samples.length; i += 1) {
    dx += samples[i].x - samples[i - 1].x;
    dy += samples[i].y - samples[i - 1].y;
  }

  return {
    dx: dx / (samples.length - 1),
    dy: dy / (samples.length - 1),
  };
}

function inferSuggestion(samples: Sample[]): SuggestionState {
  const last = samples[samples.length - 1];
  const lane = last ? getLane(last.x) : "Middle";
  const { dy } = averageDelta(samples);

  return {
    lane,
    downhill: dy < -0.0025,
    help: "Unknown",
    confidence: last?.score ?? 0,
  };
}

function getHipCenter(keypoints: KeypointLite[]) {
  const leftHip = keypoints.find((k) => k.name === "left_hip");
  const rightHip = keypoints.find((k) => k.name === "right_hip");

  if (!leftHip || !rightHip) return null;
  if ((leftHip.score ?? 0) < 0.25 || (rightHip.score ?? 0) < 0.25) return null;

  return {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    score: Math.min(leftHip.score ?? 0, rightHip.score ?? 0),
  };
}

export default function VisionOverlay() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayWrapRef = useRef<HTMLDivElement | null>(null);
  const detectorRef = useRef<PoseDetectorLite | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastInferenceRef = useRef<number>(0);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [durationSec, setDurationSec] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [poseError, setPoseError] = useState<string | null>(null);

  const [samples, setSamples] = useState<Sample[]>([]);
  const [skeleton, setSkeleton] = useState<KeypointLite[]>([]);
  const [autoTrack, setAutoTrack] = useState(true);

  const suggestion = useMemo(() => inferSuggestion(samples), [samples]);
  const currentPoint = samples[samples.length - 1] ?? null;

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const detector = detectorRef.current;
      if (detector?.dispose) void detector.dispose();
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

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      if (detectorRef.current || modelLoading) return;

      setModelLoading(true);
      setPoseError(null);

      try {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        const poseDetection = await import("@tensorflow-models/pose-detection");

        await tf.setBackend("webgl");
        await tf.ready();

        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );

        if (cancelled) {
          if (detector.dispose) await detector.dispose();
          return;
        }

        detectorRef.current = detector as PoseDetectorLite;
        setModelReady(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load MoveNet";
        if (!cancelled) setPoseError(message);
      } finally {
        if (!cancelled) setModelLoading(false);
      }
    }

    void loadModel();

    return () => {
      cancelled = true;
    };
  }, [modelLoading]);

  useEffect(() => {
    if (!videoUrl || !autoTrack || !modelReady) return;

    let cancelled = false;

    const loop = async () => {
      const video = videoRef.current;
      const detector = detectorRef.current;

      if (cancelled) return;

      if (!video || !detector) {
        rafRef.current = requestAnimationFrame(() => {
          void loop();
        });
        return;
      }

      if (
        !video.paused &&
        !video.ended &&
        video.readyState >= 2 &&
        performance.now() - lastInferenceRef.current > 100
      ) {
        lastInferenceRef.current = performance.now();

        try {
          const poses = await detector.estimatePoses(video, {
            flipHorizontal: false,
          });

          const pose = poses[0];
          if (pose?.keypoints?.length) {
            setSkeleton(pose.keypoints);

            const center = getHipCenter(pose.keypoints);
            if (center && video.videoWidth && video.videoHeight) {
              const x = clamp(center.x / video.videoWidth, 0, 1);
              const y = clamp(center.y / video.videoHeight, 0, 1);
              const t = video.currentTime;

              setSamples((prev) => {
                const next = [...prev, { x, y, t, score: center.score }];
                return next.slice(-30);
              });
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Pose estimation failed";
          setPoseError(message);
        }
      }

      rafRef.current = requestAnimationFrame(() => {
        void loop();
      });
    };

    rafRef.current = requestAnimationFrame(() => {
      void loop();
    });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [videoUrl, autoTrack, modelReady]);

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
    setSamples([]);
    setSkeleton([]);
    setPoseError(null);
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

  function addManualPoint(clientX: number, clientY: number) {
    const wrap = overlayWrapRef.current;
    const video = videoRef.current;
    if (!wrap || !video) return;

    const rect = wrap.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);

    setSamples((prev) => {
      const next = [...prev, { x, y, t: video.currentTime, score: 1 }];
      return next.slice(-30);
    });
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
            <h1 className="text-lg font-semibold tracking-tight">MoveNet Overlay</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={openPicker}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:border-white/20"
            >
              Upload video
            </button>
            <button
              onClick={() => setAutoTrack((v) => !v)}
              disabled={!videoUrl || !modelReady}
              className={`rounded-xl px-3 py-2 text-sm transition disabled:opacity-40 ${
                autoTrack
                  ? "bg-lime-400 text-black"
                  : "border border-white/10 text-white/85 hover:border-white/20"
              }`}
            >
              {autoTrack ? "Auto track on" : "Auto track off"}
            </button>
            <button
              onClick={() => {
                setSamples([]);
                setSkeleton([]);
              }}
              disabled={!samples.length && !skeleton.length}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:border-white/20 disabled:opacity-40"
            >
              Reset tracking
            </button>
          </div>
        </header>

        {!videoUrl ? (
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-10 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-lime-400">MoveNet</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Detect the body. Infer the lane.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60">
              Upload a clip, let MoveNet estimate the pose, and use hip-center movement to suggest
              lane and downhill.
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
                  ref={overlayWrapRef}
                  className="relative bg-black"
                  onClick={(e) => {
                    if (autoTrack) return;
                    addManualPoint(e.clientX, e.clientY);
                  }}
                >
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls={false}
                    playsInline
                    className="h-[260px] w-full bg-black object-contain md:h-[420px]"
                  />

                  <div className="pointer-events-none absolute inset-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full">
                      <line x1="33.33" y1="0" x2="33.33" y2="100" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
                      <line x1="66.66" y1="0" x2="66.66" y2="100" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
                      <rect x="28" y="6" width="44" height="18" fill="transparent" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" />
                      <circle cx="50" cy="12" r="1.2" fill="rgba(255,255,255,0.45)" />

                      {samples.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="rgba(163,230,53,0.95)"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={samples.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
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

                      {skeleton.map((kp, index) => {
                        const score = kp.score ?? 0;
                        if (score < 0.25) return null;

                        const videoWidth = videoRef.current?.videoWidth || 1;
                        const videoHeight = videoRef.current?.videoHeight || 1;

                        return (
                          <circle
                            key={`${kp.name ?? "kp"}-${index}`}
                            cx={(kp.x / videoWidth) * 100}
                            cy={(kp.y / videoHeight) * 100}
                            r="0.9"
                            fill="rgba(255,255,255,0.75)"
                          />
                        );
                      })}
                    </svg>
                  </div>

                  <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white/70 backdrop-blur">
                    {autoTrack
                      ? "MoveNet is estimating pose and tracking hip-center movement."
                      : "Manual mode: tap the video to place points when auto tracking is off."}
                  </div>
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
            </section>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Model status</p>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Backend</p>
                    <p className="mt-1 text-lg text-white">webgl</p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">MoveNet</p>
                    <p className="mt-1 text-lg text-white">
                      {modelLoading ? "Loading…" : modelReady ? "Ready" : "Not ready"}
                    </p>
                  </div>

                  {poseError ? (
                    <div className="rounded-2xl border border-red-400/30 bg-red-400/[0.08] p-3 text-sm text-red-100">
                      {poseError}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Suggestions</p>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Where</p>
                    <p className="mt-1 text-lg text-white">{suggestion.lane}</p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Downhill</p>
                    <p className="mt-1 text-lg text-white">{suggestion.downhill ? "Yes" : "No"}</p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Help</p>
                    <p className="mt-1 text-lg text-white/70">{suggestion.help}</p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Tracking confidence</p>
                    <p className="mt-1 text-lg text-white">{suggestion.confidence.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Signal</p>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Samples</p>
                    <p className="mt-1 text-lg text-white">{samples.length}</p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Manual fallback</p>
                    <p className="mt-1 text-sm text-white/70">
                      Turn auto tracking off and tap points if the detector drifts.
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