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
import { buildSavedPossession, clamp, createId } from "@/lib/review-utils";

type Props = {
  onSavePossession?: (possession: SavedPossession) => void;
};

export default function AxisReviewEditor({ onSavePossession }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [session, setSession] = useState<VideoSession>({
    file: null,
    url: "",
    name: "No video selected",
    durationSec: 0,
    isReady: false,
  });

  const [currentTimeSec, setCurrentTimeSec] = useState(0);

  const [draft, setDraft] = useState<PossessionDraft>({
    id: createId("possession"),
    startTimeSec: null,
    endTimeSec: null,
    events: [],
    outcome: null,
  });

  useEffect(() => {
    return () => {
      if (session.url) URL.revokeObjectURL(session.url);
    };
  }, [session.url]);

  const canSave =
    draft.startTimeSec != null &&
    draft.endTimeSec != null &&
    draft.endTimeSec > draft.startTimeSec &&
    draft.outcome != null;

  const orderedEvents = useMemo(() => {
    return [...draft.events].sort((a, b) => a.timeSec - b.timeSec);
  }, [draft.events]);

  function openPicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (session.url) {
      URL.revokeObjectURL(session.url);
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

    setDraft({
      id: createId("possession"),
      startTimeSec: null,
      endTimeSec: null,
      events: [],
      outcome: null,
    });

    e.target.value = "";
  }

  function handleVideoReady(durationSec: number) {
    setSession((prev) => ({
      ...prev,
      durationSec,
      isReady: true,
    }));
  }

  function handleSeek(timeSec: number) {
    setCurrentTimeSec(clamp(timeSec, 0, session.durationSec || 0));
  }

  function addEvent(type: EventType) {
    if (!session.isReady) return;

    const nextEvent: TimelineEvent = {
      id: createId("event"),
      type,
      timeSec: currentTimeSec,
    };

    setDraft((prev) => ({
      ...prev,
      events: [...prev.events, nextEvent],
    }));
  }

  function markStart() {
    setDraft((prev) => ({
      ...prev,
      startTimeSec: currentTimeSec,
    }));
  }

  function markEnd() {
    setDraft((prev) => ({
      ...prev,
      endTimeSec: currentTimeSec,
    }));
  }

  function undo() {
    setDraft((prev) => {
      if (prev.outcome) {
        return { ...prev, outcome: null };
      }

      if (prev.events.length) {
        return {
          ...prev,
          events: prev.events.slice(0, -1),
        };
      }

      if (prev.endTimeSec != null) {
        return { ...prev, endTimeSec: null };
      }

      if (prev.startTimeSec != null) {
        return { ...prev, startTimeSec: null };
      }

      return prev;
    });
  }

  function setOutcome(outcome: Exclude<OutcomeType, null>) {
    setDraft((prev) => ({
      ...prev,
      outcome,
    }));
  }

  function savePossession() {
    if (!canSave || draft.startTimeSec == null || draft.endTimeSec == null || !draft.outcome) {
      return;
    }

    const saved = buildSavedPossession({
      id: draft.id,
      startTimeSec: draft.startTimeSec,
      endTimeSec: draft.endTimeSec,
      events: orderedEvents,
      outcome: draft.outcome,
    });

    onSavePossession?.(saved);

    setDraft({
      id: createId("possession"),
      startTimeSec: null,
      endTimeSec: null,
      events: [],
      outcome: null,
    });
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-5 sm:px-6">
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
            className="rounded-full bg-lime-300 px-4 py-3 text-sm font-medium text-black"
          >
            {session.url ? "Change video" : "Upload video"}
          </button>
        </div>

        <ReviewPlayer
          videoUrl={session.url}
          currentTimeSec={currentTimeSec}
          onReady={handleVideoReady}
          onTimeChange={setCurrentTimeSec}
        />

        <ReviewTimeline
          durationSec={session.durationSec}
          currentTimeSec={currentTimeSec}
          startTimeSec={draft.startTimeSec}
          endTimeSec={draft.endTimeSec}
          events={orderedEvents}
          onSeek={handleSeek}
        />

        <EventToolbar
          onAddEvent={addEvent}
          onMarkStart={markStart}
          onMarkEnd={markEnd}
          onUndo={undo}
        />

        <OutcomeBar
          value={draft.outcome}
          onChange={setOutcome}
          visible={draft.endTimeSec != null}
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