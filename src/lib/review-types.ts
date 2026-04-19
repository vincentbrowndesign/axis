export type YesNo = "YES" | "NO" | null;
export type ActionType = "DRIVE" | "PASS" | "SHOT" | null;

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
  downhill: YesNo;
  action: ActionType;
  help: YesNo;
};

export type InferredRead = {
  saw: string;
  should: string;
  next: string;
  confidence: "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH";
};

export type SavedPossession = {
  id: string;
  start: number;
  end: number;
  downhill: Exclude<YesNo, null>;
  action: Exclude<ActionType, null>;
  help: Exclude<YesNo, null>;
  inference: InferredRead;
};