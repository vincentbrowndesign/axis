export type RootAction =
  | "catch"
  | "drive"
  | "pass"
  | "shot"
  | "turnover"
  | "reset"
  | "foul";

export type DriveLane = "left" | "middle" | "right";
export type HelpState = "help" | "no_help";
export type PassTarget = "left" | "middle" | "right";
export type ShotResult = "make" | "miss" | "blocked";
export type DriveResult =
  | "finish"
  | "pass"
  | "pull_up"
  | "foul"
  | "turnover"
  | "reset";

export type PossessionStepType =
  | "catch"
  | "drive"
  | "drive_downhill"
  | "drive_lane"
  | "drive_help"
  | "drive_result"
  | "pass"
  | "pass_target"
  | "shot"
  | "shot_result"
  | "turnover"
  | "reset"
  | "foul";

export type PossessionMeta = {
  downhill?: boolean;
  lane?: DriveLane;
  help?: HelpState;
  passTarget?: PassTarget;
  shotResult?: ShotResult;
  driveResult?: DriveResult;
};

export type PossessionStep = {
  id: string;
  type: PossessionStepType;
  label: string;
  timeSec: number;
  parentId: string | null;
  nextId: string | null;
  meta?: PossessionMeta;
};

export type PossessionChain = {
  id: string;
  startedAtSec: number;
  rootAction: RootAction;
  steps: PossessionStep[];
  closed: boolean;
};

export type MarkerType =
  | "catch"
  | "drive"
  | "pass"
  | "shot"
  | "turnover"
  | "reset"
  | "foul";

export type Marker = {
  id: string;
  type: MarkerType;
  timeSec: number;
  possessionId: string;
  stepId: string;
};

export type Clip = {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
};

export type ReviewTab = "details" | "clips" | "insights";

export type UploadState =
  | "idle"
  | "creating-url"
  | "uploading"
  | "processing"
  | "ready"
  | "error";

export type AssetResponse = {
  id: string;
  status: string;
  playback_ids?: Array<{ id: string; policy: string }>;
};

export type ContextAction =
  | "drive_downhill_yes"
  | "drive_downhill_no"
  | "drive_lane_left"
  | "drive_lane_middle"
  | "drive_lane_right"
  | "drive_help_yes"
  | "drive_help_no"
  | "drive_result_finish"
  | "drive_result_pass"
  | "drive_result_pull_up"
  | "drive_result_foul"
  | "drive_result_turnover"
  | "drive_result_reset"
  | "pass_target_left"
  | "pass_target_middle"
  | "pass_target_right"
  | "shot_result_make"
  | "shot_result_miss"
  | "shot_result_blocked";

export type PendingFlow =
  | {
      kind: "drive";
      possessionId: string;
      lastStepId: string;
      downhill?: boolean;
      lane?: DriveLane;
      help?: HelpState;
    }
  | {
      kind: "pass";
      possessionId: string;
      lastStepId: string;
      passTarget?: PassTarget;
    }
  | {
      kind: "shot";
      possessionId: string;
      lastStepId: string;
    }
  | null;