"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  videoUrl: string;
};

type TagType =
  | "SHOT"
  | "DRIVE"
  | "PASS"
  | "TURNOVER"
  | "FOUL"
  | "RESET"
  | "HELP"
  | "NO HELP";

type ReviewTag = {
  id: string;
  type: TagType;
  time: number;
  note: string;
  color: string;
};

type PossessionNode = {
  id: string;
  label: string;
  time: number;
};

const TAGS: { type: TagType; color: string }[] = [
  { type: "SHOT", color: "bg-emerald-500/20 border-emerald-400 text-emerald-300" },
  { type: "DRIVE", color: "bg-sky-500/20 border-sky-400 text-sky-300" },
  { type: "PASS", color: "bg-violet-500/20 border-violet-400 text-violet-300" },
  { type: "TURNOVER", color: "bg-red-500/20 border-red-400 text-red-300" },
  { type: "FOUL", color: "bg-amber-500/20 border-amber-400 text-amber-300" },
  { type: "RESET", color: "bg-neutral-500/20 border-neutral-300 text-neutral-200" },
  { type: "HELP", color: "bg-pink-500/20 border-pink-400 text-pink-300" },
  { type: "NO HELP", color: "bg-cyan-500/20 border-cyan-400 text-cyan-300" },
];

const CHAIN_ACTIONS = [
  "Catch",
  "Drive Left",
  "Drive Right",
  "Downhill",
  "Pass",
  "Shot",
  "Make",
  "Miss",
  "Turnover",
  "Foul",
  "Reset",
];

function formatTime(time: number) {
  if (!Number.isFinite(time)) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AxisReviewEditor({ videoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const [chain, setChain] = useState<PossessionNode[]>([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => setDuration(video.duration || 0);
    const onTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [videoUrl]);

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => a.time - b.time);
  }, [tags]);

  const selectedTag = useMemo(() => {
    return tags.find((tag) => tag.id === selectedTagId) ?? null;
  }, [tags, selectedTagId]);

  function togglePlay() {
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

  function createTag(type: TagType, color: string) {
    const newTag: ReviewTag = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      time: currentTime,
      note: "",
      color,
    };

    setTags((prev) => [...prev, newTag]);
    setSelectedTagId(newTag.id);
    setNoteDraft("");
  }

  function jumpToTime(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }

  function selectTag(tag: ReviewTag) {
    setSelectedTagId(tag.id);
    setNoteDraft(tag.note);
    jumpToTime(tag.time);
  }

  function saveNote() {
    if (!selectedTagId) return;

    setTags((prev) =>
      prev.map((tag) =>
        tag.id === selectedTagId
          ? {
              ...tag,
              note: noteDraft,
            }
          : tag
      )
    );
  }

  function deleteSelectedTag() {
    if (!selectedTagId) return;
    setTags((prev) => prev.filter((tag) => tag.id !== selectedTagId));
    setSelectedTagId(null);
    setNoteDraft("");
  }

  function addChainNode(label: string) {
    const node: PossessionNode = {
      id: `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      time: currentTime,
    };
    setChain((prev) => [...prev, node]);
  }

  function clearChain() {
    setChain([]);
  }

  function exportSession() {
    const payload = {
      exportedAt: new Date().toISOString(),
      duration,
      tags: sortedTags,
      possessionChain: chain,
    };

    downloadText("axis-review-export.json", JSON.stringify(payload, null, 2));
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
            <div className="mx-auto overflow-hidden rounded-xl border border-neutral-800 bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="mx-auto block h-auto max-h-[46vh] w-full object-contain bg-black"
                playsInline
                preload="metadata"
                controls
              />
            </div>
          </div>

          <div className="sticky top-[73px] z-30 space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl">
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

                <button
                  onClick={exportSession}
                  className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
                >
                  Export
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-3 text-sm font-medium text-white">Color tags</div>

              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <button
                    key={tag.type}
                    onClick={() => createTag(tag.type, tag.color)}
                    className={`rounded-lg border px-3 py-2 text-sm ${tag.color}`}
                  >
                    {tag.type}
                  </button>
                ))}
              </div>

              <div className="mt-3 text-xs text-neutral-500">
                Tag at current playhead. Keep this bar near the player.
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-white">Possession chain</div>
                <button
                  onClick={clearChain}
                  className="rounded-lg border border-neutral-700 px-3 py-2 text-xs hover:bg-neutral-900"
                >
                  Clear chain
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {CHAIN_ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => addChainNode(action)}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
                  >
                    {action}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {chain.length === 0 ? (
                  <div className="text-sm text-neutral-500">No possession chain yet.</div>
                ) : (
                  chain.map((node, index) => (
                    <button
                      key={node.id}
                      onClick={() => jumpToTime(node.time)}
                      className="rounded-full border border-neutral-700 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-900"
                    >
                      {index + 1}. {node.label} · {formatTime(node.time)}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-white">Event log</div>
              <div className="text-xs text-neutral-500">{sortedTags.length} tags</div>
            </div>

            {sortedTags.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 p-4 text-sm text-neutral-500">
                No tags yet.
              </div>
            ) : (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {sortedTags.map((tag) => {
                  const isSelected = tag.id === selectedTagId;

                  return (
                    <button
                      key={tag.id}
                      onClick={() => selectTag(tag)}
                      className={`flex w-full items-start justify-between rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-white bg-neutral-900"
                          : "border-neutral-800 bg-black hover:bg-neutral-900"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-1 text-xs ${tag.color}`}>
                            {tag.type}
                          </span>
                          <span className="text-xs text-neutral-400">{formatTime(tag.time)}</span>
                        </div>

                        {tag.note ? (
                          <div className="mt-2 text-sm text-neutral-300">{tag.note}</div>
                        ) : (
                          <div className="mt-2 text-sm text-neutral-600">No note</div>
                        )}
                      </div>

                      <div className="ml-4 text-xs text-neutral-500">Jump</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="mb-3 text-sm font-medium text-white">Selected event</div>

            {selectedTag ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-neutral-800 bg-black p-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-xs ${selectedTag.color}`}>
                      {selectedTag.type}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {formatTime(selectedTag.time)}
                    </span>
                  </div>
                </div>

                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add note..."
                  rows={6}
                  className="w-full rounded-xl border border-neutral-800 bg-black p-3 text-sm text-white outline-none placeholder:text-neutral-600"
                />

                <div className="flex gap-2">
                  <button
                    onClick={saveNote}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
                  >
                    Save Note
                  </button>

                  <button
                    onClick={deleteSelectedTag}
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900"
                  >
                    Delete Tag
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-800 p-4 text-sm text-neutral-500">
                Select a tag to edit notes or jump the video.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="mb-3 text-sm font-medium text-white">Chain preview</div>

            {chain.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 p-4 text-sm text-neutral-500">
                Build a possession chain from the action buttons.
              </div>
            ) : (
              <div className="space-y-2">
                {chain.map((node, index) => (
                  <div
                    key={node.id}
                    className="rounded-xl border border-neutral-800 bg-black p-3 text-sm text-neutral-200"
                  >
                    {index + 1}. {node.label} · {formatTime(node.time)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}