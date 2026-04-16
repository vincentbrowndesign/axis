"use client";

import { useMemo, useRef, useState } from "react";
import ExportReport from "@/components/export/ExportReport";
import {
  deriveSessionIntelligence,
  type PossessionRecord,
} from "@/components/export/intelligence";

type ReviewStep = {
  id: string;
  clipLabel: string;
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

type LinkRecord = {
  startAction?: StartAction;
  side?: Side;
  pressure?: Pressure;
  paintTouch?: PaintTouch;
  help?: Help;
  decision?: Decision;
  passTarget?: PassTarget;
};

type PossessionChain = {
  id: string;
  links: LinkRecord[];
  outcome?: Outcome;
  startTimeSec?: number;
  endTimeSec?: number;
  thumbnailUrl?: string;
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
  { id: "1", clipLabel: "Clip 1", timeLabel: "0:07" },
  { id: "2", clipLabel: "Clip 2", timeLabel: "0:05" },
  { id: "3", clipLabel: "Clip 3", timeLabel: "0:06" },
  { id: "4", clipLabel: "Clip 4", timeLabel: "0:04" },
  { id: "5", clipLabel: "Clip 5", timeLabel: "0:08" },
  { id: "6", clipLabel: "Clip 6", timeLabel: "0:05" },
  { id: "7", clipLabel: "Clip 7", timeLabel: "0:03" },
  { id: "8", clipLabel: "Clip 8", timeLabel: "0:06" },
];

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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTime(seconds?: number) {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

async function captureFrameAtTime(
  video: HTMLVideoElement,
  timeSec: number
): Promise<string> {
  const originalTime = video.currentTime;
  const safeTime = Math.max(0, Math.min(timeSec, Math.max(video.duration - 0.1, 0)));

  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Failed to seek video for thumbnail extraction."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = safeTime;
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    video.currentTime = originalTime;
    throw new Error("Could not create canvas context.");
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

  video.currentTime = originalTime;
  return dataUrl;
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

function QuickChip({
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
        "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em] transition",
        active
          ? "border-lime-300 bg-lime-300 text-black"
          : "border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08]"
      )}
    >
      {label}
    </button>
  );
}

function UtilityChip({
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
      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/72 transition hover:bg-white/[0.08]"
    >
      {label}
    </button>
  );
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full bg-white/[0.06] px-5 py-4 text-sm text-white/82">
      {children}
    </div>
  );
}

function buildFlowKeys(link: LinkRecord): FlowQuestionKey[] {
  const keys: FlowQuestionKey[] = [
    "startAction",
    "side",
    "pressure",
    "paintTouch",
    "help",
    "decision",
  ];

  if (link.decision === "pass") {
    keys.push("passTarget");
  }

  if (link.decision && link.decision !== "pass") {
    keys.push("outcome");
  }

  return keys;
}

function getQuestionMeta(key: FlowQuestionKey) {
  switch (key) {
    case "startAction":
      return {
        eyebrow: "Start",
        title: "How did it start?",
        subtitle: "Mark the first real action of this link.",
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
        subtitle: "A pass starts the next link in the chain.",
        options: DECISION_OPTIONS,
      };
    case "passTarget":
      return {
        eyebrow: "Pass",
        title: "Where did the pass go?",
        subtitle: "This ends the current link and starts the next one.",
        options: PASS_TARGET_OPTIONS,
      };
    case "outcome":
      return {
        eyebrow: "Outcome",
        title: "How did it end?",
        subtitle: "Only finish the possession when the chain actually ends.",
        options: OUTCOME_OPTIONS,
      };
  }
}

function linkSentence(link: LinkRecord) {
  const parts: string[] = [];

  if (link.startAction) parts.push(titleCase(link.startAction));
  if (link.side) parts.push(titleCase(link.side));
  if (link.pressure === "downhill_yes") parts.push("Downhill");
  if (link.pressure === "downhill_no") parts.push("No Downhill");
  if (link.paintTouch === "paint_yes") parts.push("Paint Touch");
  if (link.paintTouch === "paint_no") parts.push("No Paint");
  if (link.help === "help_yes") parts.push("Help");
  if (link.help === "help_no") parts.push("No Help");
  if (link.decision) parts.push(titleCase(link.decision));
  if (link.passTarget) parts.push(`To ${titleCase(link.passTarget)}`);

  return parts.join(" · ");
}

function chainToExportPossession(chain: PossessionChain): PossessionRecord {
  const first = chain.links[0] ?? {};
  const last = chain.links[chain.links.length - 1] ?? {};

  return {
    id: chain.id,
    startAction: first.startAction,
    side: first.side,
    pressure: first.pressure,
    paintTouch: first.paintTouch,
    help: first.help,
    decision: last.decision ?? first.decision,
    passTarget: last.passTarget,
    outcome: chain.outcome,
  };
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [activeTab, setActiveTab] = useState<"review" | "export">("review");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("No video selected");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [chains, setChains] = useState<Record<string, PossessionChain>>({});
  const [isCapturingThumb, setIsCapturingThumb] = useState(false);

  const currentStep = REVIEW_STEPS[currentStepIndex];
  const currentChain = chains[currentStep.id] ?? {
    id: currentStep.id,
    links: [{}],
    outcome: undefined,
  };

  const activeLinkIndex = currentChain.links.length - 1;
  const activeLink = currentChain.links[activeLinkIndex] ?? {};
  const flowKeys = buildFlowKeys(activeLink);

  const currentQuestionIndex = flowKeys.findIndex((key) => {
    switch (key) {
      case "startAction":
        return !activeLink.startAction;
      case "side":
        return !activeLink.side;
      case "pressure":
        return !activeLink.pressure;
      case "paintTouch":
        return !activeLink.paintTouch;
      case "help":
        return !activeLink.help;
      case "decision":
        return !activeLink.decision;
      case "passTarget":
        return !activeLink.passTarget;
      case "outcome":
        return !currentChain.outcome;
    }
  });

  const activeQuestionKey =
    currentQuestionIndex === -1
      ? flowKeys[flowKeys.length - 1]
      : flowKeys[currentQuestionIndex];

  const questionMeta = getQuestionMeta(activeQuestionKey);

  const taggedCount = useMemo(
    () =>
      Object.values(chains).filter((chain) => {
        return chain.links.some((link) =>
          Boolean(
            link.startAction ||
              link.side ||
              link.pressure ||
              link.paintTouch ||
              link.help ||
              link.decision ||
              link.passTarget
          )
        );
      }).length,
    [chains]
  );

  const reviewedPossessions = useMemo(
    () =>
      REVIEW_STEPS.map((step) => chains[step.id])
        .filter((chain): chain is PossessionChain => Boolean(chain?.outcome))
        .map(chainToExportPossession),
    [chains]
  );

  const sessionIntel = useMemo(
    () => deriveSessionIntelligence(reviewedPossessions),
    [reviewedPossessions]
  );

  const bestThumbnailUrl = useMemo(() => {
    const completedChains = REVIEW_STEPS.map((step) => chains[step.id]).filter(
      (chain): chain is PossessionChain => Boolean(chain?.outcome)
    );

    const withThumb = completedChains.find((chain) => chain.thumbnailUrl);
    return withThumb?.thumbnailUrl;
  }, [chains]);

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

  function updateChain(patch: Partial<PossessionChain>) {
    setChains((prev) => {
      const existing = prev[currentStep.id] ?? {
        id: currentStep.id,
        links: [{}],
        outcome: undefined,
      };

      return {
        ...prev,
        [currentStep.id]: {
          ...existing,
          ...patch,
        },
      };
    });
  }

  function updateActiveLink(patch: Partial<LinkRecord>) {
    setChains((prev) => {
      const existing = prev[currentStep.id] ?? {
        id: currentStep.id,
        links: [{}],
        outcome: undefined,
      };

      const nextLinks = [...existing.links];
      nextLinks[activeLinkIndex] = {
        ...nextLinks[activeLinkIndex],
        ...patch,
      };

      return {
        ...prev,
        [currentStep.id]: {
          ...existing,
          links: nextLinks,
        },
      };
    });
  }

  function setOutcome(outcome: Outcome) {
    setChains((prev) => {
      const existing = prev[currentStep.id] ?? {
        id: currentStep.id,
        links: [{}],
        outcome: undefined,
      };

      return {
        ...prev,
        [currentStep.id]: {
          ...existing,
          outcome,
        },
      };
    });

    window.setTimeout(() => {
      goNextPossession();
    }, 140);
  }

  function startNextLink() {
    setChains((prev) => {
      const existing = prev[currentStep.id] ?? {
        id: currentStep.id,
        links: [{}],
        outcome: undefined,
      };

      return {
        ...prev,
        [currentStep.id]: {
          ...existing,
          links: [...existing.links, {}],
        },
      };
    });
  }

  async function grabThumbnail() {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    try {
      setIsCapturingThumb(true);

      const start = currentChain.startTimeSec;
      const end = currentChain.endTimeSec;
      const current = video.currentTime || 0;

      const frameTime =
        start != null && end != null && end > start
          ? (start + end) / 2
          : start != null
            ? start
            : current;

      const thumbnailUrl = await captureFrameAtTime(video, frameTime);

      updateChain({ thumbnailUrl });
    } catch (error) {
      console.error(error);
      alert("Could not extract thumbnail from video.");
    } finally {
      setIsCapturingThumb(false);
    }
  }

  function markStart() {
    const video = videoRef.current;
    if (!video) return;
    updateChain({ startTimeSec: video.currentTime });
  }

  function markEnd() {
    const video = videoRef.current;
    if (!video) return;
    updateChain({ endTimeSec: video.currentTime });
  }

  function jumpToTime(time?: number) {
    if (time == null) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    video.play().catch(() => {});
  }

  function answerQuestion(value: string) {
    if (activeQuestionKey === "startAction") {
      updateActiveLink({ startAction: value as StartAction });
      return;
    }

    if (activeQuestionKey === "side") {
      updateActiveLink({ side: value as Side });
      return;
    }

    if (activeQuestionKey === "pressure") {
      updateActiveLink({ pressure: value as Pressure });
      return;
    }

    if (activeQuestionKey === "paintTouch") {
      updateActiveLink({ paintTouch: value as PaintTouch });
      return;
    }

    if (activeQuestionKey === "help") {
      updateActiveLink({ help: value as Help });
      return;
    }

    if (activeQuestionKey === "decision") {
      updateActiveLink({ decision: value as Decision });
      return;
    }

    if (activeQuestionKey === "passTarget") {
      updateActiveLink({ passTarget: value as PassTarget });
      window.setTimeout(() => {
        startNextLink();
      }, 120);
      return;
    }

    if (activeQuestionKey === "outcome") {
      setOutcome(value as Outcome);
    }
  }

  function quickSetStartAction(action: StartAction) {
    updateActiveLink({ startAction: action });
  }

  function quickSetSide(side: Side) {
    updateActiveLink({ side });
  }

  function quickSetPaintTouch(value: PaintTouch) {
    updateActiveLink({ paintTouch: value });
  }

  function undoCurrent() {
    setChains((prev) => {
      const existing = prev[currentStep.id];
      if (!existing) return prev;

      const next: PossessionChain = JSON.parse(JSON.stringify(existing));

      if (next.outcome) {
        next.outcome = undefined;
        return { ...prev, [currentStep.id]: next };
      }

      const lastLink = next.links[next.links.length - 1];
      if (!lastLink) return prev;

      if (
        !lastLink.startAction &&
        !lastLink.side &&
        !lastLink.pressure &&
        !lastLink.paintTouch &&
        !lastLink.help &&
        !lastLink.decision &&
        !lastLink.passTarget &&
        next.links.length > 1
      ) {
        next.links.pop();
        return { ...prev, [currentStep.id]: next };
      }

      if (lastLink.passTarget) {
        lastLink.passTarget = undefined;
        return { ...prev, [currentStep.id]: next };
      }
      if (lastLink.decision) {
        lastLink.decision = undefined;
        return { ...prev, [currentStep.id]: next };
      }
      if (lastLink.help) {
        lastLink.help = undefined;
        return { ...prev, [currentStep.id]: next };
      }
      if (lastLink.paintTouch) {
        lastLink.paintTouch = undefined;
        return { ...prev, [currentStep.id]: next };
      }
      if (lastLink.pressure) {
        lastLink.pressure = undefined;
        return { ...prev, [currentStep.id]: next };
      }
      if (lastLink.side) {
        lastLink.side = undefined;
        return { ...prev, [currentStep.id]: next };
      }
      if (lastLink.startAction) {
        lastLink.startAction = undefined;
        return { ...prev, [currentStep.id]: next };
      }

      if (currentStepIndex > 0) {
        setCurrentStepIndex((v) => v - 1);
      }

      return prev;
    });
  }

  function goNextPossession() {
    if (currentStepIndex < REVIEW_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      return;
    }

    setActiveTab("export");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
        <header className="mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.35em] text-white/25">
              Axis
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Review + Export
            </h1>
          </div>

          <div className="inline-flex self-start rounded-full bg-white/[0.05] p-1">
            <SegmentedTab
              active={activeTab === "review"}
              label="Review"
              onClick={() => setActiveTab("review")}
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
                        ref={videoRef}
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

                  <div className="flex flex-col gap-3 border-t border-white/8 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {START_ACTION_OPTIONS.map((option) => (
                          <QuickChip
                            key={option.value}
                            active={activeLink.startAction === option.value}
                            label={option.label}
                            onClick={() => quickSetStartAction(option.value)}
                          />
                        ))}
                      </div>

                      <div className="text-sm text-white/42">
                        {currentStep.timeLabel}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {SIDE_OPTIONS.map((option) => (
                        <QuickChip
                          key={option.value}
                          active={activeLink.side === option.value}
                          label={option.label}
                          onClick={() => quickSetSide(option.value)}
                        />
                      ))}

                      {PAINT_TOUCH_OPTIONS.map((option) => (
                        <QuickChip
                          key={option.value}
                          active={activeLink.paintTouch === option.value}
                          label={
                            option.label === "Paint Touch" ? "Paint" : "No Paint"
                          }
                          onClick={() => quickSetPaintTouch(option.value)}
                        />
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <UtilityChip label="Mark Start" onClick={markStart} />
                      <UtilityChip label="Mark End" onClick={markEnd} />
                      <UtilityChip
                        label={isCapturingThumb ? "Grabbing..." : "Grab Thumbnail"}
                        onClick={grabThumbnail}
                      />
                      {currentChain.startTimeSec != null ? (
                        <UtilityChip
                          label={`Go Start ${formatTime(currentChain.startTimeSec)}`}
                          onClick={() => jumpToTime(currentChain.startTimeSec)}
                        />
                      ) : null}
                      {currentChain.endTimeSec != null ? (
                        <UtilityChip
                          label={`Go End ${formatTime(currentChain.endTimeSec)}`}
                          onClick={() => jumpToTime(currentChain.endTimeSec)}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
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

                    <div className="hidden sm:block rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/72">
                      Link {activeLinkIndex + 1}
                    </div>
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
                        (activeQuestionKey === "startAction" &&
                          activeLink.startAction === option.value) ||
                        (activeQuestionKey === "side" &&
                          activeLink.side === option.value) ||
                        (activeQuestionKey === "pressure" &&
                          activeLink.pressure === option.value) ||
                        (activeQuestionKey === "paintTouch" &&
                          activeLink.paintTouch === option.value) ||
                        (activeQuestionKey === "help" &&
                          activeLink.help === option.value) ||
                        (activeQuestionKey === "decision" &&
                          activeLink.decision === option.value) ||
                        (activeQuestionKey === "passTarget" &&
                          activeLink.passTarget === option.value) ||
                        (activeQuestionKey === "outcome" &&
                          currentChain.outcome === option.value);

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
                    <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
                      Possession chain
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-[18px] border border-white/8 bg-black/40 p-4 text-sm text-white/78">
                        <div>Start · {formatTime(currentChain.startTimeSec)}</div>
                        <div>End · {formatTime(currentChain.endTimeSec)}</div>
                      </div>

                      {currentChain.thumbnailUrl ? (
                        <div className="overflow-hidden rounded-[18px] border border-white/8 bg-black/40">
                          <img
                            src={currentChain.thumbnailUrl}
                            alt="Possession thumbnail"
                            className="h-44 w-full object-cover"
                          />
                        </div>
                      ) : null}

                      {currentChain.links.map((link, index) => (
                        <div
                          key={index}
                          className="rounded-[18px] border border-white/8 bg-black/40 p-4"
                        >
                          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">
                            Link {index + 1}
                          </div>
                          <div className="text-sm leading-7 text-white/82">
                            {linkSentence(link) || "Waiting for input"}
                          </div>
                        </div>
                      ))}

                      {currentChain.outcome ? (
                        <div className="rounded-[18px] border border-lime-300/20 bg-lime-300/10 p-4 text-sm text-white/88">
                          Final Outcome ·{" "}
                          {titleCase(currentChain.outcome.replaceAll("_", " "))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="hidden xl:block">
              <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
                  Clip memory
                </div>

                <h3 className="text-3xl font-semibold tracking-tight">
                  Mark the possession window
                </h3>

                <p className="mt-4 max-w-sm text-base leading-7 text-white/68">
                  Start and end now belong to the possession. Thumbnail pulls a
                  real frame from that window.
                </p>

                <div className="mt-8 space-y-3">
                  <InfoPill>Mark Start at possession beginning</InfoPill>
                  <InfoPill>Mark End when the possession actually ends</InfoPill>
                  <InfoPill>Grab Thumbnail from the possession window</InfoPill>
                </div>

                <div className="mt-8 rounded-[24px] border border-white/8 bg-black/40 p-4">
                  <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">
                    Session snapshot
                  </div>
                  <div className="space-y-2 text-sm text-white/78">
                    <div>Reviewed: {sessionIntel.total}</div>
                    <div>Advantage: {sessionIntel.advantageRate}%</div>
                    <div>Breakdown: {sessionIntel.breakdownRate}%</div>
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
        ) : (
          <ExportReport
            possessions={reviewedPossessions}
            videoUrl={videoUrl}
            thumbnailUrl={bestThumbnailUrl}
          />
        )}
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