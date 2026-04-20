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

type Option = {
  label: string;
  value: string;
  tone?: "primary" | "normal" | "danger";
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

/* =============================
   STYLES
============================= */

function buttonTone(tone?: Option["tone"]): string {
  if (tone === "primary") {
    return "border-lime-400/40 bg-lime-400/[0.12] text-lime-100 hover:bg-lime-400/[0.18]";
  }
  if (tone === "danger") {
    return "border-red-400/40 bg-red-400/[0.08] text-red-100 hover:bg-red-400/[0.14]";
  }
  return "border-white/10 bg-black text-white/90 hover:bg-white/[0.04]";
}

function badgeTone(kind: EventKind): string {
  if (kind === "branch") return "border-lime-400/30 bg-lime-400/[0.08] text-lime-100";
  if (kind === "outcome") return "border-white/20 bg-white/[0.08] text-white";
  if (kind === "terminal") return "border-red-400/30 bg-red-400/[0.08] text-red-100";
  return "border-white/10 bg-white/[0.05] text-white/80";
}

type MapNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: EventKind;
  timeSec: number;
};

type MapEdge = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type LayoutResult = {
  nodes: MapNode[];
  edges: MapEdge[];
  width: number;
  height: number;
};

/* =============================
   HELPERS
============================= */

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

function countSessionSignal(possessions: SavedPossession[]): {
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
} {
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
   GRAPH ENGINE
============================= */

function layoutGraph(possession: SavedPossession): LayoutResult {
  const children = new Map<string, string[]>();

  possession.edges.forEach((edge: PossessionEdge) => {
    const list = children.get(edge.from) ?? [];
    list.push(edge.to);
    children.set(edge.from, list);
  });

  const incoming = new Set<string>(
    possession.edges.map((edge: PossessionEdge) => edge.to)
  );

  const root: PossessionNode | undefined =
    possession.nodes.find((node: PossessionNode) => !incoming.has(node.id)) ??
    possession.nodes[0];

  const positions = new Map<string, { x: number; y: number }>();
  let row = 0;

  function walk(id: string, depth: number): { x: number; y: number } {
    const kids: string[] = children.get(id) ?? [];

    if (kids.length === 0) {
      const pos = {
        x: depth * 180 + 80,
        y: row * 110 + 60,
      };
      positions.set(id, pos);
      row += 1;
      return pos;
    }

    const childPositions: { x: number; y: number }[] = kids.map((kidId: string) =>
      walk(kidId, depth + 1)
    );

    const avgY =
      childPositions.reduce(
        (sum: number, pos: { x: number; y: number }) => sum + pos.y,
        0
      ) / childPositions.length;

    const pos = {
      x: depth * 180 + 80,
      y: avgY,
    };

    positions.set(id, pos);
    return pos;
  }

  if (root) {
    walk(root.id, 0);
  }

  const nodes: MapNode[] = possession.nodes.map((node: PossessionNode) => {
    const pos = positions.get(node.id) ?? { x: 80, y: 60 };
    return {
      id: node.id,
      label: node.label,
      x: pos.x,
      y: pos.y,
      kind: node.kind,
      timeSec: node.timeSec,
    };
  });

  const edges: MapEdge[] = possession.edges
    .map((edge: PossessionEdge): MapEdge | null => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);

      if (!from || !to) return null;

      return {
        id: edge.id,
        x1: from.x + 50,
        y1: from.y,
        x2: to.x - 50,
        y2: to.y,
      };
    })
    .filter((edge: MapEdge | null): edge is MapEdge => edge !== null);

  const width =
    nodes.length > 0 ? Math.max(...nodes.map((node: MapNode) => node.x)) + 140 : 800;
  const height =
    nodes.length > 0 ? Math.max(...nodes.map((node: MapNode) => node.y)) + 90 : 240;

  return {
    nodes,
    edges,
    width: Math.max(width, 800),
    height: Math.max(height, 240),
  };
}

/* =============================
   MAP VIEW
============================= */

function PossessionMap({
  possession,
  onSeek,
}: {
  possession: SavedPossession;
  onSeek: (sec: number) => void;
}) {
  const graph = useMemo<LayoutResult>(() => layoutGraph(possession), [possession]);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-black/30">
      <svg
        width={graph.width}
        height={graph.height}
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        className="block"
      >
        {graph.edges.map((edge: MapEdge) => (
          <path
            key={edge.id}
            d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 40} ${edge.y1}, ${edge.x2 - 40} ${edge.y2}, ${edge.x2} ${edge.y2}`}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
          />
        ))}

        {graph.nodes.map((node: MapNode) => (
          <g
            key={node.id}
            transform={`translate(${node.x}, ${node.y})`}
            style={{ cursor: "pointer" }}
            onClick={() => onSeek(node.timeSec)}
          >
            <rect
              x={-56}
              y={-24}
              rx={14}
              ry={14}
              width={112}
              height={48}
              fill={
                node.kind === "branch"
                  ? "rgba(163,230,53,0.12)"
                  : node.kind === "outcome"
                  ? "rgba(255,255,255,0.1)"
                  : node.kind === "terminal"
                  ? "rgba(248,113,113,0.12)"
                  : "rgba(255,255,255,0.06)"
              }
              stroke={
                node.kind === "branch"
                  ? "rgba(163,230,53,0.35)"
                  : node.kind === "outcome"
                  ? "rgba(255,255,255,0.22)"
                  : node.kind === "terminal"
                  ? "rgba(248,113,113,0.35)"
                  : "rgba(255,255,255,0.14)"
              }
            />
            <text
              x="0"
              y="-2"
              textAnchor="middle"
              fontSize="12"
              fill="white"
              style={{ fontWeight: 500 }}
            >
              {node.label}
            </text>
            <text
              x="0"
              y="14"
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.45)"
            >
              {formatTime(node.timeSec)}
            </text>
          </g>
        ))}
      </svg>
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

  const signal = useMemo(() => countSessionSignal(savedPossessions), [savedPossessions]);

  const currentPlayerName = useMemo<string>(() => {
    return PLAYERS.find((p: Player) => p.id === currentPlayerId)?.name ?? "No player";
  }, [currentPlayerId]);

  const currentFlowText = useMemo<string>(() => {
    if (!events.length) return "Start possession. Pick the player with the ball.";

    return events
      .map((event: PossessionEvent) => {
        if (event.step === "selectPlayer" && event.playerId) {
          return PLAYERS.find((p: Player) => p.id === event.playerId)?.name ?? "Player";
        }
        if (event.step === "receiver" && event.nextPlayerId) {
          const name =
            PLAYERS.find((p: Player) => p.id === event.nextPlayerId)?.name ?? "Receiver";
          return `Pass → ${name}`;
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
          { label: "Left Slot", value: "Left Slot" },
          { label: "Middle", value: "Middle", tone: "primary" },
          { label: "Right Slot", value: "Right Slot" },
          { label: "Baseline", value: "Baseline" },
          { label: "Nail", value: "Nail" },
          { label: "Paint Touch", value: "Paint Touch" },
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
        label = PLAYERS.find((p: Player) => p.id === event.nextPlayerId)?.name ?? label;
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
    a.download = "axis-capture-v2.json";
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

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Axis</p>
            <h1 className="text-lg font-semibold tracking-tight">Capture V2</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openCameraPicker}
              className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/85 transition hover:border-white/25"
            >
              Record
            </button>
            <button
              onClick={openLibraryPicker}
              className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/85 transition hover:border-white/25"
            >
              Library
            </button>
            <button
              onClick={exportSession}
              disabled={!savedPossessions.length}
              className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/85 transition hover:border-white/25 disabled:opacity-40"
            >
              Export
            </button>
            <button
              onClick={resetAll}
              className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/85 transition hover:border-white/25"
            >
              Reset
            </button>
          </div>
        </header>

        {!videoUrl ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-lime-400">Capture</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Map the possession.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60">
              Open the camera or pick from library. Then map the possession as player, trigger,
              action, floor location, defense, transfer, and outcome.
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
                className="rounded-2xl border border-white/12 px-6 py-4 text-base font-medium text-white transition hover:border-white/25"
              >
                Choose From Library
              </button>
            </div>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_390px]">
            <section className="min-w-0">
              <div className="sticky top-0 z-20 overflow-hidden rounded-2xl border border-white/10 bg-[#050505]">
                <div className="relative bg-black">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls={false}
                    playsInline
                    className="h-[220px] w-full bg-black object-contain md:h-[280px]"
                  />
                </div>

                <div className="border-t border-white/10 px-3 py-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-white/55">
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
                    className="mb-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
                  />

                  <div className="mb-3 h-1.5 w-full rounded-full bg-white/5">
                    <div
                      className="h-1.5 rounded-full bg-white"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={playPause}
                      className="rounded-xl border border-white/12 px-3 py-2 text-sm transition hover:border-white/25"
                    >
                      {isPlaying ? "Pause" : "Play"}
                    </button>
                    <button
                      onClick={() => seekTo(currentSec - 2)}
                      className="rounded-xl border border-white/12 px-3 py-2 text-sm transition hover:border-white/25"
                    >
                      -2s
                    </button>
                    <button
                      onClick={() => seekTo(currentSec + 2)}
                      className="rounded-xl border border-white/12 px-3 py-2 text-sm transition hover:border-white/25"
                    >
                      +2s
                    </button>
                    <button
                      onClick={undoLast}
                      disabled={!events.length}
                      className="rounded-xl border border-white/12 px-3 py-2 text-sm transition hover:border-white/25 disabled:opacity-40"
                    >
                      Undo
                    </button>
                    <button
                      onClick={() => finishPossession()}
                      disabled={!events.length}
                      className="rounded-xl border border-white/12 px-3 py-2 text-sm transition hover:border-white/25 disabled:opacity-40"
                    >
                      Finish
                    </button>

                    <div className="ml-auto text-xs uppercase tracking-[0.22em] text-white/35">
                      {videoName}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                      Current possession
                    </p>
                    <div className="mt-2 flex min-h-[56px] flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white/88">
                      {events.length ? (
                        events.map((event: PossessionEvent) => (
                          <span
                            key={event.id}
                            className={`rounded-full border px-2.5 py-1 ${badgeTone(event.kind)}`}
                          >
                            {event.step === "receiver" && event.nextPlayerId
                              ? `Pass → ${
                                  PLAYERS.find((p: Player) => p.id === event.nextPlayerId)?.name ??
                                  event.label
                                }`
                              : event.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-white/45">{currentFlowText}</span>
                      )}
                    </div>
                  </div>

                  <div className="w-full max-w-[240px] rounded-2xl border border-white/10 bg-black/40 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                      Active player
                    </p>
                    <p className="mt-1 text-sm text-white/90">{currentPlayerName}</p>
                    <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-white/35">
                      Prompt
                    </p>
                    <p className="mt-1 text-sm text-white/80">{smartPrompt}</p>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                    What happened next
                  </p>
                  <p className="text-xs text-white/35">{step}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                    Possession cards
                  </p>
                  <p className="text-xs text-white/35">{savedPossessions.length} saved</p>
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
                          className={`rounded-2xl border p-4 text-left transition hover:border-white/25 ${
                            selectedPossessionId === possession.id
                              ? "border-lime-400/50 bg-lime-400/[0.08]"
                              : "border-white/10 bg-black/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                                Possession {savedPossessions.length - index}
                              </p>
                              <p className="mt-2 text-sm text-white/88">{possession.summary}</p>
                            </div>

                            <div className="text-right text-xs text-white/35">
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
                                  ? `Pass → ${
                                      PLAYERS.find((p: Player) => p.id === event.nextPlayerId)
                                        ?.name ?? event.label
                                    }`
                                  : event.label}
                              </span>
                            ))}

                            {possession.events.length > 8 ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/45">
                                +{possession.events.length - 8} more
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                Outcome
                              </div>
                              <div className="mt-1 text-sm text-white/90">{finalOutcome}</div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                Nodes
                              </div>
                              <div className="mt-1 text-sm text-white/90">
                                {possession.nodes.length}
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
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

            <aside className="min-w-0">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                  Session signal
                </p>

                <div className="mt-3 grid gap-2">
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Possessions: <span className="text-white">{signal.possessions}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Downhill: <span className="text-white">{signal.downhill}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Shots: <span className="text-white">{signal.shots}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Help: <span className="text-white">{signal.help}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    No Help: <span className="text-white">{signal.noHelp}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Passes: <span className="text-white">{signal.passes}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Finishes: <span className="text-white">{signal.finishes}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Makes: <span className="text-white">{signal.makes}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Misses: <span className="text-white">{signal.misses}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Fouls: <span className="text-white">{signal.fouls}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Turnovers: <span className="text-white">{signal.turnovers}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                  Selected possession
                </p>

                {selectedPossession ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/85">
                      {selectedPossession.summary}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                        Start:{" "}
                        <span className="text-white">
                          {formatTime(selectedPossession.startSec)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                        End:{" "}
                        <span className="text-white">
                          {formatTime(selectedPossession.endSec)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                        Nodes: <span className="text-white">{selectedPossession.nodes.length}</span>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                        Links: <span className="text-white">{selectedPossession.edges.length}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                          Decision map
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                          Tap node to jump
                        </p>
                      </div>

                      <PossessionMap possession={selectedPossession} onSeek={seekTo} />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                        Decision path
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedPossession.events.map((event: PossessionEvent) => (
                          <button
                            key={event.id}
                            onClick={() => seekTo(event.timeSec)}
                            className={`rounded-full border px-2.5 py-1 text-xs transition hover:border-white/25 ${badgeTone(
                              event.kind
                            )}`}
                          >
                            {event.step === "receiver" && event.nextPlayerId
                              ? `Pass → ${
                                  PLAYERS.find((p: Player) => p.id === event.nextPlayerId)?.name ??
                                  event.label
                                }`
                              : event.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-white/35">
                    Pick a possession card to inspect the map.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                  System state
                </p>

                <div className="mt-3 space-y-3 text-sm leading-6 text-white/78">
                  <p>Player first. Downhill forces location. Pass transfers the next decision.</p>
                  <p>Cards hold the possession. The side panel reads the structure.</p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}