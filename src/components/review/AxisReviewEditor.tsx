"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EventToolbar from "./EventToolbar";
import OutcomeBar from "./OutcomeBar";
import PossessionSummary from "./PossessionSummary";
import ReviewHeader from "./ReviewHeader";
import ReviewPlayer from "./ReviewPlayer";
import ReviewTimeline from "./ReviewTimeline";
import type {
  EventType,
  OutcomeType,
  PossessionDraft,
  SavedPossession,
  TimelineEvent,
  VideoSession,
} from "@/lib/review-types";
import {
  buildSavedPossession,
  clamp,
  createId,
  formatTime,
  getEventLabel,
} from "@/lib/review-utils";

type GuidedStep =
  | "startAction"
  | "side"
  | "paint"
  | "help"
  | "decision"
  | "outcome"
  | "done";

type Props = {
  onSavePossession?: (possession: SavedPossession) => void;
};

function deriveGuidedStep(events: TimelineEvent[], outcome: OutcomeType): GuidedStep {
  const types = events.map((event) => event.type);

  if (outcome) return "done";

  if (!types.includes("drive") && !types.includes("pass") && !types.includes("shot")) {
    return "startAction";
  }

  if (!types.includes("left") && !types.includes("middle") && !types.includes("right")) {
    return "side";
  }

  if (!types.includes("paint") && !types.includes("no_paint")) {
    return "paint";
  }

  if (!types.includes("help") && !types.includes("no_help")) {
    return "help";
  }

  if (
    !types.includes("finish") &&
    !types.includes("reset") &&
    types.filter((type) => type === "pass").length < 2
  ) {
    return "decision";
  }

  return "outcome";
}

function labelsForEvents(events: TimelineEvent[]) {
  return events.map((event) => getEventLabel(event.type));
}

export default function AxisReviewEditor({ onSavePossession }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const replayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [session, setSession] = useState<VideoSession>({
    file: null,
    url: "",
    name: "No video selected",
    durationSec: 0,
    isReady: false,
  });

  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [draft, setDraft] = useState<PossessionDraft>({
    id: createId("possession"),
    startTimeSec: null,
    endTimeSec: null,
    events: [],
    outcome: null,
  });

  const [savedPossessions, setSavedPossessions] = useState<SavedPossession[]>([]);

  useEffect(() => {
    return () => {
      if (session.url) URL.revokeObjectURL(session.url);
      if (replayIntervalRef.current) clearInterval(replayIntervalRef.current);
    };
  }, [session.url]);

  const orderedEvents = useMemo(() => {
    return [...draft.events].sort((a, b) => a.timeSec - b.timeSec);
  }, [draft.events]);

  const guidedStep = useMemo(
    () => deriveGuidedStep(orderedEvents, draft.outcome),
    [orderedEvents, draft.outcome]
  );

  const activeLabels = useMemo(() => labelsForEvents(orderedEvents), [orderedEvents]);

  const canSave =
    draft.startTimeSec != null &&
    draft.endTimeSec != null &&
    draft.endTimeSec > draft.startTimeSec &&
    draft.outcome != null;

  const hasDraftActivity =
    draft.startTimeSec != null ||
    draft.endTimeSec != null ||
    draft.events.length > 0 ||
    draft.outcome != null;

  function openPicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (session.url) URL.revokeObjectURL(session.url);
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }

    const url = URL.createObjectURL(file);

    setSession({
      file,
      url,
      name: file.name,
      durationSec: 0,
      isReady: false,
    });

    setCurrentTimeSec(0);
    setIsPlaying(false);

    setDraft({
      id: createId("possession"),
      startTimeSec: null,
      endTimeSec: null,
      events: [],
      outcome: null,
    });

    setSavedPossessions([]);
    e.target.value = "";
  }

  function handleVideoReady(durationSec: number) {
    setSession((prev: VideoSession) => ({
      ...prev,
      durationSec,
      isReady: true,
    }));
  }

  function handleSeek(timeSec: number) {
    setCurrentTimeSec(clamp(timeSec, 0, session.durationSec || 0));
  }

  function handleTogglePlay() {
    if (!session.url) return;
    setIsPlaying((prev) => !prev);
  }

  function addEvent(type: EventType) {
    if (!session.isReady) return;

    const nextEvent: TimelineEvent = {
      id: createId("event"),
      type,
      timeSec: currentTimeSec,
    };

    setDraft((prev: PossessionDraft) => ({
      ...prev,
      events: [...prev.events, nextEvent],
    }));
  }

  function markStart() {
    setDraft((prev: PossessionDraft) => ({
      ...prev,
      startTimeSec: currentTimeSec,
    }));
  }

  function markEnd() {
    setDraft((prev: PossessionDraft) => ({
      ...prev,
      endTimeSec: currentTimeSec,
    }));
  }

  function undo() {
    setDraft((prev: PossessionDraft) => {
      if (prev.outcome) return { ...prev, outcome: null };
      if (prev.events.length) return { ...prev, events: prev.events.slice(0, -1) };
      if (prev.endTimeSec != null) return { ...prev, endTimeSec: null };
      if (prev.startTimeSec != null) return { ...prev, startTimeSec: null };
      return prev;
    });
  }

  function setOutcome(outcome: Exclude<OutcomeType, null>) {
    setDraft((prev: PossessionDraft) => ({
      ...prev,
      outcome,
    }));
  }

  function savePossession() {
    if (!canSave || draft.startTimeSec == null || draft.endTimeSec == null || !draft.outcome) {
      return;
    }

    const boundedEvents = orderedEvents.filter(
      (event) => event.timeSec >= draft.startTimeSec && event.timeSec <= draft.endTimeSec
    );

    const saved = buildSavedPossession({
      id: createId("saved"),
      startTimeSec: draft.startTimeSec,
      endTimeSec: draft.endTimeSec,
      events: boundedEvents,
      outcome: draft.outcome,
    });

    setSavedPossessions((prev: SavedPossession[]) => [saved, ...prev]);
    onSavePossession?.(saved);

    setDraft({
      id: createId("possession"),
      startTimeSec: null,
      endTimeSec: null,
      events: [],
      outcome: null,
    });
  }

  function replayPossession(possession: SavedPossession) {
    const video = videoRef.current;
    if (!video) return;

    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }

    setCurrentTimeSec(possession.startTimeSec);
    setIsPlaying(true);
    video.currentTime = possession.startTimeSec;

    const stopAt = possession.endTimeSec;

    replayIntervalRef.current = setInterval(() => {
      const currentVideo = videoRef.current;
      if (!currentVideo) return;

      if (currentVideo.currentTime >= stopAt) {
        currentVideo.pause();
        currentVideo.currentTime = possession.startTimeSec;
        setCurrentTimeSec(possession.startTimeSec);
        setIsPlaying(false);

        if (replayIntervalRef.current) {
          clearInterval(replayIntervalRef.current);
          replayIntervalRef.current = null;
        }
      }
    }, 50);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 py-5 sm:px-5">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mov,.mp4,.m4v,.webm"
          className="hidden"
          onChange={handleFileChange}
        />

        <ReviewHeader
          title={session.name}
          onBack={() => {}}
          onSave={savePossession}
          canSave={canSave}
        />

        <div className="flex justify-start">
          <button
            type="button"
            onClick={openPicker}
            className="h-9 rounded-full border border-white/10 px-4 text-xs text-white/70"
          >
            {session.url ? "Change video" : "Upload video"}
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="overflow-hidden rounded-[28px] border border-white/8 bg-black">
            <div className="mx-auto w-full max-w-[260px]">
              <ReviewPlayer
                ref={videoRef}
                videoUrl={session.url}
                currentTimeSec={currentTimeSec}
                onReady={handleVideoReady}
                onTimeChange={setCurrentTimeSec}
                isPlaying={isPlaying}
                onPlayStateChange={setIsPlaying}
              />
            </div>
          </div>

          <div className="w-full">
            <ReviewTimeline
              durationSec={session.durationSec}
              currentTimeSec={currentTimeSec}
              startTimeSec={draft.startTimeSec}
              endTimeSec={draft.endTimeSec}
              events={orderedEvents}
              onSeek={handleSeek}
            />
          </div>
        </div>

        <EventToolbar
          guidedStep={guidedStep}
          activeLabels={activeLabels}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onAddEvent={addEvent}
          onMarkStart={markStart}
          onMarkEnd={markEnd}
          onUndo={undo}
        />

        <OutcomeBar
          value={draft.outcome}
          onChange={setOutcome}
          visible={guidedStep === "outcome"}
        />

        {hasDraftActivity && (
          <PossessionSummary
            startTimeSec={draft.startTimeSec}
            endTimeSec={draft.endTimeSec}
            events={orderedEvents}
            outcome={draft.outcome}
          />
        )}

        {savedPossessions.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
              Saved Possessions
            </div>

            <div className="space-y-3">
              {savedPossessions.map((possession) => (
                <button
                  key={possession.id}
                  type="button"
                  onClick={() => replayPossession(possession)}
                  className="w-full rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-left transition active:scale-[0.99]"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-xs text-white/42">
                      {formatTime(possession.startTimeSec)} →{" "}
                      {formatTime(possession.endTimeSec)}
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] tracking-[0.12em] text-lime-300">
                      {possession.state.toUpperCase()}
                    </div>
                  </div>

                  <div className="text-sm leading-6 text-white">
                    {possession.story}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}