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

function deriveGuidedStep(
  events: TimelineEvent[],
  outcome: OutcomeType
): GuidedStep {
  const types = events.map((e) => e.type);

  if (outcome) return "done";

  if (!types.some((t) => ["drive", "pass", "shot"].includes(t)))
    return "startAction";

  if (!types.some((t) => ["left", "middle", "right"].includes(t)))
    return "side";

  if (!types.some((t) => ["paint", "no_paint"].includes(t)))
    return "paint";

  if (!types.some((t) => ["help", "no_help"].includes(t)))
    return "help";

  if (!types.some((t) => ["finish", "reset"].includes(t)))
    return "decision";

  return "outcome";
}

export default function AxisReviewEditor({ onSavePossession }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
    id: createId("pos"),
    startTimeSec: null,
    endTimeSec: null,
    events: [],
    outcome: null,
  });

  const [saved, setSaved] = useState<SavedPossession[]>([]);

  // cleanup
  useEffect(() => {
    return () => {
      if (session.url) URL.revokeObjectURL(session.url);
    };
  }, [session.url]);

  const orderedEvents = useMemo(
    () => [...draft.events].sort((a, b) => a.timeSec - b.timeSec),
    [draft.events]
  );

  const guidedStep = useMemo(
    () => deriveGuidedStep(orderedEvents, draft.outcome),
    [orderedEvents, draft.outcome]
  );

  const activeLabels = orderedEvents.map((e) => getEventLabel(e.type));

  const canSave =
    draft.startTimeSec != null &&
    draft.endTimeSec != null &&
    draft.outcome != null &&
    draft.endTimeSec > draft.startTimeSec;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (session.url) URL.revokeObjectURL(session.url);

    const url = URL.createObjectURL(file);

    setSession({
      file,
      url,
      name: file.name,
      durationSec: 0,
      isReady: false,
    });

    setCurrentTimeSec(0);
    setDraft({
      id: createId("pos"),
      startTimeSec: null,
      endTimeSec: null,
      events: [],
      outcome: null,
    });
  }

  function onReady(duration: number) {
    setSession((prev) => ({ ...prev, durationSec: duration, isReady: true }));
  }

  function addEvent(type: EventType) {
    const next: TimelineEvent = {
      id: createId("evt"),
      type,
      timeSec: currentTimeSec,
    };

    setDraft((prev) => ({
      ...prev,
      events: [...prev.events, next],
    }));
  }

  function markStart() {
    setDraft((prev) => ({ ...prev, startTimeSec: currentTimeSec }));
  }

  function markEnd() {
    setDraft((prev) => ({ ...prev, endTimeSec: currentTimeSec }));
  }

  function undo() {
    setDraft((prev) => {
      if (prev.outcome) return { ...prev, outcome: null };
      if (prev.events.length)
        return { ...prev, events: prev.events.slice(0, -1) };
      if (prev.endTimeSec != null) return { ...prev, endTimeSec: null };
      if (prev.startTimeSec != null) return { ...prev, startTimeSec: null };
      return prev;
    });
  }

  function save() {
    const { startTimeSec, endTimeSec, outcome } = draft;

    // ✅ FIXED NULL GUARD
    if (startTimeSec == null || endTimeSec == null || !outcome) return;

    const boundedEvents = orderedEvents.filter(
      (event) =>
        event.timeSec >= startTimeSec &&
        event.timeSec <= endTimeSec
    );

    const possession = buildSavedPossession({
      id: createId("saved"),
      startTimeSec,
      endTimeSec,
      events: boundedEvents,
      outcome,
    });

    setSaved((prev) => [possession, ...prev]);
    onSavePossession?.(possession);

    setDraft({
      id: createId("pos"),
      startTimeSec: null,
      endTimeSec: null,
      events: [],
      outcome: null,
    });
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[520px] space-y-4 p-4">

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFile}
        />

        <ReviewHeader
          title={session.name}
          onBack={() => {}}
          onSave={save}
          canSave={canSave}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-white/70"
        >
          {session.url ? "Change video" : "Upload video"}
        </button>

        <ReviewPlayer
          ref={videoRef}
          videoUrl={session.url}
          currentTimeSec={currentTimeSec}
          onReady={onReady}
          onTimeChange={setCurrentTimeSec}
          isPlaying={isPlaying}
          onPlayStateChange={setIsPlaying}
        />

        <ReviewTimeline
          durationSec={session.durationSec}
          currentTimeSec={currentTimeSec}
          startTimeSec={draft.startTimeSec}
          endTimeSec={draft.endTimeSec}
          events={orderedEvents}
          onSeek={(t) => setCurrentTimeSec(clamp(t, 0, session.durationSec))}
        />

        <EventToolbar
          guidedStep={guidedStep}
          activeLabels={activeLabels}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onAddEvent={addEvent}
          onMarkStart={markStart}
          onMarkEnd={markEnd}
          onUndo={undo}
        />

        <OutcomeBar
          value={draft.outcome}
          onChange={(o) => setDraft((prev) => ({ ...prev, outcome: o }))}
          visible={guidedStep === "outcome"}
        />

        <PossessionSummary
          startTimeSec={draft.startTimeSec}
          endTimeSec={draft.endTimeSec}
          events={orderedEvents}
          outcome={draft.outcome}
        />
      </div>
    </main>
  );
}