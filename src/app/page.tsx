"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ReviewStep = {
  id: string;
  action: string;
  zone: string;
  timeLabel: string;
};

type ReviewAnswer = {
  downhill?: boolean;
  help?: boolean;
  outcome?: "make" | "miss" | "not_shot";
};

const REVIEW_STEPS: ReviewStep[] = [
  { id: "1", action: "Drive", zone: "Paint", timeLabel: "0:07" },
  { id: "2", action: "Pass", zone: "Corner", timeLabel: "0:05" },
  { id: "3", action: "Drive", zone: "Middle", timeLabel: "0:06" },
  { id: "4", action: "Shot", zone: "Wing", timeLabel: "0:04" },
  { id: "5", action: "Drive", zone: "Paint", timeLabel: "0:08" },
  { id: "6", action: "Pass", zone: "Lift", timeLabel: "0:05" },
  { id: "7", action: "Shot", zone: "Corner", timeLabel: "0:03" },
  { id: "8", action: "Drive", zone: "Rim", timeLabel: "0:06" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

function ToggleButton({
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
        "touch-manipulation min-h-[58px] rounded-[20px] border px-4 py-4 text-left text-lg font-medium transition-all duration-150",
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

function QuestionBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[2rem] font-semibold leading-none tracking-tight">
          {title}
        </h3>
        <p className="mt-2 text-base text-white/52">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [activeTab, setActiveTab] = useState<"review" | "insights">("review");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("No video selected");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ReviewAnswer>>({});
  const [runtimeError, setRuntimeError] = useState("");

  const currentStep = REVIEW_STEPS[currentStepIndex];
  const currentAnswer = answers[currentStep.id] ?? {};

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setRuntimeError(event.message || "Unknown runtime error");
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      setRuntimeError(
        typeof reason === "string"
          ? reason
          : reason?.message || "Unhandled promise rejection"
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const reviewedMoments = useMemo(() => Object.keys(answers).length, [answers]);

  const taggedCount = useMemo(() => {
    return Object.values(answers).filter((answer) => {
      return (
        typeof answer.downhill === "boolean" ||
        typeof answer.help === "boolean" ||
        typeof answer.outcome === "string"
      );
    }).length;
  }, [answers]);

  const downhillYes = useMemo(() => {
    return Object.values(answers).filter((answer) => answer.downhill === true)
      .length;
  }, [answers]);

  const helpYes = useMemo(() => {
    return Object.values(answers).filter((answer) => answer.help === true)
      .length;
  }, [answers]);

  const shotMakes = useMemo(() => {
    return Object.values(answers).filter((answer) => answer.outcome === "make")
      .length;
  }, [answers]);

  const downhillRate =
    reviewedMoments > 0 ? Math.round((downhillYes / reviewedMoments) * 100) : 0;

  const helpRate =
    reviewedMoments > 0 ? Math.round((helpYes / reviewedMoments) * 100) : 0;

  const makeRate =
    reviewedMoments > 0 ? Math.round((shotMakes / reviewedMoments) * 100) : 0;

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
    setCurrentStepIndex(0);
    setAnswers({});
    setActiveTab("review");
    setRuntimeError("");

    requestAnimationFrame(() => {
      videoRef.current?.load();
    });
  }

  function patchAnswer(patch: Partial<ReviewAnswer>) {
    setAnswers((prev) => ({
      ...prev,
      [currentStep.id]: {
        ...prev[currentStep.id],
        ...patch,
      },
    }));
  }

  function goNext() {
    if (currentStepIndex < REVIEW_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      return;
    }

    setActiveTab("insights");
  }

  function undoStep() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }

  function selectOutcome(outcome: "make" | "miss" | "not_shot") {
    patchAnswer({ outcome });
    window.setTimeout(() => {
      goNext();
    }, 120);
  }

  const canAdvance =
    typeof currentAnswer.downhill === "boolean" &&
    typeof currentAnswer.help === "boolean" &&
    typeof currentAnswer.outcome === "string";

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
          </div>
        </header>

        {runtimeError ? (
          <div className="mb-5 rounded-[20px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Runtime error: {runtimeError}
          </div>
        ) : null}

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

                  <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Chip>{currentStep.action}</Chip>
                      <Chip>{currentStep.zone}</Chip>
                    </div>

                    <div className="text-sm text-white/42">
                      {currentStep.timeLabel}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.28em] text-white/32">
                      Moment
                    </div>
                    <h2 className="text-[2.65rem] font-semibold leading-none tracking-tight sm:text-[3rem]">
                      {currentStep.action} · {currentStep.zone}
                    </h2>
                  </div>

                  <QuestionBlock
                    title="Downhill"
                    subtitle="Did he beat the first defender?"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <ToggleButton
                        active={currentAnswer.downhill === true}
                        label="Yes"
                        tone="lime"
                        onClick={() => patchAnswer({ downhill: true })}
                      />
                      <ToggleButton
                        active={currentAnswer.downhill === false}
                        label="No"
                        onClick={() => patchAnswer({ downhill: false })}
                      />
                    </div>
                  </QuestionBlock>

                  <QuestionBlock
                    title="Help"
                    subtitle="Did the defense send help?"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <ToggleButton
                        active={currentAnswer.help === true}
                        label="Help"
                        tone="lime"
                        onClick={() => patchAnswer({ help: true })}
                      />
                      <ToggleButton
                        active={currentAnswer.help === false}
                        label="No Help"
                        onClick={() => patchAnswer({ help: false })}
                      />
                    </div>
                  </QuestionBlock>

                  <QuestionBlock
                    title="Outcome"
                    subtitle="Add outcome if this is a shot."
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <ToggleButton
                        active={currentAnswer.outcome === "make"}
                        label="Make"
                        tone="lime"
                        onClick={() => selectOutcome("make")}
                      />
                      <ToggleButton
                        active={currentAnswer.outcome === "miss"}
                        label="Miss"
                        onClick={() => selectOutcome("miss")}
                      />
                      <ToggleButton
                        active={currentAnswer.outcome === "not_shot"}
                        label="Not a shot"
                        onClick={() => selectOutcome("not_shot")}
                      />
                    </div>
                  </QuestionBlock>
                </div>
              </div>
            </section>

            <aside className="hidden xl:block">
              <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
                  Flow
                </div>

                <h3 className="text-3xl font-semibold tracking-tight">
                  Review one moment at a time
                </h3>

                <p className="mt-4 max-w-sm text-base leading-7 text-white/68">
                  Tap downhill. Tap help. Add outcome if it is a shot. Then it
                  moves forward automatically.
                </p>

                <div className="mt-8 space-y-3">
                  <InfoPill>Live event = action + zone + time</InfoPill>
                  <InfoPill>Review = downhill + help + outcome</InfoPill>
                  <InfoPill>
                    Insight = generated later, never hand-entered
                  </InfoPill>
                </div>

                <div className="mt-8">
                  <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
                    Controls
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={undoStep}
                      className="touch-manipulation w-full rounded-full border border-white/10 bg-white/[0.05] px-5 py-4 text-left text-base text-white transition active:scale-[0.99]"
                    >
                      Undo
                    </button>

                    <button
                      type="button"
                      onClick={goNext}
                      className="touch-manipulation w-full rounded-full border border-white/10 bg-white/[0.05] px-5 py-4 text-left text-base text-white transition active:scale-[0.99]"
                    >
                      Skip
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("insights")}
                      className="touch-manipulation w-full rounded-full bg-lime-300 px-5 py-4 text-left text-base font-medium text-black transition active:scale-[0.99]"
                    >
                      View insights
                    </button>
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
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
              <div className="space-y-1">
                <StatRow label="Reviewed moments" value={reviewedMoments} />
                <StatRow label="Downhill rate" value={`${downhillRate}%`} />
                <StatRow label="Help drawn" value={`${helpRate}%`} />
                <StatRow
                  label="Shot makes"
                  value={`${makeRate}%`}
                  noBorder
                />
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
                      Downhill showed up on {downhillRate}% of reviewed moments.
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-2 text-2xl font-semibold">
                      What happened when help came
                    </h4>
                    <p className="text-base leading-7 text-white/70">
                      Help showed up on {helpRate}% of reviewed moments.
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-2 text-2xl font-semibold">
                      Shot context
                    </h4>
                    <p className="text-base leading-7 text-white/70">
                      Shot makes landed at {makeRate}% across reviewed moments.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
                Episode angles
              </div>

              <div className="space-y-3">
                <InfoPill>The shot diet is ahead of the presentation.</InfoPill>
                <InfoPill>
                  Downhill is showing up in real volume or it is not.
                </InfoPill>
                <InfoPill>
                  When help appears, the pass has to become visible.
                </InfoPill>
              </div>

              <div className="mb-3 mt-8 text-xs uppercase tracking-[0.28em] text-white/35">
                Next build
              </div>

              <div className="space-y-3">
                <InfoPill>Save review records to Supabase</InfoPill>
                <InfoPill>Generate real session summaries</InfoPill>
                <InfoPill>Replace mock review steps with detected moments</InfoPill>
              </div>
            </aside>
          </div>
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
            <div className="text-sm text-white/50">
              {taggedCount} tagged
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={undoStep}
                className="touch-manipulation rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white active:scale-[0.99]"
              >
                Undo
              </button>

              <button
                type="button"
                onClick={goNext}
                className="touch-manipulation rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white active:scale-[0.99]"
              >
                Skip
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("insights")}
                className={cn(
                  "touch-manipulation rounded-full px-4 py-3 text-sm font-medium transition active:scale-[0.99]",
                  canAdvance
                    ? "bg-lime-300 text-black"
                    : "bg-lime-300/85 text-black"
                )}
              >
                Insights
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