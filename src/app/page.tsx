"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type UploadState =
  | "idle"
  | "creating-url"
  | "uploading"
  | "processing"
  | "ready"
  | "error";

type ReviewTab = "details" | "clips" | "insights";
type EventType = "shot" | "pass" | "drive" | "turnover" | "foul" | "note";

type Marker = {
  id: string;
  type: EventType;
  timeSec: number;
  note: string;
};

type Clip = {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
};

type AssetResponse = {
  id: string;
  status: string;
  playback_ids?: Array<{ id: string; policy: string }>;
};

const EVENT_STYLES: Record<
  EventType,
  {
    chip: string;
    button: string;
    marker: string;
  }
> = {
  shot: {
    chip: "border-sky-400/35 bg-sky-400/12 text-sky-200",
    button:
      "border-sky-400/30 bg-sky-400/14 text-sky-100 hover:bg-sky-400/22",
    marker: "bg-sky-300 border-sky-100/50",
  },
  pass: {
    chip: "border-violet-400/35 bg-violet-400/12 text-violet-200",
    button:
      "border-violet-400/30 bg-violet-400/14 text-violet-100 hover:bg-violet-400/22",
    marker: "bg-violet-300 border-violet-100/50",
  },
  drive: {
    chip: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
    button:
      "border-emerald-400/30 bg-emerald-400/14 text-emerald-100 hover:bg-emerald-400/22",
    marker: "bg-emerald-300 border-emerald-100/50",
  },
  turnover: {
    chip: "border-rose-400/35 bg-rose-400/12 text-rose-200",
    button:
      "border-rose-400/30 bg-rose-400/14 text-rose-100 hover:bg-rose-400/22",
    marker: "bg-rose-300 border-rose-100/50",
  },
  foul: {
    chip: "border-amber-400/35 bg-amber-400/12 text-amber-200",
    button:
      "border-amber-400/30 bg-amber-400/14 text-amber-100 hover:bg-amber-400/22",
    marker: "bg-amber-300 border-amber-100/50",
  },
  note: {
    chip: "border-white/20 bg-white/8 text-white/80",
    button: "border-white/15 bg-white/8 text-white/80 hover:bg-white/12",
    marker: "bg-white/70 border-white/50",
  },
};

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds)) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function Page() {
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

  const [clipInSec, setClipInSec] = useState<number | null>(null);
  const [clipOutSec, setClipOutSec] = useState<number | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);

  const [activeTab, setActiveTab] = useState<ReviewTab>("details");

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedMarkerId) ?? null,
    [markers, selectedMarkerId]
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

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

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

  function addMarker(type: EventType) {
    const marker: Marker = {
      id: crypto.randomUUID(),
      type,
      timeSec: currentTimeSec,
      note: "",
    };

    setMarkers((prev) => [...prev, marker].sort((a, b) => a.timeSec - b.timeSec));
    setSelectedMarkerId(marker.id);
    setActiveTab("details");
  }

  function updateSelectedMarkerNote(note: string) {
    if (!selectedMarkerId) return;

    setMarkers((prev) =>
      prev.map((marker) =>
        marker.id === selectedMarkerId ? { ...marker, note } : marker
      )
    );
  }

  function removeSelectedMarker() {
    if (!selectedMarkerId) return;
    setMarkers((prev) => prev.filter((marker) => marker.id !== selectedMarkerId));
    setSelectedMarkerId(null);
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
      id: crypto.randomUUID(),
      title: `Clip ${clips.length + 1}`,
      startSec,
      endSec,
    };

    setClips((prev) => [...prev, clip]);
    setClipInSec(null);
    setClipOutSec(null);
    setActiveTab("clips");
  }

  function jumpToMarker(timeSec: number) {
    seekTo(timeSec);
    setActiveTab("details");
  }

  function renderRightPanel() {
    if (activeTab === "clips") {
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
                  className="w-full rounded-2xl border border-white/10 bg-white/6 p-4 text-left transition hover:bg-white/10"
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

    if (activeTab === "insights") {
      const counts = markers.reduce<Record<EventType, number>>(
        (acc, marker) => {
          acc[marker.type] += 1;
          return acc;
        },
        { shot: 0, pass: 0, drive: 0, turnover: 0, foul: 0, note: 0 }
      );

      return (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Session Insights</h3>

          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(counts) as Array<[EventType, number]>).map(
              ([type, count]) => (
                <div
                  key={type}
                  className={`rounded-2xl border p-3 ${EVENT_STYLES[type].chip}`}
                >
                  <div className="text-[10px] uppercase tracking-[0.18em]">
                    {type}
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{count}</div>
                </div>
              )
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            <div>Total markers: {markers.length}</div>
            <div>Total clips: {clips.length}</div>
            <div>Upload state: {uploadState}</div>
            <div>Playback linked: {playbackId ? "yes" : "no"}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white">Details</h3>

        {!selectedMarker ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
            Select a marker or create one from the action strip.
          </div>
        ) : (
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                Event
              </div>
              <div
                className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-sm font-medium ${EVENT_STYLES[selectedMarker.type].chip}`}
              >
                {selectedMarker.type}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                Timestamp
              </div>
              <div className="mt-2 text-sm text-white">
                {formatTime(selectedMarker.timeSec)}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                Note
              </label>
              <textarea
                value={selectedMarker.note}
                onChange={(event) => updateSelectedMarkerNote(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#11161d] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25"
                placeholder="Add context..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => jumpToMarker(selectedMarker.timeSec)}
                className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
              >
                Jump to marker
              </button>
              <button
                type="button"
                onClick={removeSelectedMarker}
                className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-400/18"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          <div className="truncate">File: {fileName || "None"}</div>
          <div>Status: {uploadState}</div>
          <div>{uploadMessage}</div>
          {uploadId ? <div className="truncate">Upload ID: {uploadId}</div> : null}
          {playbackId ? (
            <div className="truncate">Playback ID: {playbackId}</div>
          ) : null}
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

            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1600px] grid-cols-[250px_minmax(0,1fr)_360px] gap-0 px-4 py-4">
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
                Quick facts
              </div>
              <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                <div>Markers: {markers.length}</div>
                <div>Clips: {clips.length}</div>
                <div>Mux: {playbackId ? "linked" : "pending"}</div>
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
                        setActiveTab("details");
                        seekTo(marker.timeSec);
                      }}
                      className={`absolute top-1/2 h-9 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full border ${
                        EVENT_STYLES[marker.type].marker
                      } ${isSelected ? "ring-2 ring-white/90 ring-offset-2 ring-offset-[#242b34]" : ""}`}
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

              <div className="mt-5 flex flex-wrap gap-2">
                {(["shot", "pass", "drive", "turnover", "foul", "note"] as EventType[]).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addMarker(type)}
                      disabled={!videoUrl}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium capitalize transition disabled:cursor-not-allowed disabled:opacity-40 ${EVENT_STYLES[type].button}`}
                    >
                      {type}
                    </button>
                  )
                )}

                <div className="mx-2 h-11 w-px bg-white/10" />

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
                <span>
                  Selected marker: {selectedMarker ? selectedMarker.type : "none"}
                </span>
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

          {renderRightPanel()}
        </aside>
      </div>
    </main>
  );
}