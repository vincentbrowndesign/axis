"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type NodeId =
  | "start"
  | "action"
  | "lane"
  | "help"
  | "afterHelp"
  | "finishType"
  | "outcome"
  | "branchStart";

type EventKind = "chain" | "outcome" | "branch" | "deadball";

type TimelineEvent = {
  id: string;
  timeSec: number;
  label: string;
  chainId: string;
  depth: number;
  kind: EventKind;
};

type ChainSummary = {
  id: string;
  parentChainId?: string;
  parentEventId?: string;
  depth: number;
  labels: string[];
  startSec: number;
  endSec?: number;
  closed: boolean;
};

type Suggestion = {
  title: string;
  value: string;
  tone?: "primary" | "normal";
};

const START_OPTIONS: Suggestion[] = [
  { title: "Catch", value: "Catch", tone: "primary" },
  { title: "OREB", value: "OREB" },
  { title: "Inbound", value: "Inbound" },
  { title: "Push", value: "Push" },
];

const ACTION_OPTIONS: Suggestion[] = [
  { title: "Downhill", value: "Downhill", tone: "primary" },
  { title: "Shot", value: "Shot" },
  { title: "Pass", value: "Pass" },
  { title: "Turnover", value: "Turnover" },
];

const LANE_OPTIONS: Suggestion[] = [
  { title: "Left", value: "Left" },
  { title: "Middle", value: "Middle", tone: "primary" },
  { title: "Right", value: "Right" },
];

const HELP_OPTIONS: Suggestion[] = [
  { title: "No Help", value: "No Help", tone: "primary" },
  { title: "Help", value: "Help" },
];

const AFTER_HELP_OPTIONS: Suggestion[] = [
  { title: "Pass", value: "Pass", tone: "primary" },
  { title: "Finish", value: "Finish" },
  { title: "Reset", value: "Reset" },
];

const FINISH_OPTIONS: Suggestion[] = [
  { title: "Lay", value: "Lay", tone: "primary" },
  { title: "Floater", value: "Floater" },
  { title: "Pull-Up", value: "Pull-Up" },
  { title: "Kickout", value: "Kickout" },
];

const OUTCOME_OPTIONS: Suggestion[] = [
  { title: "Make", value: "Make", tone: "primary" },
  { title: "Miss", value: "Miss" },
  { title: "Foul", value: "Foul" },
];

const BRANCH_START_OPTIONS: Suggestion[] = [
  { title: "Catch", value: "Catch", tone: "primary" },
  { title: "Shot", value: "Shot" },
  { title: "Downhill", value: "Downhill" },
  { title: "Pass", value: "Pass" },
  { title: "Turnover", value: "Turnover" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec)) return "0:00";
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buttonTone(tone?: "primary" | "normal") {
  if (tone === "primary") {
    return "border-lime-400/45 bg-lime-400/[0.14] text-lime-100 hover:border-lime-300/70 hover:bg-lime-400/[0.2]";
  }

  return "border-white/10 bg-black text-white/88 hover:border-white/25 hover:bg-white/[0.04]";
}

function eventTone(kind: EventKind) {
  if (kind === "branch") {
    return "border-lime-400/30 bg-lime-400/[0.08] text-lime-100";
  }
  if (kind === "outcome") {
    return "border-white/20 bg-white/[0.07] text-white";
  }
  if (kind === "deadball") {
    return "border-white/10 bg-white/[0.04] text-white/70";
  }
  return "border-white/10 bg-white/[0.04] text-white/85";
}

function deriveRead(node: NodeId, labels: string[]) {
  if (!labels.length) return "What started it?";
  if (node === "action") return "What happened next?";
  if (node === "lane") return "Which lane opened?";
  if (node === "help") return "Where’s the help?";
  if (node === "afterHelp") return "What did the pressure force?";
  if (node === "finishType") return "How did he finish?";
  if (node === "outcome") return "Did it work?";
  if (node === "branchStart") return "New branch. What happened off the pass?";
  return "Keep the chain honest.";
}

function summarizeChain(labels: string[]) {
  const downhill = labels.includes("Downhill");
  const help = labels.includes("Help");
  const noHelp = labels.includes("No Help");
  const pass = labels.includes("Pass");
  const kickout = labels.includes("Kickout");
  const make = labels.includes("Make");
  const miss = labels.includes("Miss");
  const foul = labels.includes("Foul");
  const turnover = labels.includes("Turnover");

  if (turnover) return "Ended in turnover.";
  if (downhill && help && pass) return "Drive created help and forced a pass.";
  if (downhill && noHelp && make) return "Clean downhill finish.";
  if (downhill && noHelp && miss) return "Got downhill and missed the finish.";
  if (kickout) return "Paint pressure led to kickout.";
  if (pass && make) return "Pass chain ended in make.";
  if (pass && miss) return "Pass chain ended in miss.";
  if (foul) return "Play drew a foul.";
  if (make) return "Possession ended in make.";
  if (miss) return "Possession ended in miss.";
  return "Open chain.";
}

function countLabels(chains: ChainSummary[]) {
  const flat = chains.flatMap((chain) => chain.labels);

  const count = (label: string) => flat.filter((item) => item === label).length;

  return {
    downhill: count("Downhill"),
    help: count("Help"),
    noHelp: count("No Help"),
    pass: count("Pass"),
    kickout: count("Kickout"),
    make: count("Make"),
    miss: count("Miss"),
    turnover: count("Turnover"),
  };
}

export default function ReviewPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [chains, setChains] = useState<ChainSummary[]>([]);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);
  const [node, setNode] = useState<NodeId>("start");

  const activeChain = useMemo(
    () => chains.find((chain) => chain.id === activeChainId) ?? null,
    [chains, activeChainId]
  );

  const suggestions = useMemo(() => {
    switch (node) {
      case "start":
        return START_OPTIONS;
      case "action":
        return ACTION_OPTIONS;
      case "lane":
        return LANE_OPTIONS;
      case "help":
        return HELP_OPTIONS;
      case "afterHelp":
        return AFTER_HELP_OPTIONS;
      case "finishType":
        return FINISH_OPTIONS;
      case "outcome":
        return OUTCOME_OPTIONS;
      case "branchStart":
        return BRANCH_START_OPTIONS;
      default:
        return [];
    }
  }, [node]);

  const groupedTree = useMemo(() => {
    const map = new Map<string | undefined, ChainSummary[]>();

    for (const chain of [...chains].sort((a, b) => a.startSec - b.startSec)) {
      const key = chain.parentChainId;
      const next = map.get(key) ?? [];
      next.push(chain);
      map.set(key, next);
    }

    return map;
  }, [chains]);

  const counts = useMemo(() => countLabels(chains), [chains]);

  const progressPct = durationSec > 0 ? (currentSec / durationSec) * 100 : 0;
  const activeRead = deriveRead(node, activeChain?.labels ?? []);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setDurationSec(video.duration || 0);
    };

    const onTimeUpdate = () => {
      setCurrentSec(video.currentTime || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [videoUrl]);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleVideoUpload(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please choose a video file.");
      return;
    }

    setEvents([]);
    setChains([]);
    setActiveChainId(null);
    setNode("start");
    setCurrentSec(0);
    setDurationSec(0);
    setIsPlaying(false);

    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });

    setVideoName(file.name);
  }

  function playPause() {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (video.paused) {
      video.play().catch(() => null);
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function seekTo(sec: number) {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const safe = Math.max(0, Math.min(durationSec || 0, sec));
    video.currentTime = safe;
    setCurrentSec(safe);
  }

  function ensureActiveChain(options?: {
    parentChainId?: string;
    parentEventId?: string;
    depth?: number;
  }) {
    if (activeChainId) return activeChainId;

    const id = uid();
    const newChain: ChainSummary = {
      id,
      parentChainId: options?.parentChainId,
      parentEventId: options?.parentEventId,
      depth: options?.depth ?? 0,
      labels: [],
      startSec: currentSec,
      closed: false,
    };

    setChains((prev) => [...prev, newChain]);
    setActiveChainId(id);
    return id;
  }

  function updateChain(chainId: string, updater: (chain: ChainSummary) => ChainSummary) {
    setChains((prev) => prev.map((chain) => (chain.id === chainId ? updater(chain) : chain)));
  }

  function appendToChain(label: string, kind: EventKind) {
    const chainId = activeChainId ?? ensureActiveChain();
    const chain = chains.find((item) => item.id === chainId);
    const depth = chain?.depth ?? 0;

    const newEvent: TimelineEvent = {
      id: uid(),
      timeSec: currentSec,
      label,
      chainId,
      depth,
      kind,
    };

    setEvents((prev) => [...prev, newEvent]);
    updateChain(chainId, (current) => ({
      ...current,
      labels: [...current.labels, label],
    }));

    return { newEvent, chainId };
  }

  function closeChain(chainId: string) {
    updateChain(chainId, (chain) => ({
      ...chain,
      endSec: currentSec,
      closed: true,
    }));
  }

  function startBranch(parentChainId: string, parentEventId: string) {
    const parent = chains.find((item) => item.id === parentChainId);

    const branchId = uid();
    const newChain: ChainSummary = {
      id: branchId,
      parentChainId,
      parentEventId,
      depth: (parent?.depth ?? 0) + 1,
      labels: [],
      startSec: currentSec,
      closed: false,
    };

    setChains((prev) => [...prev, newChain]);
    setActiveChainId(branchId);
    setNode("branchStart");
  }

  function resetFlow() {
    setActiveChainId(null);
    setNode("start");
  }

  function handleTag(value: string) {
    if (!videoUrl) return;

    if (node === "start") {
      appendToChain(value, "chain");
      setNode("action");
      return;
    }

    if (node === "branchStart") {
      const { chainId } = appendToChain(value, "branch");

      if (value === "Catch" || value === "Pass") {
        setNode("action");
        return;
      }

      if (value === "Shot") {
        setNode("outcome");
        return;
      }

      if (value === "Downhill") {
        setNode("lane");
        return;
      }

      if (value === "Turnover") {
        closeChain(chainId);
        resetFlow();
      }

      return;
    }

    if (node === "action") {
      if (value === "Pass") {
        const { newEvent, chainId } = appendToChain("Pass", "branch");
        closeChain(chainId);
        startBranch(chainId, newEvent.id);
        return;
      }

      if (value === "Turnover") {
        const { chainId } = appendToChain("Turnover", "deadball");
        closeChain(chainId);
        resetFlow();
        return;
      }

      appendToChain(value, "chain");

      if (value === "Downhill") {
        setNode("lane");
        return;
      }

      if (value === "Shot") {
        setNode("outcome");
      }

      return;
    }

    if (node === "lane") {
      appendToChain(value, "chain");
      setNode("help");
      return;
    }

    if (node === "help") {
      appendToChain(value, "chain");

      if (value === "Help") {
        setNode("afterHelp");
      } else {
        setNode("finishType");
      }

      return;
    }

    if (node === "afterHelp") {
      if (value === "Pass") {
        const { newEvent, chainId } = appendToChain("Pass", "branch");
        closeChain(chainId);
        startBranch(chainId, newEvent.id);
        return;
      }

      if (value === "Reset") {
        const { chainId } = appendToChain("Reset", "deadball");
        closeChain(chainId);
        resetFlow();
        return;
      }

      appendToChain(value, "chain");

      if (value === "Finish") {
        setNode("finishType");
      }

      return;
    }

    if (node === "finishType") {
      if (value === "Kickout") {
        const { newEvent, chainId } = appendToChain("Kickout", "branch");
        closeChain(chainId);
        startBranch(chainId, newEvent.id);
        return;
      }

      appendToChain(value, "chain");
      setNode("outcome");
      return;
    }

    if (node === "outcome") {
      const { chainId } = appendToChain(value, "outcome");
      closeChain(chainId);
      resetFlow();
    }
  }

  function undoLast() {
    if (!events.length) return;

    const nextEvents = events.slice(0, -1);
    setEvents(nextEvents);

    const nextChainsMap = new Map<string, ChainSummary>();

    for (const chain of chains) {
      nextChainsMap.set(chain.id, {
        ...chain,
        labels: [],
        closed: false,
        endSec: undefined,
      });
    }

    for (const event of nextEvents) {
      const chain = nextChainsMap.get(event.chainId);
      if (!chain) continue;
      chain.labels.push(event.label);
    }

    const nextChains = Array.from(nextChainsMap.values()).filter((chain) => chain.labels.length > 0);
    setChains(nextChains);

    const lastEvent = nextEvents[nextEvents.length - 1];
    if (!lastEvent) {
      setActiveChainId(null);
      setNode("start");
      return;
    }

    const currentChain = nextChains.find((chain) => chain.id === lastEvent.chainId) ?? null;
    setActiveChainId(currentChain?.id ?? null);

    const lastLabel = lastEvent.label;

    if (["Catch", "OREB", "Inbound", "Push"].includes(lastLabel)) {
      setNode("action");
      return;
    }

    if (lastLabel === "Downhill") {
      setNode("lane");
      return;
    }

    if (["Left", "Middle", "Right"].includes(lastLabel)) {
      setNode("help");
      return;
    }

    if (lastLabel === "Help") {
      setNode("afterHelp");
      return;
    }

    if (lastLabel === "No Help" || lastLabel === "Finish") {
      setNode("finishType");
      return;
    }

    if (["Lay", "Floater", "Pull-Up", "Shot"].includes(lastLabel)) {
      setNode("outcome");
      return;
    }

    if (["Pass", "Kickout"].includes(lastLabel)) {
      setNode("branchStart");
      return;
    }

    setNode("start");
  }

  function exportReview() {
    const payload = {
      exportedAt: new Date().toISOString(),
      videoName,
      durationSec,
      chains,
      events,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "axis-review.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function renderTree(parentChainId?: string) {
    const children = groupedTree.get(parentChainId) ?? [];
    if (!children.length) return null;

    return (
      <div className="space-y-3">
        {children.map((chain) => (
          <div key={chain.id} className="space-y-3">
            <button
              onClick={() => {
                setActiveChainId(chain.id);
                seekTo(chain.startSec);
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:border-white/25 ${
                activeChainId === chain.id
                  ? "border-lime-400/50 bg-lime-400/[0.08]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
              style={{ marginLeft: `${chain.depth * 16}px` }}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">
                  {chain.depth === 0 ? "Primary chain" : `Branch ${chain.depth}`}
                </div>
                <div className="text-xs text-white/35">{formatTime(chain.startSec)}</div>
              </div>

              <div className="text-sm text-white/90">{chain.labels.join(" → ")}</div>

              <div className="mt-2 text-xs text-white/35">
                {chain.closed ? "Closed" : "Open"} · {chain.labels.length} steps
              </div>
            </button>

            <div className="ml-3 border-l border-white/10 pl-3">{renderTree(chain.id)}</div>
          </div>
        ))}
      </div>
    );
  }

  const sortedChains = [...chains].sort((a, b) => a.startSec - b.startSec);

  return (
    <main className="min-h-screen bg-black text-white">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleVideoUpload(e.target.files?.[0] ?? null)}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Axis</p>
            <h1 className="text-lg font-semibold tracking-tight">Review</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openFilePicker}
              className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/80 transition hover:border-white/25"
            >
              Upload Video
            </button>
            <button
              onClick={exportReview}
              className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/80 transition hover:border-white/25 disabled:opacity-40"
              disabled={!chains.length}
            >
              Export
            </button>
            <button
              onClick={() => {
                setEvents([]);
                setChains([]);
                setActiveChainId(null);
                setNode("start");
                setCurrentSec(0);
              }}
              className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/80 transition hover:border-white/25"
            >
              New Clip
            </button>
          </div>
        </header>

        {!videoUrl ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-lime-400">Axis Review</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                Upload a video.
                <br />
                Build the possession.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/60">
                Bring in one game or practice file. Then tag decisions, follow branches, and turn
                possessions into signal.
              </p>

              <div className="mt-8">
                <button
                  onClick={openFilePicker}
                  className="rounded-2xl border border-lime-400/45 bg-lime-400 px-6 py-4 text-base font-medium text-black transition hover:opacity-90"
                >
                  Choose Video
                </button>
              </div>

              <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">1. Upload</p>
                  <p className="mt-2 text-sm text-white/80">Open one video in the review space.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">2. Tag</p>
                  <p className="mt-2 text-sm text-white/80">
                    Follow the next true decision, not random buttons.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">3. Build</p>
                  <p className="mt-2 text-sm text-white/80">
                    Turn one possession into cards, branches, and history.
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_360px]">
            <section className="min-w-0">
              <div className="sticky top-0 z-20 overflow-hidden rounded-2xl border border-white/10 bg-[#050505]">
                <div className="relative bg-black">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls={false}
                    playsInline
                    className="h-[220px] w-full bg-black object-contain md:h-[260px]"
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

                  <div className="flex flex-wrap items-center gap-2">
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

                    <div className="ml-auto text-xs uppercase tracking-[0.22em] text-white/35">
                      One playhead
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-white/35">
                    {videoName ? `Loaded: ${videoName}` : "Video loaded"}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                      Current chain
                    </p>

                    <div className="mt-2 flex min-h-[52px] flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
                      {activeChain?.labels.length ? (
                        <>
                          {activeChain.labels.map((label, index) => (
                            <span
                              key={`${label}-${index}`}
                              className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-sm text-white/88"
                            >
                              {label}
                            </span>
                          ))}
                          <span className="text-sm text-white/35">→ ?</span>
                        </>
                      ) : (
                        <span className="text-sm text-white/50">Start → ?</span>
                      )}
                    </div>
                  </div>

                  <div className="w-full max-w-[240px] rounded-2xl border border-white/10 bg-black/40 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                      Smart read
                    </p>
                    <p className="mt-1 text-sm text-white/85">{activeRead}</p>
                    <p className="mt-2 text-[11px] text-white/35">
                      Node: <span className="text-white/65">{node}</span>
                    </p>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                    What happened next
                  </p>
                  <p className="text-xs text-white/35">
                    {activeChain ? `Depth ${activeChain.depth}` : "Depth 0"}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {suggestions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleTag(option.value)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${buttonTone(
                        option.tone
                      )}`}
                    >
                      <div className="text-sm font-medium">{option.title}</div>
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
                  <p className="text-xs text-white/35">{sortedChains.length} cards</p>
                </div>

                {sortedChains.length ? (
                  <div className="grid gap-3">
                    {sortedChains.map((chain, index) => (
                      <button
                        key={chain.id}
                        onClick={() => {
                          setActiveChainId(chain.id);
                          seekTo(chain.startSec);
                        }}
                        className={`rounded-2xl border p-4 text-left transition hover:border-white/25 ${
                          activeChainId === chain.id
                            ? "border-lime-400/50 bg-lime-400/[0.08]"
                            : "border-white/10 bg-black/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                              Possession {index + 1}
                              {chain.depth > 0 ? ` · Branch ${chain.depth}` : ""}
                            </p>
                            <p className="mt-2 text-sm text-white/90">
                              {chain.labels.join(" → ")}
                            </p>
                          </div>

                          <div className="text-right text-xs text-white/35">
                            <div>{formatTime(chain.startSec)}</div>
                            <div className="mt-1">{chain.closed ? "Closed" : "Open"}</div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70">
                          {summarizeChain(chain.labels)}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/35">No possession cards yet.</div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                    Event timeline
                  </p>
                  <p className="text-xs text-white/35">{events.length} events</p>
                </div>

                {events.length ? (
                  <div className="flex flex-wrap gap-2">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => seekTo(event.timeSec)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition hover:border-white/25 ${eventTone(
                          event.kind
                        )}`}
                      >
                        {formatTime(event.timeSec)} — {event.label}
                        {event.kind === "branch" ? " → branch" : ""}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/35">No events yet.</div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                    Possession tree
                  </p>
                  <p className="text-xs text-white/35">{chains.length} chains</p>
                </div>

                {chains.length ? renderTree(undefined) : <div className="text-sm text-white/35">No branches yet.</div>}
              </div>
            </section>

            <aside className="min-w-0">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">Session signal</p>

                <div className="mt-3 grid gap-2">
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Downhill: <span className="text-white">{counts.downhill}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Help: <span className="text-white">{counts.help}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    No Help: <span className="text-white">{counts.noHelp}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Pass: <span className="text-white">{counts.pass}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Kickout: <span className="text-white">{counts.kickout}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Make: <span className="text-white">{counts.make}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Miss: <span className="text-white">{counts.miss}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                    Turnover: <span className="text-white">{counts.turnover}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">System is live</p>

                <div className="mt-3 space-y-3 text-sm leading-6 text-white/78">
                  <p>Upload the file. Build the chain. Let the possession split when the game splits.</p>
                  <p>Cards make the review readable. Branches make it honest.</p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}