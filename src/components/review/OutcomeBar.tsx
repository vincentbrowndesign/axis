"use client";

import type { OutcomeType } from "@/lib/review-types";

const OPTIONS: Array<{ label: string; value: Exclude<OutcomeType, null> }> = [
  { label: "Make", value: "make" },
  { label: "Miss", value: "miss" },
  { label: "Turnover", value: "turnover" },
  { label: "Foul", value: "foul" },
];

type Props = {
  value: OutcomeType;
  onChange: (value: Exclude<OutcomeType, null>) => void;
  visible: boolean;
};

export default function OutcomeBar({ value, onChange, visible }: Props) {
  if (!visible) return null;

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3 text-sm text-white/55">Outcome</div>

      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const active = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={
                active
                  ? "rounded-full bg-lime-300 px-4 py-3 text-sm font-medium text-black"
                  : "rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}