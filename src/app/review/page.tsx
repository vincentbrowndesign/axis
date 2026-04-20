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
  branchFromEventId?: string;
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

const DEMO_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

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

function chainText(labels: string[]) {
  return labels.length ? `${labels.join(" → ")} → ?` : "Start → ?";
}

function finalChainText(labels: string[]) {
  return labels.length ? labels.join(" → ") : "Empty chain";
}

function cardTone(kind: EventKind) {
  if (kind === "outcome") return "border-white/20 bg-white/[0.07] text-white";
  if (kind === "branch") return "border-lime-400/30 bg-lime-400/[0.08] text-lime-100";
  if (kind === "deadball") return "border-white/10 bg-white/[0.04] text-white/80";
  return "border-white/10 bg-white/[0.04] text-white/85";
}

function buttonTone(tone?: "primary" | "normal") {
  if (tone === "primary") {
    return "border-lime-400/45 bg-lime-400/[0.14] text-lime-100 hover:border-lime-300/70 hover:bg-lime-400/[0.2]";
  }

  return "border-white/10 bg-black text-white/88 hover:border-white/25 hover:bg-white/[0.04]";
}

function deriveRead(node: NodeId, labels: string[]) {
  if (!labels.length) return "What started it?";
  if (node === "action") return "What happened next?";
  if (node === "lane") return "Which lane opened?";
  if (node === "help") return "Where’s the help?";
  if (node === "afterHelp") return "What did the pressure force?";
  if (node === "finishType") return "How did he try to finish?";
  if (node === "outcome") return "Did it work?";
  if (node === "branchStart") return "New branch. What happened off the pass?";
  return "Keep the chain honest.";
}

export default function ReviewPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [videoUrl] = useState<string>(DEMO_VIDEO);
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

  const progressPct = durationSec > 0 ? (currentSec / durationSec) * 100 : 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => setDurationSec(video.duration || 0);
    const onTimeUpdate = () => setCurrentSec(video.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

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

  const activeRead = deriveRead(node, activeChain?.labels ?? []);

  const orderedChains = useMemo(() => {
    return [...chains].sort((a, b) => a.startSec - b.startSec);
  }, [chains]);

  const groupedTree = useMemo(() => {
    const map = new Map<string | undefined, ChainSummary[]>();

    for (const chain of orderedChains) {
      const key = chain.parentChainId;
      const group = map.get(key) ?? [];
      group.push(chain);
      map.set(key, group);
    }

    return map;
  }, [orderedChains]);

  function playPause() {
    const video = videoRef.current;
    if (!video) return;

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
    if (!video) return;
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

  function appendToChain(
    label: string,
    kind: EventKind,
    options?: { branchFromEventId?: string }
  ) {
    const chainId = ensureActiveChain();
    const chain = chains.find((item) => item.id === chainId);
    const depth = chain?.depth ?? 0;

    const newEvent: TimelineEvent = {
      id: uid(),
      timeSec: currentSec,
      label,
      chainId,
      depth,
      branchFromEventId: options?.branchFromEventId,
      kind,
    };

    setEvents((prev) => [...prev, newEvent]);
    updateChain(chainId, (current) => ({
      ...current,
      labels: [...current.labels, label],
    }));

    return newEvent;
  }

  function closeChain(chainId: string) {
    updateChain(chainId, (chain) => ({
      ...chain,
      endSec: currentSec,
      closed: true,
    }));
  }

  function resetReviewFlow() {
    setActiveChainId(null);
    setNode("start");
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

  function handleTag(value: string) {
    if (node === "start") {
      ensureActiveChain();
      appendToChain(value, "chain");
      setNode("action");
      return;
    }

    if (node === "branchStart") {
      appendToChain(value, "branch");

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
        if (activeChainId) closeChain(activeChainId);
        resetReviewFlow();
      }

      return;
    }

    if (node === "action") {
      appendToChain(value, value === "Pass" ? "branch" : value === "Turnover" ? "deadball" : "chain");

      if (value === "Downhill") {
        setNode("lane");
        return;
      }

      if (value === "Shot") {
        setNode("outcome");
        return;
      }

      if (value === "Pass") {
        const latestEvent = events[events.length - 1];
        const chainId = activeChainId;
        if (chainId && latestEvent) {
          closeChain(chainId);
          startBranch(chainId, latestEvent.id);
        }
        return;
      }

      if (value === "Turnover") {
        if (activeChainId) closeChain(activeChainId);
        resetReviewFlow();
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
        return;
      }

      setNode("finishType");
      return;
    }

    if (node === "afterHelp") {
      appendToChain(value, value === "Pass" ? "branch" : value === "Reset" ? "deadball" : "chain");

      if (value === "Finish") {
        setNode("finishType");
        return;
      }

      if (value === "Reset") {
        if (activeChainId) closeChain(activeChainId);
        resetReviewFlow();
        return;
      }

      if (value === "Pass") {
        const latestEvent = events[events.length - 1];
        const chainId = activeChainId;
        if (chainId && latestEvent) {
          closeChain(chainId);
          startBranch(chainId, latestEvent.id);
        }
      }

      return;
    }

    if (node === "finishType") {
      appendToChain(value, value === "Kickout" ? "branch" : "chain");

      if (value === "Kickout") {
        const latestEvent = events[events.length - 1];
        const chainId = activeChainId;
        if (chainId && latestEvent) {
          closeChain(chainId);
          startBranch(chainId, latestEvent.id);
        }
        return;
      }

      setNode("outcome");
      return;
    }

    if (node === "outcome") {
      appendToChain(value, "outcome");
      if (activeChainId) closeChain(activeChainId);
      resetReviewFlow();
    }
  }

  function undoLast() {
    if (!events.length) return;

    const nextEvents = events.slice(0, -1);
    setEvents(nextEvents);

    const rebuiltChains = new Map<string, ChainSummary>();

    for (const chain of chains) {
      rebuiltChains.set(chain.id, {
        ...chain,
        labels: [],
        closed: false,
        endSec: undefined,
      });
    }

    for (const event of nextEvents) {
      const chain = rebuiltChains.get(event.chainId);
      if (!chain) continue;
      chain.labels.push(event.label);
    }

    for (const chain of rebuiltChains.values()) {
      const chainEvents = nextEvents.filter((event) => event.chainId === chain.id);
      if (chainEvents.length) {
        chain.startSec = chainEvents[0].timeSec;
      }
    }

    const existingChainIds = new Set(nextEvents.map((event) => event.chainId));
    const nextChains = Array.from(rebuiltChains.values()).filter(
      (chain) => existingChainIds.has(chain.id) || chain.labels.length
    );

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

    if (!currentChain) {
      setNode("start");
      return;
    }

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
      durationSec,
      chains,
      events,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "axis-branch-review.json";
    a.click();
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
              style={{ marginLeft: `${chain.depth * 20}px` }}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">
                  {chain.depth === 0 ? "Primary chain" : `Branch ${chain.depth}`}
                </div>
                <div className="text-xs text-white/35">{formatTime(chain.startSec)}</div>
              </div>

              <div className="text-sm text-white/90">{finalChainText(chain.labels)}</div>

              <div className="mt-2 text-xs text-white/35">
                {chain.closed ? "Closed" : "Open"} · {chain.labels.length} steps
              </div>
            </button>

            {renderTree(chain.id)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Axis</p>
            <h1 className="text-lg font-semibold tracking-tight">Review</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportReview}
              className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/80 transition hover:border-white/25"
            >
              Export
            </button>
            <button
              onClick={() => {
                setEvents([]);
                setChains([]);
                setActiveChainId(null);
                setNode("start");
              }}
              className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/80 transition hover:border-white/25"
            >
              New Clip
            </button>
          </div>
        </header>

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

                <div className="mb-3">
                  <input
                    type="range"
                    min={0}
                    max={durationSec || 0}
                    step={0.01}
                    value={currentSec}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
                  />
                  <div
                    className="pointer-events-none -mt-2 h-2 rounded-full bg-white"
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
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                    Current chain
                  </p>

                  <div className="mt-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white/88">
                    {activeChain ? chainText(activeChain.labels) : "Start → ?"}
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
                  Next decision
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
                  Event timeline
                </p>
                <p className="text-xs text-white/35">{events.length} events</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {events.length ? (
                  events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => seekTo(event.timeSec)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition hover:border-white/25 ${cardTone(
                        event.kind
                      )}`}
                    >
                      {formatTime(event.timeSec)} · {event.label}
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-white/35">No events yet.</div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                  Possession tree
                </p>
                <p className="text-xs text-white/35">{chains.length} chains</p>
              </div>

              {chains.length ? (
                renderTree(undefined)
              ) : (
                <div className="text-sm text-white/35">No branches yet.</div>
              )}
            </div>
          </section>

          <aside className="min-w-0">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                What changed
              </p>

              <div className="mt-3 space-y-3 text-sm leading-6 text-white/78">
                <p>
                  Pass and kickout no longer kill the thought. They close the current chain and
                  spawn a new branch.
                </p>
                <p>
                  That means one possession can now become a tree instead of one flat log.
                </p>
                <p>
                  This is much closer to how basketball actually unfolds.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                Next layer
              </p>

              <div className="mt-3 space-y-2 text-sm text-white/78">
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  Possession cards with auto summaries
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  Team and player attribution
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  Filters by help, lane, finish, outcome
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  Clip export per chain
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}