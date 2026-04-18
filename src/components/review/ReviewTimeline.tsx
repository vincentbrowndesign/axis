"use client";

import type { TimelineEvent } from "@/lib/review-types";
import { clamp, formatTime } from "@/lib/review-utils";

type Props = {
  durationSec: number;
  currentTimeSec: number;
  startTimeSec: number | null;
  endTimeSec: number | null;
  events: TimelineEvent[];
  onSeek: (timeSec: number) => void;
};

export default function ReviewTimeline({
  durationSec,
  currentTimeSec,
  startTimeSec,
  endTimeSec,
  events,
  onSeek,
}: Props) {
  const safeDuration = Math.max(durationSec, 0.1);

  function toPercent(timeSec: number) {
    return `${(clamp(timeSec, 0, safeDuration) / safeDuration) * 100}%`;
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = rect.width > 0 ? x / rect.width : 0;
    onSeek(clamp(ratio * safeDuration, 0, safeDuration));
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between text-sm text-white/60">
        <span>{formatTime(currentTimeSec)}</span>
        <span>{formatTime(safeDuration)}</span>
      </div>

      <div
        onClick={handleClick}
        className="relative h-16 cursor-pointer rounded-2xl bg-white/[0.05]"
      >
        {startTimeSec != null && endTimeSec != null && endTimeSec > startTimeSec ? (
          <div
            className="absolute top-0 h-full rounded-2xl bg-lime-300/15"
            style={{
              left: toPercent(startTimeSec),
              width: `${((endTimeSec - startTimeSec) / safeDuration) * 100}%`,
            }}
          />
        ) : null}

        {events.map((event) => (
          <div
            key={event.id}
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-white"
            style={{ left: toPercent(event.timeSec) }}
            title={event.type}
          />
        ))}

        <div
          className="absolute top-0 h-full w-[2px] bg-lime-300"
          style={{ left: toPercent(currentTimeSec) }}
        />
      </div>
    </div>
  );
}