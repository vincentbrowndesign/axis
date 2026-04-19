export type OutcomeType = "DRIVE" | "PASS" | "SHOT" | null;

export type VideoState = {
  file: File;
  url: string;
  name: string;
  type: string;
  size: number;
};

export type DraftPossession = {
  start: number | null;
  end: number | null;
  outcome: OutcomeType;
};

export type SavedPossession = {
  id: string;
  start: number;
  end: number;
  outcome: Exclude<OutcomeType, null>;
};