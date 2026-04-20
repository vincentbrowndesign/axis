"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addRootActionToState,
  applyContextAction,
  getContextButtons,
} from "@/lib/possession-logic";
import type {
  AssetResponse,
  Clip,
  ContextAction,
  Marker,
  PendingFlow,
  PossessionChain,
  ReviewTab,
  RootAction,
  UploadState,
} from "@/lib/possession-types";

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds)) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createId() {
  return crypto.randomUUID();
}

const ROOT_ACTIONS: RootAction[] = [
  "catch",
  "drive",
  "pass",
  "shot",
  "turnover",
  "reset",
  "foul",
];

const ROOT_BUTTON_STYLES: Record<RootAction, string> = {
  catch: "border-white/12 bg-white/6 text-white/86 hover:bg-white/10",
  drive:
    "border-emerald-400/28 bg-emerald-400/14 text-emerald-100 hover:bg-emerald-400/20",
  pass:
    "border-violet-400/28 bg-violet-400/14 text-violet-100 hover:bg-violet-400/20",
  shot:
    "border-sky-400/28 bg-sky-400/14 text-sky-100 hover:bg-sky-400/20",
  turnover:
    "border-rose-400/28 bg-rose-400/14 text-rose-100 hover:bg-rose-400/20",
  reset:
    "border-white/12 bg-white/6 text-white/86 hover:bg-white/10",
  foul:
    "border-amber-400/28 bg-amber-400/14 text-amber-100 hover:bg-amber-400/20",
};

const MARKER_STYLES: Record<Marker["type"], string> = {
  catch: "bg-white/80 border-white/50",
  drive: "bg-emerald-300 border-emerald-100/50",
  pass: "bg-violet-300 border-violet-100/50",
  shot: "bg-sky-300 border-sky-100/50",
  turnover: "bg-rose-300 border-rose-100/50",
  reset: "bg-white/70 border-white/50",
  foul: "bg-amber-300 border-amber-100/50",
};

export default function ReviewPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadMessage, setUploadMessage] = useState("Choose a video to start.");
  const [uploadId, setUploadId] = useState("");
  const [playbackId, setPlaybackId] = useState("");

  const [durationSec, setDurationSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const [chains, setChains] = useState<PossessionChain[]>([]);
  const [selectedPossessionId, setSelectedPossessionId] = useState<string | null>(
    null
  );
  const [pendingFlow, setPendingFlow] = useState<PendingFlow>(null);

  const [clipInSec, setClipInSec] = useState<number | null>(null);
  const [clipOutSec, setClipOutSec] = useState<number | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);

  const [activeTab, setActiveTab] = useState<ReviewTab>("details");

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedMarkerId) ?? null,
    [markers, selectedMarkerId]
  );

  const selectedChain = useMemo(
    () => chains.find((chain) => chain.id === selectedPossessionId) ?? null,
    [chains, selectedPossessionId]
  );

  const contextButtons = useMemo(
    () => getContextButtons(pendingFlow),
    [pendingFlow]
  );

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  async function pollAssetFromUpload(currentUploadId: string) {
    for (let i = 0; i < 60; i += 1) {
      const res = await fetch(
        `/api/upload-status?uploadId=${encodeURIComponent(currentUploadId)}`,
        { method: "GET", cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to check upload status.");
      }

      const asset: AssetResponse | null = data.asset ?? null;

      if (asset?.playback_ids?.[0]?.id) {
        setPlaybackId(asset.playback_ids[0].id);
        setUploadState("ready");
        setUploadMessage("Video ready.");
        return;
      }

      setUploadState("processing");
      setUploadMessage(`Processing video... (${asset?.status ?? "waiting"})`);

      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    throw new Error("Timed out waiting for Mux to finish processing.");
  }

  async function uploadToMux(file: File) {
    setUploadState("creating-url");
    setUploadMessage("Creating upload URL...");
    setPlaybackId("");
    setUploadId("");

    try {
      const createUploadRes = await fetch("/api/upload", { method: "POST" });
      const createUploadData = await createUploadRes.json();

      if (!createUploadRes.ok) {
        throw new Error(createUploadData.error || "Could not create upload URL.");
      }

      const {
        uploadUrl,
        uploadId: newUploadId,
      }: { uploadUrl: string; uploadId: string } = createUploadData;

      setUploadId(newUploadId);
      setUploadState("uploading");
      setUploadMessage("Uploading video to Mux...");

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "video/mp4",
        },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error(await putRes.text());
      }

      setUploadState("processing");
      setUploadMessage("Upload complete. Waiting for Mux to process...");
      await pollAssetFromUpload(newUploadId);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Upload failed unexpectedly.";
      setUploadState("error");
      setUploadMessage(text);
    }
  }

  function resetSessionState() {
    setMarkers([]);
    setSelectedMarkerId(null);
    setChains([]);
    setSelectedPossessionId(null);
    setPendingFlow(null);
    setClips([]);
    setClipInSec(null);
    setClipOutSec(null);
    setCurrentTimeSec(0);
    setDurationSec(0);
    setIsPlaying(false);
    setActiveTab("details");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (videoUrl) URL.revokeObjectURL(videoUrl);

    resetSessionState();
    setFileName(file.name);
    setVideoUrl(URL.createObjectURL(file));
    void uploadToMux(file);
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  function seekTo(timeSec: number) {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = clamp(timeSec, 0, durationSec || 0);
    video.currentTime = nextTime;
    setCurrentTimeSec(nextTime);
  }

  function handleTimelineClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!timelineRef.current || durationSec <= 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const percent = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    seekTo(percent * durationSec);
  }

  function addRootAction(rootAction: RootAction) {
    const result = addRootActionToState({
      chains,
      markers,
      rootAction,
      timeSec: currentTimeSec,
    });

    setChains(result.chains);
    setMarkers(result.markers);
    setPendingFlow(result.pendingFlow);
    setSelectedMarkerId(result.selectedMarkerId);
    setSelectedPossessionId(result.selectedPossessionId);
    setActiveTab("details");
  }

  function handleContextAction(action: ContextAction) {
    const result = applyContextAction({
      chains,
      markers,
      pendingFlow,
      action,
      timeSec: currentTimeSec,
    });

    setChains(result.chains);
    setMarkers(result.markers);
    setPendingFlow(result.pendingFlow);
    setSelectedPossessionId(result.selectedPossessionId);
    setActiveTab("details");
  }

  function markIn() {
    setClipInSec(currentTimeSec);
  }

  function markOut() {
    setClipOutSec(currentTimeSec);
  }

  function saveClip() {
    if (clipInSec === null || clipOutSec === null) return;

    const startSec = Math.min(clipInSec, clipOutSec);
    const endSec = Math.max(clipInSec, clipOutSec);

    if (endSec - startSec < 0.25) return;

    const clip: Clip = {
      id: createId(),
      title: `Clip ${clips.length + 1}`,
      startSec,
      endSec,
    };

    setClips((prev) => [...prev, clip]);
    setClipInSec(null);
    setClipOutSec(null);
    setActiveTab("clips");
  }

  function renderDetailsPanel() {
    if (!selectedChain) {
      return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
          Start a possession and the chain will appear here.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
            Possession
          </div>
          <div className="mt-2 text-lg font-medium text-white">
            {selectedChain.rootAction.toUpperCase()}
          </div>
          <div className="mt-1 text-sm text-white/55">
            Started at {formatTime(selectedChain.startedAtSec)}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 text-[10px] uppercase tracking-[0.22em] text-white/40">
            Chain
          </div>

          <div className="space-y-2">
            {selectedChain.steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => seekTo(step.timeSec)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#11161d] px-3 py-3 text-left hover:bg-[#151b22]"
              >
                <div>
                  <div className="text-sm font-medium text-white">{step.label}</div>
                  <div className="mt-1 text-xs text-white/45">
                    Step {index + 1}
                  </div>
                </div>
                <div className="text-xs text-white/55">
                  {formatTime(step.timeSec)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          <div>Closed: {selectedChain.closed ? "yes" : "no"}</div>
          <div>Steps: {selectedChain.steps.length}</div>
          <div>Pending flow: {pendingFlow ? pendingFlow.kind : "none"}</div>
        </div>
      </div>
    );
  }

  function renderClipsPanel() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Saved Clips</h3>
          <span className="text-xs text-white/45">{clips.length} total</span>
        </div>

        {clips.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
            No saved clips yet.
          </div>
        ) : (
          <div className="space-y-2">
            {clips.map((clip) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => seekTo(clip.startSec)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                <div className="text-sm font-medium text-white">{clip.title}</div>
                <div className="mt-1 text-xs text-white/45">
                  {formatTime(clip.startSec)} → {formatTime(clip.endSec)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderInsightsPanel() {
    const driveCount = chains.filter((chain) => chain.rootAction === "drive").length;
    const passCount = chains.filter((chain) => chain.rootAction === "pass").length;
    const shotCount = chains.filter((chain) => chain.rootAction === "shot").length;

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white">Session Insights</h3>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Possessions
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {chains.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Markers
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {markers.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Drives
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {driveCount}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Passes
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {passCount}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Shots
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {shotCount}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Clips
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {clips.length}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#1f252d] text-white">
      <div className="border-b border-white/8 bg-[#242b34]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/35">
                Axis
              </div>
              <div className="text-sm font-medium text-white/90">Review</div>
            </div>

            <div className="hidden h-8 w-px bg-white/10 lg:block" />

            <div className="hidden lg:block">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                Session
              </div>
              <div className="max-w-[460px] truncate text-sm text-white/85">
                {fileName || "No session loaded"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`rounded-full px-3 py-1.5 text-xs ${
                uploadState === "ready"
                  ? "bg-lime-400/14 text-lime-200"
                  : uploadState === "error"
                    ? "bg-rose-400/14 text-rose-200"
                    : "bg-white/8 text-white/70"
              }`}
            >
              {uploadState}
            </div>

            <a
              href="/"
              className="rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
            >
              Front Door
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1600px] grid-cols-[250px_minmax(0,1fr)_380px] px-4 py-4">
        <aside className="rounded-l-[28px] border border-r-0 border-white/8 bg-[#242b34] px-4 py-5">
          <div className="space-y-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                New upload
              </div>

              <label className="mt-3 block rounded-3xl border border-dashed border-white/14 bg-white/5 p-4 text-sm text-white/70 hover:bg-white/8">
                <div className="font-medium text-white">Local review + Mux upload</div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="mt-3 block w-full text-xs text-white/50 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-medium file:text-black"
                />
              </label>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                Session
              </div>
              <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="truncate text-sm font-medium text-white">
                  {fileName || "No file loaded"}
                </div>
                <div className="mt-1 text-xs text-white/45">
                  {durationSec > 0 ? `${formatTime(durationSec)} duration` : "Waiting"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                Current flow
              </div>
              <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                <div>Pending: {pendingFlow ? pendingFlow.kind : "none"}</div>
                <div>Possessions: {chains.length}</div>
                <div>Markers: {markers.length}</div>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 border-y border-white/8 bg-[#2a313b] px-6 py-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] text-white/35">
                Review session
              </div>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-white">
                {fileName || "Axis Review"}
              </h1>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!videoUrl}
                className="rounded-xl border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/85 hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("clips")}
                className="rounded-xl border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/85 hover:bg-white/12"
              >
                Clips
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("insights")}
                className="rounded-xl border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/85 hover:bg-white/12"
              >
                Insights
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-white/8 bg-[#11161d] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="aspect-video w-full bg-black">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                  onLoadedMetadata={(event) => {
                    setDurationSec(event.currentTarget.duration || 0);
                  }}
                  onTimeUpdate={(event) => {
                    setCurrentTimeSec(event.currentTarget.currentTime);
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/40">
                  Upload a video to begin review.
                </div>
              )}
            </div>

            <div className="border-t border-white/8 bg-[#1b2129] px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-xs text-white/45">
                <span>{formatTime(currentTimeSec)}</span>
                <span>{formatTime(durationSec)}</span>
              </div>

              <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                className="relative h-16 cursor-pointer rounded-2xl border border-white/10 bg-[#242b34]"
              >
                <div className="absolute left-3 right-3 top-1/2 h-[2px] -translate-y-1/2 bg-white/12" />

                {clipInSec !== null && clipOutSec !== null && durationSec > 0 ? (
                  <div
                    className="absolute top-1/2 h-9 -translate-y-1/2 rounded-xl bg-lime-300/14"
                    style={{
                      left: `${(Math.min(clipInSec, clipOutSec) / durationSec) * 100}%`,
                      width: `${
                        ((Math.abs(clipOutSec - clipInSec) || 0) / durationSec) * 100
                      }%`,
                    }}
                  />
                ) : null}

                {markers.map((marker) => {
                  const left = durationSec > 0 ? (marker.timeSec / durationSec) * 100 : 0;
                  const isSelected = marker.id === selectedMarkerId;

                  return (
                    <button
                      key={marker.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedMarkerId(marker.id);
                        setSelectedPossessionId(marker.possessionId);
                        seekTo(marker.timeSec);
                        setActiveTab("details");
                      }}
                      className={`absolute top-1/2 h-9 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                        MARKER_STYLES[marker.type]
                      } ${
                        isSelected
                          ? "ring-2 ring-white/90 ring-offset-2 ring-offset-[#242b34]"
                          : ""
                      }`}
                      style={{ left: `${left}%` }}
                      title={`${marker.type} • ${formatTime(marker.timeSec)}`}
                    />
                  );
                })}

                <div
                  className="absolute top-1/2 h-12 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-white shadow-[0_0_16px_rgba(255,255,255,0.35)]"
                  style={{
                    left: `${durationSec > 0 ? (currentTimeSec / durationSec) * 100 : 0}%`,
                  }}
                />
              </div>

              <div className="mt-5">
                <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                  Root actions
                </div>

                <div className="flex flex-wrap gap-2">
                  {ROOT_ACTIONS.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => addRootAction(action)}
                      disabled={!videoUrl}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium capitalize transition disabled:cursor-not-allowed disabled:opacity-40 ${ROOT_BUTTON_STYLES[action]}`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                  Context
                </div>

                <div className="flex flex-wrap gap-2">
                  {contextButtons.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/45">
                      No active flow
                    </div>
                  ) : (
                    contextButtons.map((button) => (
                      <button
                        key={button.key}
                        type="button"
                        onClick={() => handleContextAction(button.key)}
                        className="rounded-xl border border-white/10 bg-white/7 px-4 py-2.5 text-sm font-medium text-white/86 hover:bg-white/12"
                      >
                        {button.label}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={markIn}
                  disabled={!videoUrl}
                  className="rounded-xl border border-white/10 bg-white/7 px-4 py-2.5 text-sm text-white/85 hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Mark In
                </button>
                <button
                  type="button"
                  onClick={markOut}
                  disabled={!videoUrl}
                  className="rounded-xl border border-white/10 bg-white/7 px-4 py-2.5 text-sm text-white/85 hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Mark Out
                </button>
                <button
                  type="button"
                  onClick={saveClip}
                  disabled={clipInSec === null || clipOutSec === null}
                  className="rounded-xl border border-lime-300/25 bg-lime-300/12 px-4 py-2.5 text-sm text-lime-100 hover:bg-lime-300/18 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save Clip
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                <span>In: {clipInSec === null ? "—" : formatTime(clipInSec)}</span>
                <span>Out: {clipOutSec === null ? "—" : formatTime(clipOutSec)}</span>
                <span>Playback ID: {playbackId || "pending"}</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-r-[28px] border border-l-0 border-white/8 bg-[#242b34] px-5 py-5">
          <div className="mb-4 flex gap-2">
            {(["details", "clips", "insights"] as ReviewTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-3 py-2 text-sm capitalize ${
                  activeTab === tab
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white/72 hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "details" && renderDetailsPanel()}
          {activeTab === "clips" && renderClipsPanel()}
          {activeTab === "insights" && renderInsightsPanel()}

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            <div className="truncate">File: {fileName || "None"}</div>
            <div>Status: {uploadState}</div>
            <div>{uploadMessage}</div>
            {uploadId ? <div className="truncate">Upload ID: {uploadId}</div> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}