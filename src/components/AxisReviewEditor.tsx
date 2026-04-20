"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  videoUrl: string;
};

type ActionType =
  | "Downhill"
  | "Pass"
  | "Shot"
  | "Reset"
  | "Turnover"
  | "Help"
  | "No Help"
  | "Cut Off"
  | "Finish"
  | "Make"
  | "Miss"
  | "Foul";

type ChainNode = {
  id: string;
  action: ActionType;
  time: number;
};

type CompletedPossession = {
  id: string;
  nodes: ChainNode[];
  note: string;
};

const END_ACTIONS: ActionType[] = ["Make", "Miss", "Turnover", "Foul", "Reset"];

const ACTION_STYLES: Record<ActionType, string> = {
  Downhill: "border-sky-400 text-sky-300 bg-sky-500/10",
  Pass: "border-violet-400 text-violet-300 bg-violet-500/10",
  Shot: "border-emerald-400 text-emerald-300 bg-emerald-500/10",
  Reset: "border-neutral-500 text-neutral-200 bg-neutral-500/10",
  Turnover: "border-red-400 text-red-300 bg-red-500/10",
  Help: "border-pink-400 text-pink-300 bg-pink-500/10",
  "No Help": "border-cyan-400 text-cyan-300 bg-cyan-500/10",
  "Cut Off": "border-orange-400 text-orange-300 bg-orange-500/10",
  Finish: "border-lime-400 text-lime-300 bg-lime-500/10",
  Make: "border-green-400 text-green-300 bg-green-500/10",
  Miss: "border-neutral-400 text-neutral-300 bg-neutral-400/10",
  Foul: "border-yellow-400 text-yellow-300 bg-yellow-500/10",
};

function formatTime(time: number) {
  if (!Number.isFinite(time)) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getNextActions(lastAction: ActionType | null): ActionType[] {
  if (!lastAction) return ["Downhill", "Pass", "Shot", "Reset", "Turnover"];

  switch (lastAction) {
    case "Downhill":
      return ["Help", "No Help", "Cut Off"];
    case "Help":
      return ["Pass", "Shot", "Turnover"];
    case "No Help":
      return ["Finish", "Shot", "Pass"];
    case "Cut Off":
      return ["Reset", "Pass", "Turnover"];
    case "Pass":
      return ["Shot", "Reset", "Turnover"];
    case "Finish":
    case "Shot":
      return ["Make", "Miss", "Foul"];
    default:
      return [];
  }
}

function classify(nodes: ChainNode[]) {
  const a = nodes.map((n) => n.action);
  const has = (x: ActionType) => a.includes(x);

  if (has("Downhill") && has("Help") && has("Pass")) return "Advantage Created";
  if (has("Downhill") && has("No Help") && has("Pass")) return "Passed Up Advantage";
  if (has("Downhill") && has("Shot") && has("Miss")) return "Missed Downhill Shot";
  if (has("Shot") && has("Miss") && !has("Downhill")) return "Empty Possession";
  if (has("Turnover")) return "Turnover";
  if (has("Foul")) return "Foul";
  if (has("Make")) return "Scored";
  if (has("Miss")) return "Missed Shot";

  return "Unclassified";
}

export default function AxisReviewEditor({ videoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [chain, setChain] = useState<ChainNode[]>([]);
  const [completed, setCompleted] = useState<CompletedPossession[]>([]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onMeta = () => setDuration(v.duration || 0);
    const onTime = () => setCurrentTime(v.currentTime || 0);

    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);

    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [videoUrl]);

  function addAction(action: ActionType) {
    const node = {
      id: Date.now().toString(),
      action,
      time: currentTime,
    };

    setChain((prev) => {
      const next = [...prev, node];

      if (END_ACTIONS.includes(action)) {
        setCompleted((c) => [
          {
            id: Date.now().toString(),
            nodes: next,
            note: "",
          },
          ...c,
        ]);
        return [];
      }

      return next;
    });
  }

  const last = chain.length ? chain[chain.length - 1].action : null;
  const nextActions = getNextActions(last);

  return (
    <div className="p-4 space-y-4">
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="w-full max-h-[40vh] object-contain bg-black"
      />

      {/* CONTROLS */}
      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={currentTime}
          onChange={(e) => {
            const v = videoRef.current;
            if (!v) return;
            v.currentTime = Number(e.target.value);
          }}
          className="w-full"
        />

        <div className="flex gap-2">
          <button onClick={() => videoRef.current?.play()}>Play</button>
          <button onClick={() => videoRef.current?.pause()}>Pause</button>
          <button onClick={() => downloadText("export.json", JSON.stringify(completed, null, 2))}>
            Export
          </button>
        </div>
      </div>

      {/* CURRENT POSSESSION */}
      <div className="border p-3 rounded">
        <div className="text-sm font-bold">
          Current possession
          {chain.length === 0 && <span className="ml-2 text-lime-400">(ready)</span>}
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {chain.map((n, i) => (
            <span key={n.id} className="text-xs border px-2 py-1 rounded">
              {i + 1}. {n.action}
            </span>
          ))}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap gap-2">
        {nextActions.map((a) => (
          <button key={a} onClick={() => addAction(a)} className="border px-3 py-2 rounded">
            {a}
          </button>
        ))}
      </div>

      {/* COMPLETED */}
      <div className="space-y-2">
        {completed.map((p, i) => (
          <div key={p.id} className="border p-2 rounded">
            <div className="text-xs text-lime-400">{classify(p.nodes)}</div>
            <div className="flex gap-1 flex-wrap">
              {p.nodes.map((n) => (
                <span key={n.id} className="text-xs border px-1 rounded">
                  {n.action}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}