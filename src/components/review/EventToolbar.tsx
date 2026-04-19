"use client";

import type { EventType } from "@/lib/review-types";

type GuidedStep =
  | "startAction"
  | "side"
  | "paint"
  | "help"
  | "decision"
  | "outcome"
  | "done";

type Option = {
  label: string;
  value: EventType;
};

const STEP_OPTIONS: Record<GuidedStep, Option[]> = {
  startAction: [
    { label: "Drive", value: "drive" },
    { label: "Pass", value: "pass" },
    { label: "Shot", value: "shot" },
  ],
  side: [
    { label: "Left", value: "left" },
    { label: "Middle", value: "middle" },
    { label: "Right", value: "right" },
  ],
  paint: [
    { label: "Paint", value: "paint" },
    { label: "No Paint", value: "no_paint" },
  ],
  help: [
    { label: "Help", value: "help" },
    { label: "No Help", value: "no_help" },
  ],
  decision: [
    { label: "Finish", value: "finish" },
    { label: "Reset", value: "reset" },
    { label: "Pass", value: "pass" },
  ],
  outcome: [
    { label: "Make", value: "make" },
    { label: "Miss", value: "miss" },
    { label: "Turnover", value: "turnover" },
    { label: "Foul", value: "foul" },
  ],
  done: [],
};

type Props = {
  guidedStep: GuidedStep;
  activeLabels: string[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onAddEvent: (type: EventType) => void;
  onMarkStart: () => void;
  onMarkEnd: () => void;
  onUndo: () => void;
};

function railTitle(step: GuidedStep) {
  switch (step) {
    case "startAction":
      return "Action";
    case "side":
      return "Side";
    case "paint":
      return "Paint";
    case "help":
      return "Help";
    case "decision":
      return "Decision";
    case "outcome":
      return "Outcome";
    case "done":
      return "Done";
  }
}

function ToolButton({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "lime";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === "lime"
          ? "h-8 shrink-0 rounded-lg bg-lime-300 px-3 text-xs font-medium text-black active:scale-[0.97] active:bg-lime-300/90"
          : "h-8 shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-white/78 active:scale-[0.97] active:bg-white/[0.08]"
      }
    >
      {label}
    </button>
  );
}

function EventTool({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-white/82 active:scale-[0.97] active:bg-lime-300/20"
    >
      {label}
    </button>
  );
}

export default function EventToolbar({
  guidedStep,
  activeLabels,
  isPlaying,
  onTogglePlay,
  onAddEvent,
  onMarkStart,
  onMarkEnd,
  onUndo,
}: Props) {
  const options = STEP_OPTIONS[guidedStep];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <ToolButton label={isPlaying ? "Pause" : "Play"} onClick={onTogglePlay} />
        <ToolButton label="Start" onClick={onMarkStart} tone="lime" />
        <ToolButton label="End" onClick={onMarkEnd} tone="lime" />
        <ToolButton label="Undo" onClick={onUndo} />
      </div>

      {activeLabels.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeLabels.map((label, index) => (
            <div
              key={`${label}-${index}`}
              className="h-7 shrink-0 rounded-lg border border-white/8 bg-white/[0.04] px-3 text-[11px] leading-7 text-white/56"
            >
              {label}
            </div>
          ))}
        </div>
      ) : null}

      {guidedStep !== "done" ? (
        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-3">
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/42">
            {railTitle(guidedStep)}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {options.map((option) => (
              <EventTool
                key={`${guidedStep}-${option.value}`}
                label={option.label}
                onClick={() => onAddEvent(option.value)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm text-white/60">
          Possession path complete. Save it or undo the last action.
        </div>
      )}
    </div>
  );
}