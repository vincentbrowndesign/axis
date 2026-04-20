"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* =============================
   TYPES
============================= */

type StepId =
  | "selectPlayer"
  | "trigger"
  | "action"
  | "location"
  | "defense"
  | "decision"
  | "receiver"
  | "outcome";

type EventKind = "chain" | "branch" | "outcome" | "terminal";

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

type PlayerColumn = {
  playerId: string;
  playerName: string;
  events: PossessionEvent[];
};

type SessionSignal = {
  possessions: number;
  downhill: number;
  shots: number;
  help: number;
  noHelp: number;
  passes: number;
  finishes: number;
  makes: number;
  misses: number;
  fouls: number;
  turnovers: number;
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
  return PLAYERS.find((p: Player) => p.id === playerId)?.name ?? playerId;
}

function buttonTone(tone?: OptionTone): string {
  if (tone === "primary") {
    return "border-lime-400/40 bg-lime-400/[0.12] text-lime-100 hover:bg-lime-400/[0.18]";
  }
  if (tone === "danger") {
    return "border-red-400/40 bg-red-400/[0.08] text-red-100 hover:bg-red-400/[0.14]";
  }
  return "border-white/8 bg-white/[0.03] text-white/90 hover:bg-white/[0.06] hover:border-white/16";
}

function badgeTone(kind: EventKind): string {
  if (kind === "branch") return "border-lime-400/30 bg-lime-400/[0.08] text-lime-100";
  if (kind === "outcome") return "border-white/16 bg-white/[0.07] text-white";
  if (kind === "terminal") return "border-red-400/30 bg-red-400/[0.08] text-red-100";
  return "border-white/8 bg-white/[0.04] text-white/78";
}

function buildSummary(events: PossessionEvent[], players: Player[]): string {
  const byId = new Map<string, string>(players.map((p: Player) => [p.id, p.name]));
  const actor = events.find((e: PossessionEvent) => e.step === "selectPlayer")?.playerId;
  const actorName = actor ? byId.get(actor) ?? "Unknown" : "Unknown";
  const trigger = events.find((e: PossessionEvent) => e.step === "trigger")?.label;
  const action = events.find((e: PossessionEvent) => e.step === "action")?.label;
  const location = events.find((e: PossessionEvent) => e.step === "location")?.label;
  const defense = events.find((e: PossessionEvent) => e.step === "defense")?.label;
  const decision = events.find((e: PossessionEvent) => e.step === "decision")?.label;
  const receiverEvent = events.find((e: PossessionEvent) => e.step === "receiver");
  const outcome = [...events]
    .reverse()
    .find((e: PossessionEvent) => e.step === "outcome")?.label;

  if (decision === "Pass" && receiverEvent?.nextPlayerId) {
    const receiverName = byId.get(receiverEvent.nextPlayerId) ?? "Receiver";
    return `${actorName} ${trigger ? `started on ${trigger.toLowerCase()}, ` : ""}${
      action ? action.toLowerCase() : "acted"
    }${location ? ` ${location.toLowerCase()}` : ""}${
      defense ? `, drew ${defense.toLowerCase()}` : ""
    }, passed to ${receiverName}${
      outcome ? `, possession ended in ${outcome.toLowerCase()}` : ""
    }.`;
  }

  return `${actorName} ${trigger ? `started on ${trigger.toLowerCase()}, ` : ""}${
    action ? action.toLowerCase() : "acted"
  }${location ? ` ${location.toLowerCase()}` : ""}${
    defense ? `, saw ${defense.toLowerCase()}` : ""
  }${decision ? `, chose ${decision.toLowerCase()}` : ""}${
    outcome ? `, ended in ${outcome.toLowerCase()}` : ""
  }.`;
}

function countSessionSignal(possessions: SavedPossession[]): SessionSignal {
  const flat: PossessionEvent[] = possessions.flatMap(
    (possession: SavedPossession) => possession.events
  );

  const count = (step: StepId | null, label: string): number =>
    flat.filter(
      (event: PossessionEvent) =>
        (step ? event.step === step : true) && event.label === label
    ).length;

  return {
    possessions: possessions.length,
    downhill: count("action", "Downhill"),
    shots: count("action", "Shot"),
    help: count("defense", "Help"),
    noHelp: count("defense", "No Help"),
    passes: flat.filter((event: PossessionEvent) => event.label === "Pass").length,
    finishes: count("decision", "Finish"),
    makes: count("outcome", "Make"),
    misses: count("outcome", "Miss"),
    fouls: count("outcome", "Foul"),
    turnovers: flat.filter((event: PossessionEvent) => event.label === "Turnover").length,
  };
}

function stepBackFromEvent(event: PossessionEvent): StepId {
  if (event.step === "selectPlayer") return "trigger";
  if (event.step === "trigger") return "action";
  if (event.step === "action") {
    if (event.label === "Downhill") return "location";
    if (event.label === "Shot") return "outcome";
    if (event.label === "Pass") return "receiver";
    return "action";
  }
  if (event.step === "location") return "defense";
  if (event.step === "defense") return "decision";
  if (event.step === "decision") {
    if (event.label === "Pass") return "receiver";
    if (event.label === "Finish") return "outcome";
    return "decision";
  }
  if (event.step === "receiver") return "action";
  if (event.step === "outcome") return "outcome";
  return "selectPlayer";
}

/* =============================
   MAP V3
============================= */

function buildPlayerColumns(possession: SavedPossession): PlayerColumn[] {
  const columns: PlayerColumn[] = [];
  const byPlayer = new Map<string, PlayerColumn>();

  possession.events.forEach((event: PossessionEvent) => {
    let ownerId: string | undefined = event.playerId;

    if (event.step === "receiver" && event.nextPlayerId) {
      ownerId = event.nextPlayerId;
    }

    if (!ownerId) {
      ownerId = possession.events.find((e: PossessionEvent) => e.playerId)?.playerId ?? "unknown";
    }

    if (!byPlayer.has(ownerId)) {
      const col: PlayerColumn = {
        playerId: ownerId,
        playerName: getPlayerName(ownerId),
        events: [],
      };
      byPlayer.set(ownerId, col);
      columns.push(col);
    }

    const target = byPlayer.get(ownerId);
    if (target) {
      target.events.push(event);
    }
  });

  return columns;
}

function MapNodeCard({
  label,
  timeSec,
  kind,
  onClick,
}: {
  label: string;
  timeSec: number;
  kind: EventKind;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-w-[116px] rounded-xl border px-3 py-2 text-xs transition ${badgeTone(
        kind
      )} hover:border-white/20`}
    >
      <div>{label}</div>
      <div className="mt-1 text-[10px] text-white/45">{formatTime(timeSec)}</div>
    </button>
  );
}

function PassConnector({
  toPlayer,
}: {
  toPlayer: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-lime-300/80">
      <span className="rounded-full border border-lime-400/30 bg-lime-400/[0.08] px-2 py-0.5">
        Pass
      </span>
      <span className="text-white/30">→</span>
      <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-white/70">
        {toPlayer}
      </span>
    </div>
  );
}

function PossessionMap({
  possession,
  onSeek,
}: {
  possession: SavedPossession;
  onSeek: (sec: number) => void;
}) {
  const columns = useMemo<PlayerColumn[]>(() => buildPlayerColumns(possession), [possession]);

  return (
    <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
      <div className="flex flex-wrap items-start gap-6">
        {columns.map((column: PlayerColumn, columnIndex: number) => (
          <div key={column.playerId} className="flex min-w-[148px] flex-col items-center">
            <div className="mb-3 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
              {column.playerName}
            </div>

            <div className="flex flex-col items-center">
              {column.events.map((event: PossessionEvent, eventIndex: number) => {
                const isReceiver = event.step === "receiver" && Boolean(event.nextPlayerId);
                const label =
                  isReceiver && event.nextPlayerId
                    ? getPlayerName(event.nextPlayerId)
                    : event.label;

                return (
                  <div key={event.id} className="flex flex-col items-center">
                    <MapNodeCard
                      label={label}
                      timeSec={event.timeSec}
                      kind={event.kind}
                      onClick={() => onSeek(event.timeSec)}
                    />

                    {eventIndex !== column.events.length - 1 && (
                      <div className="h-6 w-px bg-white/12" />
                    )}
                  </div>
                );
              })}
            </div>

            {columnIndex !== columns.length - 1 && (
              <div className="mt-4 w-full">
                <PassConnector toPlayer={columns[columnIndex + 1]?.playerName ?? "Next Player"} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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

  const [savedPossessions, setSavedPossessions] = useState<SavedPossession[]>([]);
  const [selectedPossessionId, setSelectedPossessionId] = useState<string | null>(null);

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

  const selectedPossession = useMemo<SavedPossession | null>(() => {
    return savedPossessions.find((p: SavedPossession) => p.id === selectedPossessionId) ?? null;
  }, [savedPossessions, selectedPossessionId]);

  const signal = useMemo<SessionSignal>(() => countSessionSignal(savedPossessions), [savedPossessions]);

  const currentPlayerName = useMemo<string>(() => {
    return PLAYERS.find((p: Player) => p.id === currentPlayerId)?.name ?? "No player";
  }, [currentPlayerId]);

  const currentFlowText = useMemo<string>(() => {
    if (!events.length) return "Start possession. Pick the player with the ball.";

    return events
      .map((event: PossessionEvent) => {
        if (event.step === "selectPlayer" && event.playerId) {
          return getPlayerName(event.playerId);
        }
        if (event.step === "receiver" && event.nextPlayerId) {
          return `Pass → ${getPlayerName(event.nextPlayerId)}`;
        }
        return event.label;
      })
      .join(" → ");
  }, [events]);

  const smartPrompt = useMemo<string>(() => {
    switch (step) {
      case "selectPlayer":
        return "Who has the ball?";
      case "trigger":
        return "What started it?";
      case "action":
        return "What happened?";
      case "location":
        return "Where on floor?";
      case "defense":
        return "What did defense do?";
      case "decision":
        return "What did offense do?";
      case "receiver":
        return "Who received the pass?";
      case "outcome":
        return "How did the possession end?";
      default:
        return "Next decision.";
    }
  }, [step]);

  const progressPct = durationSec > 0 ? (currentSec / durationSec) * 100 : 0;

  const options = useMemo<Option[]>(() => {
    switch (step) {
      case "selectPlayer":
        return PLAYERS.map((p: Player) => ({
          label: p.name,
          value: p.id,
          tone: p.id === currentPlayerId ? "primary" : "normal",
        }));
      case "trigger":
        return [
          { label: "Catch", value: "Catch", tone: "primary" },
          { label: "OREB", value: "OREB" },
          { label: "Inbound", value: "Inbound" },
          { label: "Push", value: "Push" },
        ];
      case "action":
        return [
          { label: "Downhill", value: "Downhill", tone: "primary" },
          { label: "Shot", value: "Shot" },
          { label: "Pass", value: "Pass" },
          { label: "Turnover", value: "Turnover", tone: "danger" },
        ];
      case "location":
        return [
          { label: "Left Corner", value: "Left Corner" },
          { label: "Left Wing", value: "Left Wing" },
          { label: "Middle", value: "Middle", tone: "primary" },
          { label: "Right Wing", value: "Right Wing" },
          { label: "Right Corner", value: "Right Corner" },
        ];
      case "defense":
        return [
          { label: "No Help", value: "No Help", tone: "primary" },
          { label: "Help", value: "Help" },
        ];
      case "decision":
        return [
          { label: "Finish", value: "Finish", tone: "primary" },
          { label: "Pass", value: "Pass" },
          { label: "Reset", value: "Reset" },
        ];
      case "receiver":
        return PLAYERS.filter((p: Player) => p.id !== currentPlayerId).map((p: Player) => ({
          label: p.name,
          value: p.id,
        }));
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

    setVideoUrl((prev: string | null) => {
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
    setStep("selectPlayer");
  }

  function resetAll(): void {
    clearCurrentPossession();
    setSavedPossessions([]);
    setSelectedPossessionId(null);
    setCurrentSec(0);
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

    setNodes((prev: PossessionNode[]) => [...prev, node]);

    if (currentNodeId) {
      setEdges((prev: PossessionEdge[]) => [
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

    setEvents((prev: PossessionEvent[]) => [...prev, event]);
    setStep(nextStep);
  }

  function finishPossession(terminalLabel?: string): void {
    const finalEvents: PossessionEvent[] = [...events];
    const finalNodes: PossessionNode[] = [...nodes];
    const finalEdges: PossessionEdge[] = [...edges];

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
      summary: buildSummary(finalEvents, PLAYERS),
      startSec,
      endSec,
    };

    setSavedPossessions((prev: SavedPossession[]) => [saved, ...prev]);
    setSelectedPossessionId(saved.id);
    clearCurrentPossession();
  }

  function handleOptionClick(value: string): void {
    if (!videoUrl) return;

    if (step === "selectPlayer") {
      const player = PLAYERS.find((p: Player) => p.id === value);
      if (!player) return;

      setCurrentPlayerId(player.id);
      addGraphNode(player.name, "chain", player.id);
      addEvent("trigger", player.name, "chain", { playerId: player.id });
      return;
    }

    if (step === "trigger") {
      addGraphNode(value, "chain", currentPlayerId ?? undefined);
      addEvent("action", value, "chain", { playerId: currentPlayerId ?? undefined });
      return;
    }

    if (step === "action") {
      if (value === "Turnover") {
        finishPossession("Turnover");
        return;
      }

      addGraphNode(value, value === "Pass" ? "branch" : "chain", currentPlayerId ?? undefined);
      addEvent(
        value === "Downhill" ? "location" : value === "Shot" ? "outcome" : "receiver",
        value,
        value === "Pass" ? "branch" : "chain",
        { playerId: currentPlayerId ?? undefined }
      );
      return;
    }

    if (step === "location") {
      addGraphNode(value, "chain", currentPlayerId ?? undefined);
      addEvent("defense", value, "chain", { playerId: currentPlayerId ?? undefined });
      return;
    }

    if (step === "defense") {
      addGraphNode(value, "chain", currentPlayerId ?? undefined);
      addEvent("decision", value, "chain", { playerId: currentPlayerId ?? undefined });
      return;
    }

    if (step === "decision") {
      if (value === "Reset") {
        finishPossession("Reset");
        return;
      }

      addGraphNode(value, value === "Pass" ? "branch" : "chain", currentPlayerId ?? undefined);
      addEvent(
        value === "Pass" ? "receiver" : "outcome",
        value,
        value === "Pass" ? "branch" : "chain",
        { playerId: currentPlayerId ?? undefined }
      );
      return;
    }

    if (step === "receiver") {
      const player = PLAYERS.find((p: Player) => p.id === value);
      if (!player) return;

      addGraphNode(player.name, "branch", player.id);
      setCurrentPlayerId(player.id);
      addEvent("action", `Pass → ${player.name}`, "branch", {
        playerId: currentPlayerId ?? undefined,
        nextPlayerId: player.id,
      });
      return;
    }

    if (step === "outcome") {
      finishPossession(value);
    }
  }

  function undoLast(): void {
    if (!events.length) return;

    const nextEvents: PossessionEvent[] = events.slice(0, -1);
    setEvents(nextEvents);

    if (!nextEvents.length) {
      setNodes([]);
      setEdges([]);
      setCurrentNodeId(null);
      setCurrentPlayerId(null);
      setStep("selectPlayer");
      return;
    }

    const rebuiltNodes: PossessionNode[] = [];
    const rebuiltEdges: PossessionEdge[] = [];
    let prevNodeId: string | null = null;
    let rebuiltPlayerId: string | null = null;

    for (const event of nextEvents) {
      let label = event.label;
      let nodePlayerId = event.playerId;

      if (event.step === "receiver" && event.nextPlayerId) {
        label = getPlayerName(event.nextPlayerId);
        nodePlayerId = event.nextPlayerId;
        rebuiltPlayerId = event.nextPlayerId;
      } else if (event.step === "selectPlayer" && event.playerId) {
        rebuiltPlayerId = event.playerId;
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

    const last = nextEvents[nextEvents.length - 1];
    setCurrentPlayerId(last.nextPlayerId ?? last.playerId ?? rebuiltPlayerId);
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
    a.download = "axis-capture-v3-clean.json";
    a.click();
    URL.revokeObjectURL(url);
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

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 md:px-6 md:py-5">
        <header className="flex items-center justify-between border-b border-white/8 pb-3">
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
              Map the possession.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60">
              Open the camera or pick from library. Then map the possession as player, trigger,
              action, location, defense, transfer, and outcome.
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
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_360px]">
            <section className="min-w-0">
              <div className="overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03]">
                <div className="bg-black">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls={false}
                    playsInline
                    className="h-[240px] w-full bg-black object-contain md:h-[320px]"
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
                    <div
                      className="h-1.5 rounded-full bg-white"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={playPause}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:border-white/20"
                    >
                      {isPlaying ? "Pause" : "Play"}
                    </button>
                    <button
                      onClick={() => seekTo(currentSec - 2)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:border-white/20"
                    >
                      -2s
                    </button>
                    <button
                      onClick={() => seekTo(currentSec + 2)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:border-white/20"
                    >
                      +2s
                    </button>
                    <button
                      onClick={undoLast}
                      disabled={!events.length}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:border-white/20 disabled:opacity-40"
                    >
                      Undo
                    </button>
                    <button
                      onClick={() => finishPossession()}
                      disabled={!events.length}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:border-white/20 disabled:opacity-40"
                    >
                      Finish
                    </button>

                    <div className="ml-auto text-[10px] uppercase tracking-[0.22em] text-white/35">
                      {videoName}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/8 bg-white/[0.03] p-4 md:p-5">
                <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                      Current possession
                    </p>

                    <div className="mt-3 min-h-[58px] rounded-2xl border border-white/8 bg-black/30 px-3 py-3">
                      {events.length ? (
                        <div className="flex flex-wrap gap-2">
                          {events.map((event: PossessionEvent) => (
                            <span
                              key={event.id}
                              className={`rounded-full border px-2.5 py-1 text-xs ${badgeTone(
                                event.kind
                              )}`}
                            >
                              {event.step === "receiver" && event.nextPlayerId
                                ? `Pass → ${getPlayerName(event.nextPlayerId)}`
                                : event.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-white/45">{currentFlowText}</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/30 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                      Active player
                    </p>
                    <p className="mt-1 text-sm text-white/90">{currentPlayerName}</p>

                    <p className="mt-4 text-[10px] uppercase tracking-[0.24em] text-white/35">
                      Prompt
                    </p>
                    <p className="mt-1 text-sm text-white/80">{smartPrompt}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                    What happened next
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">{step}</p>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {options.map((option: Option) => (
                    <button
                      key={option.value}
                      onClick={() => handleOptionClick(option.value)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${buttonTone(
                        option.tone
                      )}`}
                    >
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="mt-1 text-xs text-white/40">
                        Stamp at {formatTime(currentSec)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/8 bg-white/[0.03] p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                    Possession cards
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                    {savedPossessions.length} saved
                  </p>
                </div>

                {savedPossessions.length ? (
                  <div className="grid gap-3">
                    {savedPossessions.map((possession: SavedPossession, index: number) => {
                      const hasBranch = possession.events.some(
                        (event: PossessionEvent) => event.kind === "branch"
                      );
                      const finalOutcome =
                        [...possession.events]
                          .reverse()
                          .find((event: PossessionEvent) => event.step === "outcome")?.label ??
                        "Open";

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
                            {possession.events.slice(0, 8).map((event: PossessionEvent) => (
                              <span
                                key={event.id}
                                className={`rounded-full border px-2.5 py-1 text-xs ${badgeTone(
                                  event.kind
                                )}`}
                              >
                                {event.step === "receiver" && event.nextPlayerId
                                  ? `Pass → ${getPlayerName(event.nextPlayerId)}`
                                  : event.label}
                              </span>
                            ))}

                            {possession.events.length > 8 ? (
                              <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-xs text-white/45">
                                +{possession.events.length - 8} more
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                Outcome
                              </div>
                              <div className="mt-1 text-sm text-white/90">{finalOutcome}</div>
                            </div>

                            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                Nodes
                              </div>
                              <div className="mt-1 text-sm text-white/90">
                                {possession.nodes.length}
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                Branch
                              </div>
                              <div className="mt-1 text-sm text-white/90">
                                {hasBranch ? "Yes" : "No"}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-white/35">No completed possessions yet.</div>
                )}
              </div>
            </section>

            <aside className="min-w-0 space-y-5">
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                  Session signal
                </p>

                <div className="mt-3 grid gap-2">
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    Possessions: <span className="text-white">{signal.possessions}</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    Downhill: <span className="text-white">{signal.downhill}</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    Shots: <span className="text-white">{signal.shots}</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    Help: <span className="text-white">{signal.help}</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    No Help: <span className="text-white">{signal.noHelp}</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    Passes: <span className="text-white">{signal.passes}</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    Finishes: <span className="text-white">{signal.finishes}</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    Makes: <span className="text-white">{signal.makes}</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    Misses: <span className="text-white">{signal.misses}</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    Fouls: <span className="text-white">{signal.fouls}</span>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                    Turnovers: <span className="text-white">{signal.turnovers}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                  Selected possession
                </p>

                {selectedPossession ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-2xl border border-white/8 bg-black/30 p-3 text-sm text-white/85">
                      {selectedPossession.summary}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                        Start:{" "}
                        <span className="text-white">
                          {formatTime(selectedPossession.startSec)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                        End:{" "}
                        <span className="text-white">
                          {formatTime(selectedPossession.endSec)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                        Nodes: <span className="text-white">{selectedPossession.nodes.length}</span>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm text-white/78">
                        Links: <span className="text-white">{selectedPossession.edges.length}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                          Decision map
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                          Vertical branch view
                        </p>
                      </div>

                      <PossessionMap possession={selectedPossession} onSeek={seekTo} />
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                        Decision path
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedPossession.events.map((event: PossessionEvent) => (
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
                  <div className="text-sm text-white/35">Pick a possession card to inspect the map.</div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}