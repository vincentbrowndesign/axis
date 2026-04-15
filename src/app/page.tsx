"use client";

import { useMemo, useRef, useState } from "react";

type ReviewStep = {
  id: string;
  clipLabel: string;
  actionLabel: string;
  zoneLabel: string;
  timeLabel: string;
};

type StartAction = "drive" | "pass" | "shot";
type Side = "left" | "middle" | "right";
type Pressure = "downhill_yes" | "downhill_no";
type PaintTouch = "paint_yes" | "paint_no";
type Help = "help_yes" | "help_no";
type Decision = "pass" | "finish" | "reset";
type PassTarget = "corner" | "wing" | "top" | "skip";
type Outcome = "make" | "miss" | "foul" | "turnover" | "not_shot";

type PossessionRecord = {
  startAction?: StartAction;
  side?: Side;
  pressure?: Pressure;
  paintTouch?: PaintTouch;
  help?: Help;
  decision?: Decision;
  passTarget?: PassTarget;
  outcome?: Outcome;
};

type FlowQuestionKey =
  | "startAction"
  | "side"
  | "pressure"
  | "paintTouch"
  | "help"
  | "decision"
  | "passTarget"
  | "outcome";

type Option<T extends string> = {
  value: T;
  label: string;
  tone?: "default" | "lime";
};

const REVIEW_STEPS: ReviewStep[] = [
  { id: "1", clipLabel: "Clip 1", actionLabel: "Drive", zoneLabel: "Paint", timeLabel: "0:07" },
  { id: "2", clipLabel: "Clip 2", actionLabel: "Pass", zoneLabel: "Wing", timeLabel: "0:05" },
  { id: "3", clipLabel: "Clip 3", actionLabel: "Drive", zoneLabel: "Paint", timeLabel: "0:06" },
  { id: "4", clipLabel: "Clip 4", actionLabel: "Shot", zoneLabel: "Wing", timeLabel: "0:04" },
  { id: "5", clipLabel: "Clip 5", actionLabel: "Drive", zoneLabel: "Paint", timeLabel: "0:08" },
  { id: "6", clipLabel: "Clip 6", actionLabel: "Pass", zoneLabel: "Corner", timeLabel: "0:05" },
  { id: "7", clipLabel: "Clip 7", actionLabel: "Shot", zoneLabel: "Corner", timeLabel: "0:03" },
  { id: "8", clipLabel: "Clip 8", actionLabel: "Drive", zoneLabel: "Rim", timeLabel: "0:06" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function SegmentedTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "touch-manipulation rounded-full px-5 py-3 text-base transition",
        active ? "bg-white text-black" : "text-white/65 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

function ChoiceButton({
  active,
  label,
  onClick,
  tone = "default",
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tone?: "default" | "lime";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "touch-manipulation min-h-[64px] rounded-[22px] border px-4 py-4 text-left text-lg font-medium transition-all duration-150",
        "select-none active:scale-[0.99]",
        active && tone === "lime"
          ? "border-lime-300 bg-lime-300 text-black shadow-[0_0_28px_rgba(190,242,100,0.18)]"
          : active
          ? "border-white/20 bg-white text-black"
          : "border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span
          className={cn(
            "h-3 w-3 rounded-full transition",
            active ? "bg-black/70" : "bg-white/30"
          )}
        />
      </div>
    </button>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/70">
      {children}
    </span>
  );
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full bg-white/[0.06] px-5 py-4 text-sm text-white/82">
      {children}
    </div>
  );
}

function StatRow({
  label,
  value,
  noBorder = false,
}: {
  label: string;
  value: string | number;
  noBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-4",
        !noBorder && "border-b border-white/8"
      )}
    >
      <span className="text-sm uppercase tracking-[0.28em] text-white/35">
        {label}
      </span>
      <span className="text-4xl font-semibold">{value}</span>
    </div>
  );
}

function ExportCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <div className="mb-2 text-xs uppercase tracking-[0.28em] text-white/35">
        {title}
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-white/82">
        {body}
      </pre>
    </div>
  );
}

const START_ACTION_OPTIONS: Option<StartAction>[] = [
  { value: "drive", label: "Drive", tone: "lime" },
  { value: "pass", label: "Pass", tone: "lime" },
  { value: "shot", label: "Shot", tone: "lime" },
];

const SIDE_OPTIONS: Option<Side>[] = [
  { value: "left", label: "Left", tone: "lime" },
  { value: "middle", label: "Middle", tone: "lime" },
  { value: "right", label: "Right", tone: "lime" },
];

const PRESSURE_OPTIONS: Option<Pressure>[] = [
  { value: "downhill_yes", label: "Downhill", tone: "lime" },
  { value: "downhill_no", label: "No Downhill" },
];

const PAINT_TOUCH_OPTIONS: Option<PaintTouch>[] = [
  { value: "paint_yes", label: "Paint Touch", tone: "lime" },
  { value: "paint_no", label: "No Paint" },
];

const HELP_OPTIONS: Option<Help>[] = [
  { value: "help_yes", label: "Help", tone: "lime" },
  { value: "help_no", label: "No Help" },
];

const DECISION_OPTIONS: Option<Decision>[] = [
  { value: "pass", label: "Pass", tone: "lime" },
  { value: "finish", label: "Finish", tone: "lime" },
  { value: "reset", label: "Reset" },
];

const PASS_TARGET_OPTIONS: Option<PassTarget>[] = [
  { value: "corner", label: "Corner", tone: "lime" },
  { value: "wing", label: "Wing", tone: "lime" },
  { value: "top", label: "Top" },
  { value: "skip", label: "Skip" },
];

const OUTCOME_OPTIONS: Option<Outcome>[] = [
  { value: "make", label: "Make", tone: "lime" },
  { value: "miss", label: "Miss" },
  { value: "foul", label: "Foul" },
  { value: "turnover", label: "Turnover" },
  { value: "not_shot", label: "Not a shot" },
];

function getFlowKeys(record: PossessionRecord): FlowQuestionKey[] {
  const keys: FlowQuestionKey[] = [
    "startAction",
    "side",
    "pressure",
    "paintTouch",
    "help",
    "decision",
  ];

  if (record.decision === "pass") {
    keys.push("passTarget");
  }

  keys.push("outcome");
  return keys;
}

function getQuestionMeta(record: PossessionRecord, key: FlowQuestionKey): {
  eyebrow: string;
  title: string;
  subtitle: string;
  options:
    | Option<StartAction>[]
    | Option<Side>[]
    | Option<Pressure>[]
    | Option<PaintTouch>[]
    | Option<Help>[]
    | Option<Decision>[]
    | Option<PassTarget>[]
    | Option<Outcome>[];
} {
  switch (key) {
    case "startAction":
      return {
        eyebrow: "Start",
        title: "How did it start?",
        subtitle: "Mark the first real action of the possession.",
        options: START_ACTION_OPTIONS,
      };
    case "side":
      return {
        eyebrow: "Side",
        title: "What side?",
        subtitle: "Where did the pressure start?",
        options: SIDE_OPTIONS,
      };
    case "pressure":
      return {
        eyebrow: "Pressure",
        title: "Did he get downhill?",
        subtitle: "Did he beat the first defender with advantage?",
        options: PRESSURE_OPTIONS,
      };
    case "paintTouch":
      return {
        eyebrow: "Paint",
        title: "Did it touch paint?",
        subtitle: "Mark whether the action reached the paint.",
        options: PAINT_TOUCH_OPTIONS,
      };
    case "help":
      return {
        eyebrow: "Defense",
        title: "Did help show?",
        subtitle: "Did the defense send help on the action?",
        options: HELP_OPTIONS,
      };
    case "decision":
      return {
        eyebrow: "Decision",
        title: "What happened next?",
        subtitle: "Mark the next decision after pressure/help.",
        options: DECISION_OPTIONS,
      };
    case "passTarget":
      return {
        eyebrow: "Pass",
        title: "Where did the pass go?",
        subtitle: "Keep it simple and environment friendly.",
        options: PASS_TARGET_OPTIONS,
      };
    case "outcome":
      return {
        eyebrow: "Outcome",
        title: "How did it end?",
        subtitle: "Mark the final result of the possession.",
        options: OUTCOME_OPTIONS,
      };
  }
}

function possessionSentence(record: PossessionRecord) {
  const parts: string[] = [];

  if (record.startAction) parts.push(titleCase(record.startAction));
  if (record.side) parts.push(titleCase(record.side));
  if (record.pressure === "downhill_yes") parts.push("Downhill");
  if (record.pressure === "downhill_no") parts.push("No downhill");
  if (record.paintTouch === "paint_yes") parts.push("Paint touch");
  if (record.paintTouch === "paint_no") parts.push("No paint");
  if (record.help === "help_yes") parts.push("Help");
  if (record.help === "help_no") parts.push("No help");

  if (record.decision === "pass") parts.push("Pass");
  if (record.decision === "finish") parts.push("Finish");
  if (record.decision === "reset") parts.push("Reset");

  if (record.passTarget) {
    const label = record.passTarget === "top" ? "Top" : titleCase(record.passTarget);
    parts.push(`To ${label}`);
  }

  if (record.outcome === "make") parts.push("Make");
  if (record.outcome === "miss") parts.push("Miss");
  if (record.outcome === "foul") parts.push("Foul");
  if (record.outcome === "turnover") parts.push("Turnover");
  if (record.outcome === "not_shot") parts.push("Not a shot");

  return parts.join(" · ");
}

function summarizeByCount<T extends string>(items: T[]) {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}: ${count}`);
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<"review" | "insights" | "export">("review");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("No video selected");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [records, setRecords] = useState<Record<string, PossessionRecord>>({});

  const currentStep = REVIEW_STEPS[currentStepIndex];
  const currentRecord = records[currentStep.id] ?? {};
  const flowKeys = getFlowKeys(currentRecord);

  const currentQuestionIndex = flowKeys.findIndex((key) => {
    switch (key) {
      case "startAction":
        return !currentRecord.startAction;
      case "side":
        return !currentRecord.side;
      case "pressure":
        return !currentRecord.pressure;
      case "paintTouch":
        return !currentRecord.paintTouch;
      case "help":
        return !currentRecord.help;
      case "decision":
        return !currentRecord.decision;
      case "passTarget":
        return !currentRecord.passTarget;
      case "outcome":
        return !currentRecord.outcome;
    }
  });

  const activeQuestionKey =
    currentQuestionIndex === -1 ? flowKeys[flowKeys.length - 1] : flowKeys[currentQuestionIndex];

  const questionMeta = getQuestionMeta(currentRecord, activeQuestionKey);
  const taggedCount = useMemo(
    () =>
      Object.values(records).filter((record) => {
        return Boolean(
          record.startAction ||
            record.side ||
            record.pressure ||
            record.paintTouch ||
            record.help ||
            record.decision ||
            record.passTarget ||
            record.outcome
        );
      }).length,
    [records]
  );

  const completedCount = useMemo(
    () =>
      REVIEW_STEPS.filter((step) => {
        const record = records[step.id];
        return Boolean(record?.outcome);
      }).length,
    [records]
  );

  const reviewedRecords = useMemo(
    () =>
      REVIEW_STEPS.map((step) => ({
        step,
        record: records[step.id] ?? {},
      })).filter(({ record }) => record.outcome),
    [records]
  );

  const downhillYes = reviewedRecords.filter(({ record }) => record.pressure === "downhill_yes").length;
  const helpYes = reviewedRecords.filter(({ record }) => record.help === "help_yes").length;
  const passDecisions = reviewedRecords.filter(({ record }) => record.decision === "pass").length;
  const paintTouches = reviewedRecords.filter(({ record }) => record.paintTouch === "paint_yes").length;
  const makes = reviewedRecords.filter(({ record }) => record.outcome === "make").length;

  const downhillRate = completedCount ? Math.round((downhillYes / completedCount) * 100) : 0;
  const helpRate = completedCount ? Math.round((helpYes / completedCount) * 100) : 0;
  const passRate = completedCount ? Math.round((passDecisions / completedCount) * 100) : 0;
  const paintRate = completedCount ? Math.round((paintTouches / completedCount) * 100) : 0;
  const makeRate = completedCount ? Math.round((makes / completedCount) * 100) : 0;

  const possessionStories = reviewedRecords.map(({ step, record }) => ({
    id: step.id,
    story: possessionSentence(record),
  }));

  const sideSummary = summarizeByCount(
    reviewedRecords
      .map(({ record }) => record.side)
      .filter((value): value is Side => Boolean(value))
      .map((value) => titleCase(value))
  );

  const passSummary = summarizeByCount(
    reviewedRecords
      .map(({ record }) => record.passTarget)
      .filter((value): value is PassTarget => Boolean(value))
      .map((value) => (value === "top" ? "Top" : titleCase(value)))
  );

  const exportPayload = {
    session: {
      totalReviewed: completedCount,
      downhillRate,
      helpRate,
      passRate,
      paintRate,
      makeRate,
    },
    possessions: reviewedRecords.map(({ step, record }) => ({
      id: step.id,
      clipLabel: step.clipLabel,
      sentence: possessionSentence(record),
      ...record,
    })),
    summaries: {
      sideSummary,
      passSummary,
    },
  };

  function handlePickVideo() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const objectUrl = URL.createObjectURL(file);

    setVideoUrl(objectUrl);
    setVideoName(file.name);
  }

  function patchRecord(patch: Partial<PossessionRecord>) {
    setRecords((prev) => ({
      ...prev,
      [currentStep.id]: {
        ...prev[currentStep.id],
        ...patch,
      },
    }));
  }

  function answerQuestion(value: string) {
    if (activeQuestionKey === "startAction") patchRecord({ startAction: value as StartAction });
    if (activeQuestionKey === "side") patchRecord({ side: value as Side });
    if (activeQuestionKey === "pressure") patchRecord({ pressure: value as Pressure });
    if (activeQuestionKey === "paintTouch") patchRecord({ paintTouch: value as PaintTouch });
    if (activeQuestionKey === "help") patchRecord({ help: value as Help });
    if (activeQuestionKey === "decision") {
      const nextDecision = value as Decision;
      if (nextDecision !== "pass") {
        patchRecord({ decision: nextDecision, passTarget: undefined });
      } else {
        patchRecord({ decision: nextDecision });
      }
    }
    if (activeQuestionKey === "passTarget") patchRecord({ passTarget: value as PassTarget });
    if (activeQuestionKey === "outcome") {
      patchRecord({ outcome: value as Outcome });
      window.setTimeout(() => {
        goNextPossession();
      }, 140);
    }
  }

  function undoCurrent() {
    const record = currentRecord;
    const keys = getFlowKeys(record);

    let lastAnsweredKey: FlowQuestionKey | null = null;

    for (const key of keys) {
      const hasValue =
        (key === "startAction" && record.startAction) ||
        (key === "side" && record.side) ||
        (key === "pressure" && record.pressure) ||
        (key === "paintTouch" && record.paintTouch) ||
        (key === "help" && record.help) ||
        (key === "decision" && record.decision) ||
        (key === "passTarget" && record.passTarget) ||
        (key === "outcome" && record.outcome);

      if (hasValue) lastAnsweredKey = key;
      else break;
    }

    if (!lastAnsweredKey) {
      if (currentStepIndex > 0) {
        setCurrentStepIndex((prev) => prev - 1);
      }
      return;
    }

    const nextRecord = { ...record };

    if (lastAnsweredKey === "startAction") nextRecord.startAction = undefined;
    if (lastAnsweredKey === "side") nextRecord.side = undefined;
    if (lastAnsweredKey === "pressure") nextRecord.pressure = undefined;
    if (lastAnsweredKey === "paintTouch") nextRecord.paintTouch = undefined;
    if (lastAnsweredKey === "help") nextRecord.help = undefined;
    if (lastAnsweredKey === "decision") {
      nextRecord.decision = undefined;
      nextRecord.passTarget = undefined;
      nextRecord.outcome = undefined;
    }
    if (lastAnsweredKey === "passTarget") {
      nextRecord.passTarget = undefined;
      nextRecord.outcome = undefined;
    }
    if (lastAnsweredKey === "outcome") nextRecord.outcome = undefined;

    setRecords((prev) => ({
      ...prev,
      [currentStep.id]: nextRecord,
    }));
  }

  function goNextPossession() {
    if (currentStepIndex < REVIEW_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      return;
    }
    setActiveTab("insights");
  }

  const currentSentence = possessionSentence(currentRecord);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
        <header className="mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.35em] text-white/25">
              Axis
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Review + Insights
            </h1>
          </div>

          <div className="inline-flex self-start rounded-full bg-white/[0.05] p-1">
            <SegmentedTab
              active={activeTab === "review"}
              label="Review"
              onClick={() => setActiveTab("review")}
            />
            <SegmentedTab
              active={activeTab === "insights"}
              label="Insights"
              onClick={() => setActiveTab("insights")}
            />
            <SegmentedTab
              active={activeTab === "export"}
              label="Export"
              onClick={() => setActiveTab("export")}
            />
          </div>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mov,.mp4,.m4v,.webm"
          className="hidden"
          onChange={handleFileChange}
        />

        {activeTab === "review" ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4 sm:p-5 lg:p-6">
              <div className="mb-4 flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePickVideo}
                    className="touch-manipulation rounded-full bg-lime-300 px-5 py-3 text-sm font-medium text-black transition active:scale-[0.99]"
                  >
                    {videoUrl ? "Change video" : "Upload video"}
                  </button>

                  <span className="max-w-full truncate text-sm text-white/58">
                    {videoName}
                  </span>
                </div>

                <div className="text-sm text-white/42">
                  {currentStepIndex + 1}/{REVIEW_STEPS.length}
                </div>
              </div>

              <div className="space-y-5">
                <div className="overflow-hidden rounded-[26px] border border-white/8 bg-black">
                  <div className="relative aspect-[9/12] w-full sm:aspect-video xl:aspect-[16/10]">
                    {videoUrl ? (
                      <video
                        src={videoUrl}
                        controls
                        playsInline
                        muted
                        preload="metadata"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-white/35">
                        Use the upload button above to add a game clip
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Chip>{currentStep.actionLabel}</Chip>
                      <Chip>{currentStep.zoneLabel}</Chip>
                    </div>

                    <div className="text-sm text-white/42">{currentStep.timeLabel}</div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.28em] text-white/32">
                      {questionMeta.eyebrow}
                    </div>
                    <h2 className="text-[2.45rem] font-semibold leading-none tracking-tight sm:text-[3rem]">
                      {questionMeta.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-base text-white/54">
                      {questionMeta.subtitle}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "grid gap-3",
                      questionMeta.options.length <= 3
                        ? "grid-cols-1 sm:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2"
                    )}
                  >
                    {questionMeta.options.map((option) => {
                      const isActive =
                        (activeQuestionKey === "startAction" && currentRecord.startAction === option.value) ||
                        (activeQuestionKey === "side" && currentRecord.side === option.value) ||
                        (activeQuestionKey === "pressure" && currentRecord.pressure === option.value) ||
                        (activeQuestionKey === "paintTouch" && currentRecord.paintTouch === option.value) ||
                        (activeQuestionKey === "help" && currentRecord.help === option.value) ||
                        (activeQuestionKey === "decision" && currentRecord.decision === option.value) ||
                        (activeQuestionKey === "passTarget" && currentRecord.passTarget === option.value) ||
                        (activeQuestionKey === "outcome" && currentRecord.outcome === option.value);

                      return (
                        <ChoiceButton
                          key={option.value}
                          active={isActive}
                          label={option.label}
                          tone={option.tone ?? "default"}
                          onClick={() => answerQuestion(option.value)}
                        />
                      );
                    })}
                  </div>

                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="mb-2 text-xs uppercase tracking-[0.28em] text-white/35">
                      Possession story
                    </div>
                    <div className="text-lg leading-8 text-white/86">
                      {currentSentence || "Start tapping to build the possession story."}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="hidden xl:block">
              <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
                  Grammar
                </div>

                <h3 className="text-3xl font-semibold tracking-tight">
                  Tell the possession to the machine
                </h3>

                <p className="mt-4 max-w-sm text-base leading-7 text-white/68">
                  One answer at a time. The taps become structure. The structure becomes export.
                </p>

                <div className="mt-8 space-y-3">
                  <InfoPill>Action → side → pressure → paint</InfoPill>
                  <InfoPill>Help → decision → pass target</InfoPill>
                  <InfoPill>Outcome closes the possession story</InfoPill>
                </div>

                <div className="mt-8">
                  <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
                    Current clip
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-black/40 p-4 text-sm leading-7 text-white/82">
                    {currentSentence || "No possession story yet."}
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between text-sm text-white/48">
                  <span>{taggedCount} tagged</span>
                  <span>
                    {currentStepIndex + 1}/{REVIEW_STEPS.length}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === "insights" ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
              <div className="space-y-1">
                <StatRow label="Reviewed moments" value={completedCount} />
                <StatRow label="Downhill rate" value={`${downhillRate}%`} />
                <StatRow label="Paint touch rate" value={`${paintRate}%`} />
                <StatRow label="Help rate" value={`${helpRate}%`} />
                <StatRow label="Pass rate" value={`${passRate}%`} />
                <StatRow label="Make rate" value={`${makeRate}%`} noBorder />
              </div>

              <div className="mt-8 rounded-[28px] border border-white/8 bg-black/40 p-5">
                <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
                  Pattern read
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="mb-2 text-2xl font-semibold">
                      What created pressure
                    </h4>
                    <p className="text-base leading-7 text-white/70">
                      Downhill showed up on {downhillRate}% of reviewed possessions. Paint touch showed up on {paintRate}%.
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-2 text-2xl font-semibold">
                      What happened when help came
                    </h4>
                    <p className="text-base leading-7 text-white/70">
                      Help appeared on {helpRate}% of reviewed possessions. Pass decisions showed up on {passRate}%.
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-2 text-2xl font-semibold">
                      Shot context
                    </h4>
                    <p className="text-base leading-7 text-white/70">
                      Makes landed at {makeRate}% across completed possession records.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
                Possession stories
              </div>

              <div className="space-y-3">
                {possessionStories.length ? (
                  possessionStories.map((item) => (
                    <InfoPill key={item.id}>{item.story}</InfoPill>
                  ))
                ) : (
                  <InfoPill>No completed possession stories yet.</InfoPill>
                )}
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === "export" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ExportCard
                title="Possession stories"
                body={
                  possessionStories.length
                    ? possessionStories.map((item) => `#${item.id} ${item.story}`).join("\n")
                    : "No completed possession stories yet."
                }
              />

              <ExportCard
                title="Session summary"
                body={[
                  `Reviewed moments: ${completedCount}`,
                  `Downhill rate: ${downhillRate}%`,
                  `Paint touch rate: ${paintRate}%`,
                  `Help rate: ${helpRate}%`,
                  `Pass rate: ${passRate}%`,
                  `Make rate: ${makeRate}%`,
                  "",
                  "Side summary:",
                  ...(sideSummary.length ? sideSummary : ["No side data"]),
                  "",
                  "Pass summary:",
                  ...(passSummary.length ? passSummary : ["No pass target data"]),
                ].join("\n")}
              />
            </div>

            <ExportCard
              title="Export JSON"
              body={JSON.stringify(exportPayload, null, 2)}
            />
          </div>
        ) : null}
      </div>

      {activeTab === "review" ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-black/85 backdrop-blur md:hidden">
          <div
            className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
            }}
          >
            <div className="text-sm text-white/50">{taggedCount} tagged</div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={undoCurrent}
                className="touch-manipulation rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white active:scale-[0.99]"
              >
                Undo
              </button>

              <button
                type="button"
                onClick={goNextPossession}
                className="touch-manipulation rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white active:scale-[0.99]"
              >
                Skip
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("export")}
                className="touch-manipulation rounded-full bg-lime-300 px-4 py-3 text-sm font-medium text-black active:scale-[0.99]"
              >
                Export
              </button>
            </div>

            <div className="text-sm text-white/50">
              {currentStepIndex + 1}/{REVIEW_STEPS.length}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}