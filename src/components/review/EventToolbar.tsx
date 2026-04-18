"use client";

import type { EventType } from "@/lib/review-types";

const EVENT_ROWS: Array<Array<{ label: string; value: EventType }>> = [
  [
    { label: "Drive", value: "drive" },
    { label: "Pass", value: "pass" },
    { label: "Shot", value: "shot" },
  ],
  [
    { label: "Left", value: "left" },
    { label: "Middle", value: "middle" },
    { label: "Right", value: "right" },
  ],
  [
    { label: "Paint", value: "paint" },
    { label: "No Paint", value: "no_paint" },
    { label: "Help", value: "help" },
    { label: "No Help", value: "no_help" },
  ],
  [
    { label: "Finish", value: "finish" },
    { label: "Reset", value: "reset" },
  ],
];

type Props = {
  onAddEvent: (type: EventType) => void;
  onMarkStart: () => void;
  onMarkEnd: () => void;
  onUndo: () => void;
};

export default function EventToolbar({
  onAddEvent,
  onMarkStart,
  onMarkEnd,
  onUndo,
}: Props) {
  return (
    <div className="space-y-3">
      {EVENT_ROWS.map((row, index) => (
        <div key={index} className="flex flex-wrap gap-2">
          {row.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onAddEvent(item.value)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={onMarkStart}
          className="rounded-full bg-lime-300 px-4 py-3 text-sm font-medium text-black"
        >
          Mark Start
        </button>

        <button
          type="button"
          onClick={onMarkEnd}
          className="rounded-full bg-lime-300 px-4 py-3 text-sm font-medium text-black"
        >
          Mark End
        </button>

        <button
          type="button"
          onClick={onUndo}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
        >
          Undo
        </button>
      </div>
    </div>
  );
}