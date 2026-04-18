"use client";

import type { OutcomeType, TimelineEvent } from "@/lib/review-types";
import { buildStory, getEventLabel, sortEvents } from "@/lib/review-utils";

type Props = {
  startTimeSec: number | null;
  endTimeSec: number | null;
  events: TimelineEvent[];
  outcome: OutcomeType;
};

export default function PossessionSummary({
  startTimeSec,
  endTimeSec,
  events,
  outcome,
}: Props) {
  const ordered = sortEvents(events);

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3 text-sm text-white/55">Possession</div>

      <div className="space-y-2 text-sm text-white/80">
        <div>Start: {startTimeSec == null ? "—" : startTimeSec.toFixed(2)}</div>
        <div>End: {endTimeSec == null ? "—" : endTimeSec.toFixed(2)}</div>
        <div>Outcome: {outcome ?? "—"}</div>
      </div>

      <div className="mt-4 space-y-2">
        {ordered.length ? (
          ordered.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/85"
            >
              {getEventLabel(event.type)} · {event.timeSec.toFixed(2)}
            </div>
          ))
        ) : (
          <div className="text-sm text-white/45">No events yet.</div>
        )}
      </div>

      <div className="mt-4 text-base font-medium text-white">
        {buildStory(ordered, outcome)}
      </div>
    </div>
  );
}