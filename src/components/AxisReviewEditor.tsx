"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  videoUrl: string;
};

type TagType = "SHOT" | "DRIVE" | "PASS" | "TURNOVER" | "FOUL";

type ReviewTag = {
  id: string;
  type: TagType;
  time: number;
  note: string;
};

const TAGS: TagType[] = ["SHOT", "DRIVE", "PASS", "TURNOVER", "FOUL"];

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

  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

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

  function createTag(type: TagType) {
    const newTag: ReviewTag = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      time: currentTime,
      note: "",
    };

    setTags((prev) => [...prev, newTag]);
    setSelectedTagId(newTag.id);
    setNoteDraft("");
  }

  function jumpToTag(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }

  function selectTag(tag: ReviewTag) {
    setSelectedTagId(tag.id);
    setNoteDraft(tag.note);
    jumpToTag(tag.time);
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full rounded-xl bg-black"
          playsInline
          preload="metadata"
          controls
        />
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
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

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <div className="mb-3 text-sm font-medium text-white">Tag actions</div>

        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => createTag(tag)}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="mt-3 text-xs text-neutral-500">
          Tap a tag at the current playhead time.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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
            <div className="space-y-2">
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
                      <div className="text-sm font-medium text-white">{tag.type}</div>
                      <div className="mt-1 text-xs text-neutral-400">{formatTime(tag.time)}</div>
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
                <div className="text-sm text-white">{selectedTag.type}</div>
                <div className="mt-1 text-xs text-neutral-400">
                  {formatTime(selectedTag.time)}
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
      </div>
    </div>
  );
}