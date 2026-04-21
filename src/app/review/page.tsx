"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* =============================
   TYPES
============================= */

type StepId =
  | "selectPlayer"
  | "trigger"
  | "lane"
  | "defense"
  | "end"
  | "receiver"
  | "continueDecision"
  | "outcome";

type EventKind = "chain" | "branch" | "outcome" | "terminal";
type InsightTone = "good" | "neutral" | "warn";

type Player = {
  id: string;
  name: string;
};

type PossessionEvent = {
  id: string;
  timeSec: number;
  step: StepId;
  label: string;
  playerId?: string;
  nextPlayerId?: string;
  kind: EventKind;
};

type PossessionNode = {
  id: string;
  label: string;
  playerId?: string;
  timeSec: number;
  kind: EventKind;
};

type PossessionEdge = {
  id: string;
  from: string;
  to: string;
};

type SavedPossession = {
  id: string;
  events: PossessionEvent[];
  nodes: PossessionNode[];
  edges: PossessionEdge[];
  summary: string;
  startSec: number;
  endSec: number;
};

type OptionTone = "primary" | "normal" | "danger";

type Option = {
  label: string;
  value: string;
  tone?: OptionTone;
};

type SessionSignal = {
  possessions: number;
  help: number;
  noHelp: number;
  passes: number;
  finishes: number;
  shots: number;
  makes: number;
  misses: number;
  fouls: number;
  turnovers: number;
};

type PossessionInsight = {
  read: string;
  tone: InsightTone;
  why: string;
  next: string;
};

type SessionInsight = {
  pattern: string;
  focus: string;
};

type IdentityInsight = {
  label: string;
  detail: string;
};

/* =============================
   DATA
============================= */

const PLAYERS: Player[] = [
  { id: "p1", name: "Player A" },
  { id: "p2", name: "Player B" },
  { id: "p3", name: "Player C" },
  { id: "p4", name: "Player D" },
  { id: "p5", name: "Player E" },
];

/* =============================
   UTILS
============================= */

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getPlayerName(playerId?: string): string {
  if (!playerId) return "Unknown";
  return PLAYERS.find((p) => p.id === playerId)?.name ?? playerId;
}

function buttonTone(tone?: OptionTone): string {
  if (tone === "primary") {
    return "border-lime-400/40 bg-lime-400/[0.12] text-lime-100 hover:bg-lime-400/[0.18] active:bg-lime-400/[0.22]";
  }
  if (tone === "danger") {
    return "border-red-400/40 bg-red-400/[0.08] text-red-100 hover:bg-red-400/[0.14] active:bg-red-400/[0.18]";
  }
  return "border-white/8 bg-white/[0.03] text-white/90 hover:bg-white/[0.06] hover:border-white/16 active:bg-white/[0.09]";
}

function badgeTone(kind: EventKind): string {
  if (kind === "branch") return "border-lime-400/30 bg-lime-400/[0.08] text-lime-100";
  if (kind === "outcome") return "border-white/16 bg-white/[0.07] text-white";
  if (kind === "terminal") return "border-red-400/30 bg-red-400/[0.08] text-red-100";
  return "border-white/8 bg-white/[0.04] text-white/78";
}

function hasEventLabel(events: PossessionEvent[], step: StepId | null, label: string): boolean {
  return events.some((event) => (step ? event.step === step : true) && event.label === label);
}

function getFinalOutcome(events: PossessionEvent[]): string | null {
  return [...events].reverse().find((event) => event.step === "outcome")?.label ?? null;
}

function countSessionSignal(possessions: SavedPossession[]): SessionSignal {
  const flat = possessions.flatMap((possession) => possession.events);

  const count = (step: StepId | null, label: string): number =>
    flat.filter((event) => (step ? event.step === step : true) && event.label === label).length;

  return {
    possessions: possessions.length,
    help: count("defense", "Help"),
    noHelp: count("defense", "No Help"),
    passes: flat.filter((event) => event.label === "Pass").length,
    finishes: count("end", "Finish"),
    shots: count("end", "Shot"),
    makes: count("outcome", "Make"),
    misses: count("outcome", "Miss"),
    fouls: count("outcome", "Foul"),
    turnovers: flat.filter((event) => event.label === "Turnover").length,
  };
}

function buildSummary(events: PossessionEvent[]): string {
  const actor = events.find((e) => e.step === "selectPlayer")?.playerId;
  const actorName = getPlayerName(actor);
  const trigger = events.find((e) => e.step === "trigger")?.label;
  const lane = events.find((e) => e.step === "lane")?.label;
  const defense = events.find((e) => e.step === "defense")?.label;
  const end = events.find((e) => e.step === "end")?.label;
  const receiverEvents = events.filter((e) => e.step === "receiver");
  const outcome = getFinalOutcome(events);

  if (end === "Pass" && receiverEvents.length) {
    const lastReceiver = receiverEvents[receiverEvents.length - 1];
    const receiverName = getPlayerName(lastReceiver.nextPlayerId);
    return `${actorName} ${trigger ? `started on ${trigger.toLowerCase()}, ` : ""}${lane ? lane.toLowerCase() : "attacked"}${defense ? `, drew ${defense.toLowerCase()}` : ""}, passed to ${receiverName}${outcome ? `, possession ended in ${outcome.toLowerCase()}` : ""}.`;
  }

  return `${actorName} ${trigger ? `started on ${trigger.toLowerCase()}, ` : ""}${lane ? lane.toLowerCase() : "attacked"}${defense ? `, saw ${defense.toLowerCase()}` : ""}${end ? `, chose ${end.toLowerCase()}` : ""}${outcome ? `, ended in ${outcome.toLowerCase()}` : ""}.`;
}

function stepBackFromEvent(event: PossessionEvent): StepId {
  if (event.step === "selectPlayer") return "trigger";
  if (event.step === "trigger") return "lane";
  if (event.step === "lane") return "defense";
  if (event.step === "defense") return "end";
  if (event.step === "end") {
    if (event.label === "Pass") return "receiver";
    if (event.label === "Finish" || event.label === "Shot") return "outcome";
    return "end";
  }
  if (event.step === "receiver") return "continueDecision";
  if (event.step === "continueDecision") return "continueDecision";
  if (event.step === "outcome") return "outcome";
  return "selectPlayer";
}

function getPossessionInsight(possession: SavedPossession | null): PossessionInsight {
  if (!possession) {
    return {
      read: "No possession selected",
      tone: "neutral",
      why: "Pick a possession to see the read.",
      next: "Stack tagged possessions to generate signal.",
    };
  }

  const events = possession.events;
  const help = hasEventLabel(events, "defense", "Help");
  const noHelp = hasEventLabel(events, "defense", "No Help");
  const pass = hasEventLabel(events, "end", "Pass");
  const finish = hasEventLabel(events, "end", "Finish");
  const shot = hasEventLabel(events, "end", "Shot");
  const outcome = getFinalOutcome(events);
  const make = outcome === "Make";
  const miss = outcome === "Miss";
  const turnover = outcome === "Turnover";

  if (help && pass) {
    return {
      read: "Correct",
      tone: "good",
      why: "Help committed, so the pass kept the advantage alive.",
      next: "Keep forcing rotations.",
    };
  }

  if (noHelp && pass) {
    return {
      read: "Missed scoring window",
      tone: "warn",
      why: "The defense stayed home, so the scoring lane was still there.",
      next: "Finish when no help shows.",
    };
  }

  if (noHelp && finish) {
    return {
      read: "Correct",
      tone: "good",
      why: "No help showed, so the finish was there.",
      next: "Keep scoring clean windows.",
    };
  }

  if (help && finish && make) {
    return {
      read: "Tough make",
      tone: "neutral",
      why: "Help was there, but the finish still converted.",
      next: "Good score. See the spray earlier too.",
    };
  }

  if (help && finish && (miss || turnover)) {
    return {
      read: "Forced finish",
      tone: "warn",
      why: "Help loaded before the finish decision.",
      next: "Recognize the second defender sooner.",
    };
  }

  if (shot && !help) {
    return {
      read: "Shot choice",
      tone: "neutral",
      why: "The possession ended in a shot without a forced rotation.",
      next: "Pressure the defense first when possible.",
    };
  }

  if (turnover && pass) {
    return {
      read: "Bad execution",
      tone: "warn",
      why: "The read may have been right, but the pass did not get there clean.",
      next: "Keep the idea. Tighten the delivery.",
    };
  }

  if (turnover) {
    return {
      read: "Lost possession",
      tone: "warn",
      why: "The possession ended before the advantage became a score.",
      next: "Simplify the next read.",
    };
  }

  return {
    read: "Incomplete",
    tone: "neutral",
    why: "Not enough signal yet.",
    next: "Tag help, end, and outcome to sharpen the read.",
  };
}

function getSessionInsight(possessions: SavedPossession[]): SessionInsight {
  if (!possessions.length) {
    return {
      pattern: "No session pattern yet.",
      focus: "Tag a few possessions to build signal.",
    };
  }

  let noHelpPasses = 0;
  let helpPasses = 0;
  let turnovers = 0;
  let finishes = 0;

  for (const possession of possessions) {
    const events = possession.events;
    const help = hasEventLabel(events, "defense", "Help");
    const noHelp = hasEventLabel(events, "defense", "No Help");
    const pass = hasEventLabel(events, "end", "Pass");
    const finish = hasEventLabel(events, "end", "Finish");
    const outcome = getFinalOutcome(events);

    if (help && pass) helpPasses += 1;
    if (noHelp && pass) noHelpPasses += 1;
    if (finish) finishes += 1;
    if (outcome === "Turnover") turnovers += 1;
  }

  if (noHelpPasses >= 3) {
    return {
      pattern: `Passed out of ${noHelpPasses} clean windows.`,
      focus: "Score first when the defense stays home.",
    };
  }

  if (helpPasses >= 3) {
    return {
      pattern: "Recognized help and moved it on time.",
      focus: "Keep collapsing the defense first.",
    };
  }

  if (turnovers >= 2) {
    return {
      pattern: `Turnovers ended ${turnovers} possessions.`,
      focus: "Slow the decision half a beat.",
    };
  }

  if (finishes === 0 && possessions.length >= 3) {
    return {
      pattern: "No possessions finished at the rim yet.",
      focus: "Turn more advantages into scores.",
    };
  }

  return {
    pattern: "Session is still building.",
    focus: "Stack more possessions.",
  };
}

function getIdentityInsight(possessions: SavedPossession[]): IdentityInsight {
  if (!possessions.length) {
    return {
      label: "No identity yet",
      detail: "Stack possessions to reveal decision bias.",
    };
  }

  let passCount = 0;
  let finishCount = 0;
  let shotCount = 0;
  let noHelpPasses = 0;

  for (const possession of possessions) {
    const events = possession.events;
    const pass = hasEventLabel(events, "end", "Pass");
    const finish = hasEventLabel(events, "end", "Finish");
    const shot = hasEventLabel(events, "end", "Shot");
    const noHelp = hasEventLabel(events, "defense", "No Help");

    if (pass) passCount += 1;
    if (finish) finishCount += 1;
    if (shot) shotCount += 1;
    if (noHelp && pass) noHelpPasses += 1;
  }

  if (noHelpPasses >= 2) {
    return {
      label: "Pass-first bias",
      detail: "Passing even when the defense stays home.",
    };
  }

  if (finishCount >= passCount + 2) {
    return {
      label: "Score-first pressure",
      detail: "Consistently turns advantage into finishes.",
    };
  }

  if (shotCount >= finishCount + 2) {
    return {
      label: "Shot-first tendency",
      detail: "Ends possessions in shots more than rim pressure.",
    };
  }

  return {
    label: "Balanced decision profile",
    detail: "No dominant tendency yet.",
  };
}

/* =============================
   CHARTS
============================= */

function ChartBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? `${Math.max(8, (value / max) * 100)}%` : "0%";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-white/78">
        <span>{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/8">
        <div className="h-2 rounded-full bg-lime-400" style={{ width }} />
      </div>
    </div>
  );
}

function SessionCharts({ signal }: { signal: SessionSignal }) {
  const maxPrimary = Math.max(
    1,
    signal.help,
    signal.noHelp,
    signal.passes,
    signal.finishes,
    signal.shots,
    signal.turnovers,
    signal.makes,
    signal.misses,
    signal.fouls
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Decision volume</p>
        <div className="mt-4 space-y-4">
          <ChartBar label="Passes" value={signal.passes} max={maxPrimary} />
          <ChartBar label="Finishes" value={signal.finishes} max={maxPrimary} />
          <ChartBar label="Shots" value={signal.shots} max={maxPrimary} />
          <ChartBar label="Turnovers" value={signal.turnovers} max={maxPrimary} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Help pressure</p>
        <div className="mt-4 space-y-4">
          <ChartBar label="Help" value={signal.help} max={maxPrimary} />
          <ChartBar label="No Help" value={signal.noHelp} max={maxPrimary} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Outcomes</p>
        <div className="mt-4 space-y-4">
          <ChartBar label="Makes" value={signal.makes} max={maxPrimary} />
          <ChartBar label="Misses" value={signal.misses} max={maxPrimary} />
          <ChartBar label="Fouls" value={signal.fouls} max={maxPrimary} />
          <ChartBar label="Turnovers" value={signal.turnovers} max={maxPrimary} />
        </div>
      </div>
    </div>
  );
}

/* =============================
   UI
============================= */

function InsightRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: InsightTone;
}) {
  const toneClass =
    tone === "good"
      ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
      : tone === "warn"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
      : "border-white/10 bg-white/[0.04] text-white/80";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2">
      <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</span>
      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>{value}</span>
    </div>
  );
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm text-white/85">{title}</span>
        <span className="text-2xl leading-none text-white/60">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

function InsightPanel({
  selectedPossession,
  possessions,
}: {
  selectedPossession: SavedPossession | null;
  possessions: SavedPossession[];
}) {
  const possessionInsight = useMemo(() => getPossessionInsight(selectedPossession), [selectedPossession]);
  const sessionInsight = useMemo(() => getSessionInsight(possessions), [possessions]);
  const identityInsight = useMemo(() => getIdentityInsight(possessions), [possessions]);

  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Insight</p>
        <h3 className="mt-1 text-sm font-medium text-white">Coach output</h3>
      </div>

      <div className="space-y-3">
        <InsightRow label="Read" value={possessionInsight.read} tone={possessionInsight.tone} />

        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Next</p>
          <p className="mt-1 text-sm leading-5 text-white/88">{possessionInsight.next}</p>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Session pattern</p>
          <p className="mt-1 text-sm leading-5 text-white/88">{sessionInsight.pattern}</p>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Focus</p>
          <p className="mt-1 text-sm leading-5 text-white/88">{sessionInsight.focus}</p>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Identity</p>
          <p className="mt-1 text-sm text-white/88">{identityInsight.label}</p>
          <p className="mt-1 text-xs text-white/55">{identityInsight.detail}</p>
        </div>
      </div>
    </div>
  );
}

/* =============================
   PAGE
============================= */

export default function ReviewPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>("");
  const [durationSec, setDurationSec] = useState<number>(0);
  const [currentSec, setCurrentSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [step, setStep] = useState<StepId>("selectPlayer");
  const [events, setEvents] = useState<PossessionEvent[]>([]);
  const [nodes, setNodes] = useState<PossessionNode[]>([]);
  const [edges, setEdges] = useState<PossessionEdge[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  const [pendingReceiverId, setPendingReceiverId] = useState<string | null>(null);
  const [isContinuationMode, setIsContinuationMode] = useState<boolean>(false);

  const [savedPossessions, setSavedPossessions] = useState<SavedPossession[]>([]);
  const [selectedPossessionId, setSelectedPossessionId] = useState<string | null>(null);

  const [showCharts, setShowCharts] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = (): void => setDurationSec(video.duration || 0);
    const onTime = (): void => setCurrentSec(video.currentTime || 0);
    const onEnded = (): void => setIsPlaying(false);

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnded);
    };
  }, [videoUrl]);

  const selectedPossession = useMemo(() => {
    return savedPossessions.find((p) => p.id === selectedPossessionId) ?? null;
  }, [savedPossessions, selectedPossessionId]);

  const signal = useMemo(() => countSessionSignal(savedPossessions), [savedPossessions]);
  const latestPossession = savedPossessions[0] ?? null;

  const currentPlayerName = useMemo(() => {
    return PLAYERS.find((p) => p.id === currentPlayerId)?.name ?? "No player";
  }, [currentPlayerId]);

  const currentFlowText = useMemo(() => {
    if (!events.length) return "Start possession. Pick the player with the ball.";

    return events
      .map((event) => {
        if (event.step === "selectPlayer" && event.playerId) return getPlayerName(event.playerId);
        if (event.step === "receiver" && event.nextPlayerId) return `Pass → ${getPlayerName(event.nextPlayerId)}`;
        return event.label;
      })
      .join(" → ");
  }, [events]);

  const smartPrompt = useMemo(() => {
    switch (step) {
      case "selectPlayer":
        return "Who has the ball?";
      case "trigger":
        return "How did it start?";
      case "lane":
        return isContinuationMode ? "What lane did the receiver attack?" : "What lane did they attack?";
      case "defense":
        return "Did help come?";
      case "end":
        return "How did it end?";
      case "receiver":
        return "Who received the pass?";
      case "continueDecision":
        return "Keep possession live?";
      case "outcome":
        return "What was the outcome?";
      default:
        return "Next decision.";
    }
  }, [step, isContinuationMode]);

  const progressPct = durationSec > 0 ? (currentSec / durationSec) * 100 : 0;

  const options = useMemo<Option[]>(() => {
    switch (step) {
      case "selectPlayer":
        return PLAYERS.map((p) => ({
          label: p.name,
          value: p.id,
          tone: p.id === currentPlayerId ? "primary" : "normal",
        }));
      case "trigger":
        return [
          { label: "Catch", value: "Catch", tone: "primary" },
          { label: "Push", value: "Push" },
          { label: "OREB", value: "OREB" },
          { label: "Inbound", value: "Inbound" },
        ];
      case "lane":
        return [
          { label: "Left", value: "Left" },
          { label: "Middle", value: "Middle", tone: "primary" },
          { label: "Right", value: "Right" },
        ];
      case "defense":
        return [
          { label: "No Help", value: "No Help", tone: "primary" },
          { label: "Help", value: "Help" },
        ];
      case "end":
        return [
          { label: "Finish", value: "Finish", tone: "primary" },
          { label: "Pass", value: "Pass" },
          { label: "Shot", value: "Shot" },
          { label: "Turnover", value: "Turnover", tone: "danger" },
          { label: "Reset", value: "Reset" },
        ];
      case "receiver":
        return PLAYERS.filter((p) => p.id !== currentPlayerId).map((p) => ({
          label: p.name,
          value: p.id,
        }));
      case "continueDecision":
        return [
          { label: "Keep live", value: "keepLive", tone: "primary" },
          { label: "End here", value: "endHere" },
        ];
      case "outcome":
        return [
          { label: "Make", value: "Make", tone: "primary" },
          { label: "Miss", value: "Miss" },
          { label: "Foul", value: "Foul" },
          { label: "Turnover", value: "Turnover", tone: "danger" },
        ];
      default:
        return [];
    }
  }, [step, currentPlayerId]);

  function openLibraryPicker(): void {
    libraryInputRef.current?.click();
  }

  function openCameraPicker(): void {
    cameraInputRef.current?.click();
  }

  function handleUpload(file: File | null): void {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      alert("Please upload a video file.");
      return;
    }

    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });

    setVideoName(file.name);
    setDurationSec(0);
    setCurrentSec(0);
    setIsPlaying(false);
    clearCurrentPossession();
  }

  function clearCurrentPossession(): void {
    setEvents([]);
    setNodes([]);
    setEdges([]);
    setCurrentNodeId(null);
    setCurrentPlayerId(null);
    setPendingReceiverId(null);
    setIsContinuationMode(false);
    setStep("selectPlayer");
  }

  function resetAll(): void {
    clearCurrentPossession();
    setSavedPossessions([]);
    setSelectedPossessionId(null);
    setCurrentSec(0);
    setShowCharts(false);
    setShowMap(false);
  }

  function playPause(): void {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function seekTo(sec: number): void {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const safe = Math.max(0, Math.min(durationSec || 0, sec));
    video.currentTime = safe;
    setCurrentSec(safe);
  }

  function addGraphNode(label: string, kind: EventKind, playerId?: string): string {
    const node: PossessionNode = {
      id: uid(),
      label,
      kind,
      playerId,
      timeSec: currentSec,
    };

    setNodes((prev) => [...prev, node]);

    if (currentNodeId) {
      setEdges((prev) => [
        ...prev,
        {
          id: uid(),
          from: currentNodeId,
          to: node.id,
        },
      ]);
    }

    setCurrentNodeId(node.id);
    return node.id;
  }

  function addEvent(
    nextStep: StepId,
    label: string,
    kind: EventKind,
    extra?: { playerId?: string; nextPlayerId?: string }
  ): void {
    const event: PossessionEvent = {
      id: uid(),
      timeSec: currentSec,
      step,
      label,
      kind,
      playerId: extra?.playerId,
      nextPlayerId: extra?.nextPlayerId,
    };

    setEvents((prev) => [...prev, event]);
    setStep(nextStep);
  }

  function finishPossession(terminalLabel?: string): void {
    const finalEvents = [...events];
    const finalNodes = [...nodes];
    const finalEdges = [...edges];

    if (terminalLabel) {
      const terminalEvent: PossessionEvent = {
        id: uid(),
        timeSec: currentSec,
        step: "outcome",
        label: terminalLabel,
        kind: terminalLabel === "Turnover" ? "terminal" : "outcome",
        playerId: currentPlayerId ?? undefined,
      };
      finalEvents.push(terminalEvent);

      const terminalNode: PossessionNode = {
        id: uid(),
        label: terminalLabel,
        kind: terminalLabel === "Turnover" ? "terminal" : "outcome",
        playerId: currentPlayerId ?? undefined,
        timeSec: currentSec,
      };
      finalNodes.push(terminalNode);

      if (currentNodeId) {
        finalEdges.push({
          id: uid(),
          from: currentNodeId,
          to: terminalNode.id,
        });
      }
    }

    if (!finalEvents.length) return;

    const startSec = finalEvents[0]?.timeSec ?? currentSec;
    const endSec = finalEvents[finalEvents.length - 1]?.timeSec ?? currentSec;

    const saved: SavedPossession = {
      id: uid(),
      events: finalEvents,
      nodes: finalNodes,
      edges: finalEdges,
      summary: buildSummary(finalEvents),
      startSec,
      endSec,
    };

    setSavedPossessions((prev) => [saved, ...prev]);
    setSelectedPossessionId(saved.id);
    clearCurrentPossession();
  }

  function continueFromPendingReceiver(): void {
    if (!pendingReceiverId) return;

    setCurrentPlayerId(pendingReceiverId);
    setPendingReceiverId(null);
    setIsContinuationMode(true);
    setStep("lane");
  }

  function endOnPendingPass(): void {
    setPendingReceiverId(null);
    setIsContinuationMode(false);
    setStep("outcome");
  }

  function handleOptionClick(value: string): void {
    if (!videoUrl) return;

    if (step === "selectPlayer") {
      const player = PLAYERS.find((p) => p.id === value);
      if (!player) return;

      setCurrentPlayerId(player.id);
      addGraphNode(player.name, "chain", player.id);
      addEvent("trigger", player.name, "chain", { playerId: player.id });
      return;
    }

    if (step === "trigger") {
      addGraphNode(value, "chain", currentPlayerId ?? undefined);
      addEvent("lane", value, "chain", { playerId: currentPlayerId ?? undefined });
      return;
    }

    if (step === "lane") {
      addGraphNode(value, "chain", currentPlayerId ?? undefined);
      addEvent("defense", value, "chain", { playerId: currentPlayerId ?? undefined });
      return;
    }

    if (step === "defense") {
      addGraphNode(value, "chain", currentPlayerId ?? undefined);
      addEvent("end", value, "chain", { playerId: currentPlayerId ?? undefined });
      return;
    }

    if (step === "end") {
      if (value === "Turnover") {
        addGraphNode(value, "terminal", currentPlayerId ?? undefined);
        finishPossession("Turnover");
        return;
      }

      if (value === "Reset") {
        addGraphNode(value, "outcome", currentPlayerId ?? undefined);
        finishPossession("Reset");
        return;
      }

      addGraphNode(value, value === "Pass" ? "branch" : "chain", currentPlayerId ?? undefined);

      if (value === "Pass") {
        addEvent("receiver", value, "branch", { playerId: currentPlayerId ?? undefined });
        return;
      }

      addEvent("outcome", value, "chain", { playerId: currentPlayerId ?? undefined });
      return;
    }

    if (step === "receiver") {
      const player = PLAYERS.find((p) => p.id === value);
      if (!player) return;

      addGraphNode(player.name, "branch", player.id);
      setPendingReceiverId(player.id);
      addEvent("continueDecision", `Pass → ${player.name}`, "branch", {
        playerId: currentPlayerId ?? undefined,
        nextPlayerId: player.id,
      });
      return;
    }

    if (step === "continueDecision") {
      if (value === "keepLive") {
        continueFromPendingReceiver();
        return;
      }

      if (value === "endHere") {
        endOnPendingPass();
        return;
      }
    }

    if (step === "outcome") {
      finishPossession(value);
    }
  }

  function undoLast(): void {
    if (!events.length) return;

    const nextEvents = events.slice(0, -1);
    setEvents(nextEvents);

    if (!nextEvents.length) {
      setNodes([]);
      setEdges([]);
      setCurrentNodeId(null);
      setCurrentPlayerId(null);
      setPendingReceiverId(null);
      setIsContinuationMode(false);
      setStep("selectPlayer");
      return;
    }

    const rebuiltNodes: PossessionNode[] = [];
    const rebuiltEdges: PossessionEdge[] = [];
    let prevNodeId: string | null = null;
    let rebuiltPlayerId: string | null = null;
    let rebuiltPendingReceiverId: string | null = null;
    let rebuiltContinuationMode = false;

    for (const event of nextEvents) {
      let label = event.label;
      let nodePlayerId = event.playerId;

      if (event.step === "receiver" && event.nextPlayerId) {
        label = getPlayerName(event.nextPlayerId);
        nodePlayerId = event.nextPlayerId;
        rebuiltPendingReceiverId = event.nextPlayerId;
      }

      if (event.step === "selectPlayer" && event.playerId) {
        rebuiltPlayerId = event.playerId;
      }

      if (event.step === "lane" && event.playerId) {
        rebuiltPlayerId = event.playerId;
      }

      if (event.step === "continueDecision" && event.label === "Keep live" && event.nextPlayerId) {
        rebuiltPlayerId = event.nextPlayerId;
        rebuiltContinuationMode = true;
        rebuiltPendingReceiverId = null;
      }

      const node: PossessionNode = {
        id: uid(),
        label,
        playerId: nodePlayerId,
        timeSec: event.timeSec,
        kind: event.kind,
      };

      rebuiltNodes.push(node);

      if (prevNodeId) {
        rebuiltEdges.push({
          id: uid(),
          from: prevNodeId,
          to: node.id,
        });
      }

      prevNodeId = node.id;
    }

    setNodes(rebuiltNodes);
    setEdges(rebuiltEdges);
    setCurrentNodeId(prevNodeId);
    setCurrentPlayerId(rebuiltPlayerId);
    setPendingReceiverId(rebuiltPendingReceiverId);
    setIsContinuationMode(rebuiltContinuationMode);

    const last = nextEvents[nextEvents.length - 1];
    setStep(stepBackFromEvent(last));
  }

  function exportSession(): void {
    const payload = {
      videoName,
      savedPossessions,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "axis-capture-continuation.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onVideoTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  }

  function onVideoTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    if (startX == null || startY == null) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        seekTo(currentSec + 2);
      } else {
        seekTo(currentSec - 2);
      }
      return;
    }

    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) && dy < 0) {
      undoLast();
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <input
        ref={libraryInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
        <header className="flex flex-col gap-3 border-b border-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Axis</p>
            <h1 className="text-lg font-semibold tracking-tight">Capture V3</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openCameraPicker}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:border-white/20"
            >
              Record
            </button>
            <button
              onClick={openLibraryPicker}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:border-white/20"
            >
              Library
            </button>
            <button
              onClick={exportSession}
              disabled={!savedPossessions.length}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:border-white/20 disabled:opacity-40"
            >
              Export
            </button>
            <button
              onClick={resetAll}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:border-white/20"
            >
              Reset
            </button>
          </div>
        </header>

        {!videoUrl ? (
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-8 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-lime-400">Capture</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Tag faster.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60">
              Open the camera or pick from library. Then tag the possession with a compressed flow:
              player, start, lane, help, end.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={openCameraPicker}
                className="rounded-2xl bg-lime-400 px-6 py-4 text-base font-medium text-black transition hover:opacity-90"
              >
                Record Video
              </button>
              <button
                onClick={openLibraryPicker}
                className="rounded-2xl border border-white/10 px-6 py-4 text-base font-medium text-white transition hover:border-white/20"
              >
                Choose From Library
              </button>
            </div>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03]">
              <div
                className="bg-black"
                onTouchStart={onVideoTouchStart}
                onTouchEnd={onVideoTouchEnd}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls={false}
                  playsInline
                  className="h-[220px] w-full bg-black object-contain sm:h-[280px] md:h-[340px]"
                />
              </div>

              <div className="space-y-4 border-t border-white/8 px-4 py-4">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{formatTime(currentSec)}</span>
                  <span>{formatTime(durationSec)}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={durationSec || 0}
                  step={0.01}
                  value={currentSec}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
                />

                <div className="h-1.5 w-full rounded-full bg-white/5">
                  <div className="h-1.5 rounded-full bg-white" style={{ width: `${progressPct}%` }} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={playPause}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm transition hover:border-white/20"
                  >
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    onClick={() => seekTo(currentSec - 2)}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm transition hover:border-white/20"
                  >
                    -2s
                  </button>
                  <button
                    onClick={() => seekTo(currentSec + 2)}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm transition hover:border-white/20"
                  >
                    +2s
                  </button>
                  <button
                    onClick={undoLast}
                    disabled={!events.length}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm transition hover:border-white/20 disabled:opacity-40"
                  >
                    Undo
                  </button>
                  <button
                    onClick={() => finishPossession()}
                    disabled={!events.length}
                    className="rounded-xl bg-lime-400 px-4 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-40"
                  >
                    Finish
                  </button>

                  <div className="ml-auto text-[10px] uppercase tracking-[0.22em] text-white/35">
                    {videoName}
                  </div>
                </div>

                <div className="text-[11px] text-white/40">
                  Swipe on video: left/right = seek 2s, up = undo
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Prompt</p>
              <p className="mt-3 text-3xl font-medium tracking-tight">{smartPrompt}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleOptionClick(option.value)}
                    className={`rounded-2xl border px-4 py-5 text-left text-lg transition ${buttonTone(
                      option.tone
                    )}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Current chain</p>
              <div className="mt-3 min-h-[56px]">
                {events.length ? (
                  <div className="flex flex-wrap gap-2">
                    {events.map((event) => (
                      <span
                        key={event.id}
                        className={`rounded-full border px-3 py-1.5 text-sm ${badgeTone(event.kind)}`}
                      >
                        {event.step === "receiver" && event.nextPlayerId
                          ? `Pass → ${getPlayerName(event.nextPlayerId)}`
                          : event.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/45">{currentFlowText}</p>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Active player</p>
                  <p className="mt-1 text-sm text-white/90">{currentPlayerName}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Step</p>
                  <p className="mt-1 text-sm text-white/90">{step}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Mode</p>
                  <p className="mt-1 text-sm text-white/90">{isContinuationMode ? "Live continuation" : "Primary chain"}</p>
                </div>
              </div>
            </section>

            {latestPossession ? (
              <section className="rounded-3xl border border-lime-400/40 bg-lime-400/[0.08] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/55">Last possession</p>
                <p className="mt-3 text-lg text-white/92">{latestPossession.summary}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/68">
                  <span>
                    Outcome: <span className="text-white">{getFinalOutcome(latestPossession.events) ?? "Open"}</span>
                  </span>
                  <span>
                    Tags: <span className="text-white">{latestPossession.nodes.length}</span>
                  </span>
                </div>
              </section>
            ) : null}

            <InsightPanel
              selectedPossession={selectedPossession ?? latestPossession}
              possessions={savedPossessions}
            />

            <CollapsibleSection
              title="Session chart"
              isOpen={showCharts}
              onToggle={() => setShowCharts((v) => !v)}
            >
              <SessionCharts signal={signal} />
            </CollapsibleSection>

            <CollapsibleSection
              title="Possession map"
              isOpen={showMap}
              onToggle={() => setShowMap((v) => !v)}
            >
              {selectedPossession ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3 text-sm text-white/85">
                    {selectedPossession.summary}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                      Start: <span className="text-white">{formatTime(selectedPossession.startSec)}</span>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                      End: <span className="text-white">{formatTime(selectedPossession.endSec)}</span>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                      Tags: <span className="text-white">{selectedPossession.nodes.length}</span>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                      Links: <span className="text-white">{selectedPossession.edges.length}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                    <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-white/35">Decision path</p>

                    <div className="flex flex-wrap gap-2">
                      {selectedPossession.events.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => seekTo(event.timeSec)}
                          className={`rounded-full border px-2.5 py-1 text-xs transition hover:border-white/20 ${badgeTone(
                            event.kind
                          )}`}
                        >
                          {event.step === "receiver" && event.nextPlayerId
                            ? `Pass → ${getPlayerName(event.nextPlayerId)}`
                            : event.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-white/35">Pick a saved possession to inspect the map.</div>
              )}
            </CollapsibleSection>

            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Possession cards</p>
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">{savedPossessions.length} saved</p>
              </div>

              {savedPossessions.length ? (
                <div className="grid gap-3">
                  {savedPossessions.map((possession, index) => {
                    const finalOutcome = getFinalOutcome(possession.events) ?? "Open";

                    return (
                      <button
                        key={possession.id}
                        onClick={() => {
                          setSelectedPossessionId(possession.id);
                          seekTo(possession.startSec);
                        }}
                        className={`rounded-2xl border p-4 text-left transition hover:border-white/18 ${
                          selectedPossessionId === possession.id
                            ? "border-lime-400/40 bg-lime-400/[0.08]"
                            : "border-white/8 bg-black/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                              Possession {savedPossessions.length - index}
                            </p>
                            <p className="mt-2 text-sm text-white/88">{possession.summary}</p>
                          </div>

                          <div className="text-right text-[11px] text-white/35">
                            <div>{formatTime(possession.startSec)}</div>
                            <div className="mt-1">{formatTime(possession.endSec)}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {possession.events.slice(0, 8).map((event) => (
                            <span
                              key={event.id}
                              className={`rounded-full border px-2.5 py-1 text-xs ${badgeTone(event.kind)}`}
                            >
                              {event.step === "receiver" && event.nextPlayerId
                                ? `Pass → ${getPlayerName(event.nextPlayerId)}`
                                : event.label}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Outcome</div>
                            <div className="mt-1 text-sm text-white/90">{finalOutcome}</div>
                          </div>

                          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Tags</div>
                            <div className="mt-1 text-sm text-white/90">{possession.nodes.length}</div>
                          </div>

                          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Links</div>
                            <div className="mt-1 text-sm text-white/90">{possession.edges.length}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-white/35">No completed possessions yet.</div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}