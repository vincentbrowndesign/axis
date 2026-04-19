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
    const nextTime = clamp(ratio * safeDuration, 0, safeDuration);
    onSeek(nextTime);
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-white/58">
        <span>{formatTime(currentTimeSec)}</span>
        <span>{formatTime(safeDuration)}</span>
      </div>

      <div
        onClick={handleClick}
        className="relative h-16 cursor-pointer overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.04]"
      >
        <div className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 bg-white/8" />

        {startTimeSec != null && endTimeSec != null && endTimeSec > startTimeSec ? (
          <div
            className="absolute top-1/2 h-8 -translate-y-1/2 rounded-[12px] bg-lime-300/14"
            style={{
              left: toPercent(startTimeSec),
              width: `${((endTimeSec - startTimeSec) / safeDuration) * 100}%`,
            }}
          />
        ) : null}

        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSeek(event.timeSec);
            }}
            title={`${event.type} · ${formatTime(event.timeSec)}`}
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2"
            style={{ left: toPercent(event.timeSec) }}
          >
            <span className="absolute left-1/2 top-1/2 h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
          </button>
        ))}

        {startTimeSec != null ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSeek(startTimeSec);
            }}
            title={`Start · ${formatTime(startTimeSec)}`}
            className="absolute top-1/2 h-8 w-3 -translate-x-1/2 -translate-y-1/2"
            style={{ left: toPercent(startTimeSec) }}
          >
            <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-lime-300/80" />
          </button>
        ) : null}

        {endTimeSec != null ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSeek(endTimeSec);
            }}
            title={`End · ${formatTime(endTimeSec)}`}
            className="absolute top-1/2 h-8 w-3 -translate-x-1/2 -translate-y-1/2"
            style={{ left: toPercent(endTimeSec) }}
          >
            <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-lime-300/80" />
          </button>
        ) : null}

        <div
          className="absolute top-1/2 h-14 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.4)]"
          style={{ left: toPercent(currentTimeSec) }}
        />
      </div>
    </div>
  );
}