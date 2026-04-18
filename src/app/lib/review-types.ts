export type ReviewMode = "idle" | "marking" | "completed";

export type EventType =
  | "drive"
  | "pass"
  | "shot"
  | "left"
  | "middle"
  | "right"
  | "paint"
  | "no_paint"
  | "help"
  | "no_help"
  | "finish"
  | "reset"
  | "make"
  | "miss"
  | "turnover"
  | "foul";

export type OutcomeType = "make" | "miss" | "turnover" | "foul" | null;

export type TimelineEvent = {
  id: string;
  type: EventType;
  timeSec: number;
};

export type PossessionDraft = {
  id: string;
  startTimeSec: number | null;
  endTimeSec: number | null;
  events: TimelineEvent[];
  outcome: OutcomeType;
};

export type SavedPossession = {
  id: string;
  startTimeSec: number;
  endTimeSec: number;
  events: TimelineEvent[];
  outcome: Exclude<OutcomeType, null>;
  story: string;
  state: "advantage" | "neutral" | "breakdown";
};

export type VideoSession = {
  file: File | null;
  url: string;
  name: string;
  durationSec: number;
  isReady: boolean;
};