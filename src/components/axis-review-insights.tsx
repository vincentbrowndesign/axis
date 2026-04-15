"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Check,
  RotateCcw,
  SkipForward,
  Upload,
} from "lucide-react";
import VideoPlayer from "./video-player";

type Action = "drive" | "pass" | "shot";
type Zone = "rim" | "paint" | "mid" | "three" | "corner";
type Outcome = "make" | "miss";

type ReviewEvent = {
  id: string;
  timeMs: number;
  action: Action;
  zone: Zone;
  clipLabel: string;
  downhill?: boolean;
  help?: boolean;
  outcome?: Outcome;
};

const seedEvents: ReviewEvent[] = [
  { id: "1", timeMs: 18234, action: "drive", zone: "paint", clipLabel: "0:18" },
  { id: "2", timeMs: 25120, action: "pass", zone: "corner", clipLabel: "0:25" },
  { id: "3", timeMs: 33840, action: "shot", zone: "three", clipLabel: "0:33" },
  { id: "4", timeMs: 45110, action: "drive", zone: "rim", clipLabel: "0:45" },
  { id: "5", timeMs: 55210, action: "shot", zone: "corner", clipLabel: "0:55" },
  { id: "6", timeMs: 63380, action: "pass", zone: "paint", clipLabel: "1:03" },
  { id: "7", timeMs: 71950, action: "shot", zone: "mid", clipLabel: "1:11" },
  { id: "8", timeMs: 82140, action: "drive", zone: "paint", clipLabel: "1:22" },
];

const actionLabel: Record<Action, string> = {
  drive: "Drive",
  pass: "Pass",
  shot: "Shot",
};

const zoneLabel: Record<Zone, string> = {
  rim: "Rim",
  paint: "Paint",
  mid: "Mid",
  three: "3PT",
  corner: "Corner",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TopPill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cx(
        "inline-flex h-11 items-center justify-center rounded-full px-4 text-sm transition-all",
        active
          ? "bg-white text-black"
          : "bg-white/6 text-white/72 hover:bg-white/10"
      )}
    >
      {children}
    </Comp>
  );
}

function DataChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex h-8 items-center rounded-full border border-white/10 bg-black/35 px-3 text-[11px] font-medium tracking-[0.12em] text-white/70 uppercase">
      {children}
    </div>
  );
}

function TagPad({
  active,
  onClick,
  children,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "lime";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "relative h-[64px] w-full overflow-hidden rounded-[20px] text-left transition-all duration-150 md:h-[72px] md:rounded-[22px]",
        "focus:outline-none focus:ring-2 focus:ring-lime-300/40",
        active
          ? tone === "lime"
            ? "bg-lime-300 text-black"
            : "bg-white text-black"
          : "bg-white/[0.045] text-white hover:bg-white/[0.085]"
      )}
    >
      <div className="flex h-full items-center justify-between px-4 md:px-5">
        <span className="text-[16px] font-semibold md:text-[17px]">{children}</span>
        <div
          className={cx(
            "h-2.5 w-2.5 rounded-full",
            active ? "bg-black" : "bg-white/18"
          )}
        />
      </div>
    </button>
  );
}

function ProgressRail({ value }: { value: number }) {
  return (
    <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-lime-300 transition-all duration-200"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-end justify-between border-b border-white/8 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/38">
        {label}
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function EvidenceCard({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  return (
    <div className="rounded-[22px] bg-white/[0.04] p-3">
      <div className="aspect-video rounded-[18px] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),rgba(0,0,0,0.38))]" />
      <div className="mt-3 text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-xs leading-5 text-white/48">{sub}</div>
    </div>
  );
}

function HalfCourtMap() {
  return (
    <div className="relative mx-auto aspect-[0.82] w-full max-w-[280px] overflow-hidden rounded-[32px] bg-[#080808]">
      <div className="absolute inset-0 border border-white/8" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/12" />
      <div className="absolute left-1/2 top-0 h-[18%] w-[36%] -translate-x-1/2 rounded-b-[28px] border-x border-b border-white/10" />
      <div className="absolute left-1/2 top-[8%] h-[12%] w-[12%] -translate-x-1/2 rounded-full border border-white/10" />
      <div className="absolute left-1/2 top-[14%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/18" />
      <div className="absolute left-1/2 top-[2.5%] h-[6%] w-[18%] -translate-x-1/2 rounded-b-[18px] border-x border-b border-white/10" />
      <div className="absolute left-1/2 top-[28%] h-[54%] w-[78%] -translate-x-1/2 rounded-t-[999px] border border-white/10" />
      <div className="absolute left-[8%] top-[74%] h-px w-[14%] bg-white/12" />
      <div className="absolute right-[8%] top-[74%] h-px w-[14%] bg-white/12" />
      <div className="absolute left-[10%] top-[14%] h-px w-[14%] bg-white/12" />
      <div className="absolute right-[10%] top-[14%] h-px w-[14%] bg-white/12" />

      <div className="absolute left-1/2 top-[16%] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-lime-300 shadow-[0_0_24px_rgba(185,255,69,0.68)]" />
      <div className="absolute left-[20%] top-[63%] h-3 w-3 rounded-full bg-white/92" />
      <div className="absolute right-[18%] top-[63%] h-3 w-3 rounded-full bg-white/82" />
      <div className="absolute left-[30%] top-[47%] h-3 w-3 rounded-full bg-white/58" />
      <div className="absolute right-[30%] top-[45%] h-3 w-3 rounded-full bg-white/58" />
      <div className="absolute left-[10%] top-[76%] h-3 w-3 rounded-full bg-white/58" />
      <div className="absolute right-[10%] top-[76%] h-3 w-3 rounded-full bg-white/58" />
    </div>
  );
}

export default function AxisReviewInsights() {
  const [screen, setScreen] = useState<"review" | "insights">("review");
  const [events, setEvents] = useState<ReviewEvent[]>(seedEvents);
  const [index, setIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>("");

  const current = events[index];

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const reviewedCount = useMemo(() => {
    return events.filter((event) => {
      const base =
        typeof event.downhill === "boolean" &&
        typeof event.help === "boolean";

      if (event.action === "shot") return base && !!event.outcome;
      return base;
    }).length;
  }, [events]);

  const reviewed = useMemo(() => {
    return events.filter(
      (event) =>
        typeof event.downhill === "boolean" &&
        typeof event.help === "boolean"
    );
  }, [events]);

  const progress = Math.round((reviewedCount / events.length) * 100);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (videoUrl) URL.revokeObjectURL(videoUrl);

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoName(file.name);
  }

  function updateCurrent(patch: Partial<ReviewEvent>) {
    setEvents((prev) =>
      prev.map((event, i) => (i === index ? { ...event, ...patch } : event))
    );
  }

  function advanceIfComplete(nextPatch: Partial<ReviewEvent>) {
    const nextEvent = { ...current, ...nextPatch };

    const ready =
      typeof nextEvent.downhill === "boolean" &&
      typeof nextEvent.help === "boolean" &&
      (nextEvent.action !== "shot" || !!nextEvent.outcome);

    if (!ready) return;

    window.setTimeout(() => {
      if (index < events.length - 1) {
        setIndex((prev) => prev + 1);
      } else {
        setScreen("insights");
      }
    }, 160);
  }

  function chooseDownhill(value: boolean) {
    const patch = { downhill: value };
    updateCurrent(patch);
    advanceIfComplete(patch);
  }

  function chooseHelp(value: boolean) {
    const patch = { help: value };
    updateCurrent(patch);
    advanceIfComplete(patch);
  }

  function chooseOutcome(value: Outcome) {
    const patch = { outcome: value };
    updateCurrent(patch);
    advanceIfComplete(patch);
  }

  function undoCurrent() {
    setEvents((prev) =>
      prev.map((event, i) =>
        i === index
          ? { ...event, downhill: undefined, help: undefined, outcome: undefined }
          : event
      )
    );
  }

  function skipCurrent() {
    if (index < events.length - 1) {
      setIndex((prev) => prev + 1);
    } else {
      setScreen("insights");
    }
  }

  const shots = reviewed.filter((event) => event.action === "shot");

  const downhillRate = reviewed.length
    ? Math.round(
        (reviewed.filter((event) => event.downhill).length / reviewed.length) *
          100
      )
    : 0;

  const helpRate = reviewed.length
    ? Math.round(
        (reviewed.filter((event) => event.help).length / reviewed.length) *
          100
      )
    : 0;

  const makeRate = shots.length
    ? Math.round(
        (shots.filter((event) => event.outcome === "make").length / shots.length) *
          100
      )
    : 0;

  const shotsWithoutDownhill = shots.filter(
    (event) => event.downhill === false
  ).length;

  const passesAfterHelp = reviewed.filter(
    (event) => event.action === "pass" && event.help
  ).length;

  const insightSentence =
    shots.length > 0
      ? `Most shots came ${
          shotsWithoutDownhill > shots.length / 2 ? "without" : "with"
        } downhill pressure before the attempt.`
      : "Review more shot moments to generate shot context.";

  const episodeAngles = [
    "The shot diet is ahead of the pressure creation.",
    "Downhill is not showing up often enough before the shot.",
    "When help appears, the pass is available more than the finish.",
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/32">
              Axis
            </div>
            <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-white sm:text-[34px]">
              Review + Insights
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start">
            <TopPill active={screen === "review"} onClick={() => setScreen("review")}>
              Review
            </TopPill>
            <TopPill active={screen === "insights"} onClick={() => setScreen("insights")}>
              Insights
            </TopPill>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {screen === "review" ? (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-white/74 hover:bg-white/[0.08]">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="text-sm font-medium text-white/60">
                    {Math.min(index + 1, events.length)} / {events.length}
                  </div>
                </div>

                <ProgressRail value={progress} />

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-lime-300 px-5 text-sm font-semibold text-black">
                    <Upload className="h-4 w-4" />
                    {videoUrl ? "Change video" : "Upload video"}
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="max-w-full truncate text-sm text-white/45">
                    {videoName || "No video selected"}
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-[28px] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-[1px] md:rounded-[34px]">
                  <div className="relative overflow-hidden rounded-[27px] bg-[#0b0b0b] md:rounded-[33px]">
                    {!videoUrl ? (
                      <div className="flex aspect-video w-full items-center justify-center rounded-[27px] border border-dashed border-white/12 text-white/45 md:rounded-[33px]">
                        <div className="flex flex-col items-center gap-3 px-6 text-center">
                          <div className="text-sm">
                            Use the upload button above to add a game clip
                          </div>
                        </div>
                      </div>
                    ) : (
                      <VideoPlayer url={videoUrl} />
                    )}

                    <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-2 md:bottom-5 md:left-5">
                      <DataChip>{actionLabel[current.action]}</DataChip>
                      <DataChip>{zoneLabel[current.zone]}</DataChip>
                    </div>

                    <div className="pointer-events-none absolute bottom-4 right-4 md:bottom-5 md:right-5">
                      <div className="inline-flex h-9 items-center rounded-full bg-black/50 px-3 text-xs font-medium text-white/78">
                        {current.clipLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/32">
                    Moment
                  </div>
                  <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[22px] font-semibold tracking-[-0.04em] text-white sm:text-[28px]">
                      {actionLabel[current.action]} · {zoneLabel[current.zone]}
                    </div>
                    <div className="self-start rounded-full bg-white/[0.05] px-3 py-1 text-xs text-white/55">
                      {reviewedCount} tagged
                    </div>
                  </div>

                  <div className="space-y-7">
                    <div>
                      <div className="mb-2 text-[20px] font-semibold tracking-[-0.03em] sm:text-[22px]">
                        Downhill
                      </div>
                      <div className="mb-4 text-sm text-white/42">
                        Did he beat the first defender?
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <TagPad
                          active={current.downhill === true}
                          onClick={() => chooseDownhill(true)}
                          tone="lime"
                        >
                          Yes
                        </TagPad>
                        <TagPad
                          active={current.downhill === false}
                          onClick={() => chooseDownhill(false)}
                        >
                          No
                        </TagPad>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-[20px] font-semibold tracking-[-0.03em] sm:text-[22px]">
                        Help
                      </div>
                      <div className="mb-4 text-sm text-white/42">
                        Did the defense send help?
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <TagPad
                          active={current.help === true}
                          onClick={() => chooseHelp(true)}
                          tone="lime"
                        >
                          Help
                        </TagPad>
                        <TagPad
                          active={current.help === false}
                          onClick={() => chooseHelp(false)}
                        >
                          No Help
                        </TagPad>
                      </div>
                    </div>

                    {current.action === "shot" && (
                      <div>
                        <div className="mb-2 text-[20px] font-semibold tracking-[-0.03em] sm:text-[22px]">
                          Outcome
                        </div>
                        <div className="mb-4 text-sm text-white/42">
                          What happened on the shot?
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <TagPad
                            active={current.outcome === "make"}
                            onClick={() => chooseOutcome("make")}
                            tone="lime"
                          >
                            Make
                          </TagPad>
                          <TagPad
                            active={current.outcome === "miss"}
                            onClick={() => chooseOutcome("miss")}
                          >
                            Miss
                          </TagPad>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/32">
                    Flow
                  </div>
                  <div className="text-[22px] font-semibold tracking-[-0.04em] text-white sm:text-[24px]">
                    Review one moment at a time
                  </div>
                  <div className="mt-3 max-w-[34ch] text-sm leading-7 text-white/48">
                    Tap downhill. Tap help. Add outcome if it is a shot. Then it
                    moves forward automatically.
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/32">
                    Data shape
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-[22px] bg-white/[0.04] px-4 py-4 text-sm text-white/72">
                      Live event = action + zone + time
                    </div>
                    <div className="rounded-[22px] bg-white/[0.04] px-4 py-4 text-sm text-white/72">
                      Review = downhill + help + outcome
                    </div>
                    <div className="rounded-[22px] bg-white/[0.04] px-4 py-4 text-sm text-white/72">
                      Insight = generated later, never hand-entered
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/32">
                    Controls
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={undoCurrent}
                      className="inline-flex h-12 items-center gap-2 rounded-full bg-white/[0.05] px-5 text-sm text-white/74 hover:bg-white/[0.08]"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Undo
                    </button>

                    <button
                      onClick={skipCurrent}
                      className="inline-flex h-12 items-center gap-2 rounded-full bg-white/[0.05] px-5 text-sm text-white/74 hover:bg-white/[0.08]"
                    >
                      <SkipForward className="h-4 w-4" />
                      Skip
                    </button>

                    <button
                      onClick={() => setScreen("insights")}
                      className="inline-flex h-12 items-center gap-2 rounded-full bg-lime-300 px-5 text-sm font-semibold text-black"
                    >
                      <BarChart3 className="h-4 w-4" />
                      View insights
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid gap-10 xl:grid-cols-[1.08fr_0.92fr]"
            >
              <div>
                <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/32">
                  Session read
                </div>
                <div className="max-w-[16ch] text-[30px] font-semibold leading-[0.98] tracking-[-0.06em] text-white sm:text-[42px]">
                  The session starts to explain itself.
                </div>
                <div className="mt-5 max-w-[56ch] text-base leading-8 text-white/48">
                  {insightSentence}
                </div>

                <div className="mt-10 grid gap-1">
                  <StatLine label="Reviewed moments" value={`${reviewedCount}`} />
                  <StatLine label="Downhill rate" value={`${downhillRate}%`} />
                  <StatLine label="Help drawn" value={`${helpRate}%`} />
                  <StatLine label="Shot makes" value={`${makeRate}%`} />
                </div>

                <div className="mt-10 grid gap-8 lg:grid-cols-[300px_1fr]">
                  <HalfCourtMap />

                  <div className="space-y-5">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/32">
                        Pattern read
                      </div>
                      <div className="mt-3 space-y-4">
                        <div className="text-lg font-semibold tracking-[-0.03em] text-white">
                          What created pressure
                        </div>
                        <div className="text-sm leading-7 text-white/48">
                          Downhill showed up on {downhillRate}% of reviewed moments.
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/8 pt-5">
                      <div className="text-lg font-semibold tracking-[-0.03em] text-white">
                        What happened when help came
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/48">
                        {passesAfterHelp} reviewed passes happened after help rotation.
                      </div>
                    </div>

                    <div className="border-t border-white/8 pt-5">
                      <div className="text-lg font-semibold tracking-[-0.03em] text-white">
                        Shot context
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/48">
                        {shotsWithoutDownhill} shot moments came without downhill before the attempt.
                      </div>
                    </div>

                    <div className="border-t border-white/8 pt-5">
                      <div className="text-lg font-semibold tracking-[-0.03em] text-white">
                        Dataset value
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/48">
                        This session now contains live events, review annotations,
                        and reusable insight objects.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12">
                  <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/32">
                    Evidence
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {events.slice(0, 3).map((event) => (
                      <EvidenceCard
                        key={event.id}
                        title={`${actionLabel[event.action]} · ${zoneLabel[event.zone]}`}
                        sub={`${
                          typeof event.downhill === "boolean"
                            ? event.downhill
                              ? "Downhill"
                              : "No downhill"
                            : "Awaiting review"
                        } · ${
                          typeof event.help === "boolean"
                            ? event.help
                              ? "Help"
                              : "No help"
                            : "Awaiting review"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <div className="rounded-[30px] bg-white/[0.04] p-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-lime-300/12 px-3 py-1 text-xs font-medium text-lime-200">
                    <Check className="h-3.5 w-3.5" />
                    What makes this different
                  </div>

                  <div className="mt-5 text-[24px] font-semibold leading-[1.05] tracking-[-0.05em] text-white sm:text-[28px]">
                    The app is not the company. The company is the cleaned decision data.
                  </div>

                  <div className="mt-5 space-y-3 text-sm leading-7 text-white/48">
                    <p>Live capture gives you action, zone, and time.</p>
                    <p>Review adds downhill, help, and outcome.</p>
                    <p>
                      Insights turn those records into coaching language,
                      reporting, and future model features.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/32">
                    Episode angles
                  </div>
                  <div className="space-y-3">
                    {episodeAngles.map((angle) => (
                      <div
                        key={angle}
                        className="rounded-[22px] bg-white/[0.04] px-5 py-4 text-sm leading-7 text-white/76"
                      >
                        {angle}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/32">
                    Next build
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-[22px] bg-white/[0.04] px-5 py-4 text-sm text-white/68">
                      Replace the fake video panel with real uploaded clips
                    </div>
                    <div className="rounded-[22px] bg-white/[0.04] px-5 py-4 text-sm text-white/68">
                      Save review records to Supabase
                    </div>
                    <div className="rounded-[22px] bg-white/[0.04] px-5 py-4 text-sm text-white/68">
                      Generate real session summaries from stored events
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}