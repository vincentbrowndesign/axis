"use client";

import { useMemo, useRef, useState } from "react";

type RootAction = "catch" | "drive" | "pass" | "shot" | "turnover" | "reset";
type Lane = "left" | "middle" | "right";
type HelpState = "help" | "no-help";
type DriveOutcome = "finish" | "pass" | "pull-up" | "turnover" | "reset";
type ShotOutcome = "make" | "miss" | "blocked";

type EventType =
  | RootAction
  | "downhill"
  | Lane
  | HelpState
  | DriveOutcome
  | ShotOutcome;

type EventNode = {
  id: string;
  type: EventType;
  time: number;
  nextId: string | null;
};

type Possession = {
  id: string;
  startedAt: number;
  rootAction: RootAction;
  eventIds: string[];
  closed: boolean;
};

type PendingFlow =
  | {
      kind: "drive";
      possessionId: string;
      lastEventId: string;
      downhill?: boolean;
      lane?: Lane;
      help?: HelpState;
    }
  | {
      kind: "pass";
      possessionId: string;
      lastEventId: string;
      target?: Lane;
    }
  | {
      kind: "shot";
      possessionId: string;
      lastEventId: string;
    }
  | null;

type Props = {
  src: string;
};

function createId() {
  return crypto.randomUUID();
}

function formatTime(sec: number) {
  const safe = Number.isFinite(sec) ? Math.max(0, sec) : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function pretty(type: EventType) {
  const labels: Record<EventType, string> = {
    catch: "Catch",
    drive: "Drive",
    pass: "Pass",
    shot: "Shot",
    turnover: "Turnover",
    reset: "Reset",
    downhill: "Downhill",
    left: "Left",
    middle: "Middle",
    right: "Right",
    help: "Help",
    "no-help": "No Help",
    finish: "Finish",
    "pull-up": "Pull-up",
    make: "Make",
    miss: "Miss",
    blocked: "Blocked",
  };
  return labels[type];
}

function markerClass(type: EventType) {
  if (type === "shot" || type === "make" || type === "miss" || type === "blocked") {
    return "bg-sky-300 border-sky-100/50";
  }
  if (type === "pass") {
    return "bg-violet-300 border-violet-100/50";
  }
  if (
    type === "drive" ||
    type === "downhill" ||
    type === "left" ||
    type === "middle" ||
    type === "right" ||
    type === "finish" ||
    type === "pull-up"
  ) {
    return "bg-emerald-300 border-emerald-100/50";
  }
  if (type === "help" || type === "no-help") {
    return "bg-amber-300 border-amber-100/50";
  }
  if (type === "turnover") {
    return "bg-rose-300 border-rose-100/50";
  }
  return "bg-white/80 border-white/50";
}

function rootButtonClass(type: RootAction) {
  const base =
    "rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
  const map: Record<RootAction, string> = {
    catch: "border-white/12 bg-white/6 text-white/86 hover:bg-white/10",
    drive:
      "border-emerald-400/28 bg-emerald-400/14 text-emerald-100 hover:bg-emerald-400/20",
    pass:
      "border-violet-400/28 bg-violet-400/14 text-violet-100 hover:bg-violet-400/20",
    shot:
      "border-sky-400/28 bg-sky-400/14 text-sky-100 hover:bg-sky-400/20",
    turnover:
      "border-rose-400/28 bg-rose-400/14 text-rose-100 hover:bg-rose-400/20",
    reset: "border-white/12 bg-white/6 text-white/86 hover:bg-white/10",
  };
  return `${base} ${map[type]}`;
}

function contextButtonClass(kind: "neutral" | "green" | "purple" | "blue" | "yellow" | "red") {
  const base = "rounded-2xl border px-4 py-3 text-sm font-medium transition";
  const map = {
    neutral: "border-white/10 bg-white/6 text-white/85 hover:bg-white/10",
    green: "border-emerald-400/24 bg-emerald-400/12 text-emerald-100 hover:bg-emerald-400/18",
    purple: "border-violet-400/24 bg-violet-400/12 text-violet-100 hover:bg-violet-400/18",
    blue: "border-sky-400/24 bg-sky-400/12 text-sky-100 hover:bg-sky-400/18",
    yellow: "border-amber-400/24 bg-amber-400/12 text-amber-100 hover:bg-amber-400/18",
    red: "border-rose-400/24 bg-rose-400/12 text-rose-100 hover:bg-rose-400/18",
  };
  return `${base} ${map[kind]}`;
}

export default function AxisReviewEditor({ src }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [eventMap, setEventMap] = useState<Record<string, EventNode>>({});
  const [possessions, setPossessions] = useState<Possession[]>([]);
  const [pendingFlow, setPendingFlow] = useState<PendingFlow>(null);
  const [selectedPossessionId, setSelectedPossessionId] = useState<string | null>(null);

  const selectedPossession = useMemo(
    () => possessions.find((p) => p.id === selectedPossessionId) ?? null,
    [possessions, selectedPossessionId]
  );

  const selectedEvents = useMemo(() => {
    if (!selectedPossession) return [];
    return selectedPossession.eventIds
      .map((id) => eventMap[id])
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);
  }, [selectedPossession, eventMap]);

  const flowTitle = useMemo(() => {
    if (!pendingFlow) return "No active flow";
    if (pendingFlow.kind === "drive") {
      if (typeof pendingFlow.downhill === "undefined") return "Drive → downhill?";
      if (!pendingFlow.lane) return "Drive → lane?";
      if (!pendingFlow.help) return "Drive → help?";
      return "Drive → outcome?";
    }
    if (pendingFlow.kind === "pass") {
      if (!pendingFlow.target) return "Pass → target?";
      return "Pass → next action?";
    }
    return "Shot → result?";
  }, [pendingFlow]);

  function seekTo(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, duration || 0));
    setCurrentTime(video.currentTime);
  }

  function onTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    seekTo(pct * duration);
  }

  function addEvent(type: EventType, possessionId: string, attachToId?: string) {
    const id = createId();
    const newEvent: EventNode = {
      id,
      type,
      time: currentTime,
      nextId: null,
    };

    setEventMap((prev) => {
      const next = { ...prev, [id]: newEvent };

      if (attachToId && next[attachToId]) {
        next[attachToId] = {
          ...next[attachToId],
          nextId: id,
        };
      }

      return next;
    });

    setPossessions((prev) =>
      prev.map((pos) =>
        pos.id === possessionId
          ? { ...pos, eventIds: [...pos.eventIds, id] }
          : pos
      )
    );

    setSelectedPossessionId(possessionId);
    return id;
  }

  function startRootAction(type: RootAction) {
    const possessionId = createId();
    const rootEventId = createId();

    const rootEvent: EventNode = {
      id: rootEventId,
      type,
      time: currentTime,
      nextId: null,
    };

    const possession: Possession = {
      id: possessionId,
      startedAt: currentTime,
      rootAction: type,
      eventIds: [rootEventId],
      closed: type === "turnover" || type === "reset",
    };

    setEventMap((prev) => ({
      ...prev,
      [rootEventId]: rootEvent,
    }));

    setPossessions((prev) => [...prev, possession]);
    setSelectedPossessionId(possessionId);

    if (type === "drive") {
      setPendingFlow({
        kind: "drive",
        possessionId,
        lastEventId: rootEventId,
      });
    } else if (type === "pass") {
      setPendingFlow({
        kind: "pass",
        possessionId,
        lastEventId: rootEventId,
      });
    } else if (type === "shot") {
      setPendingFlow({
        kind: "shot",
        possessionId,
        lastEventId: rootEventId,
      });
    } else {
      setPendingFlow(null);
    }
  }

  function closePossession(possessionId: string) {
    setPossessions((prev) =>
      prev.map((p) => (p.id === possessionId ? { ...p, closed: true } : p))
    );
    setPendingFlow(null);
  }

  function handleDriveContext(value: "downhill" | Lane | HelpState | DriveOutcome) {
    if (!pendingFlow || pendingFlow.kind !== "drive") return;
    const { possessionId, lastEventId } = pendingFlow;

    if (value === "downhill") {
      const id = addEvent("downhill", possessionId, lastEventId);
      setPendingFlow({ ...pendingFlow, lastEventId: id, downhill: true });
      return;
    }

    if (value === "left" || value === "middle" || value === "right") {
      const id = addEvent(value, possessionId, lastEventId);
      setPendingFlow({ ...pendingFlow, lastEventId: id, lane: value });
      return;
    }

    if (value === "help" || value === "no-help") {
      const id = addEvent(value, possessionId, lastEventId);
      setPendingFlow({ ...pendingFlow, lastEventId: id, help: value });
      return;
    }

    const id = addEvent(value, possessionId, lastEventId);

    if (value === "pass") {
      setPendingFlow({
        kind: "pass",
        possessionId,
        lastEventId: id,
      });
      return;
    }

    if (value === "pull-up") {
      setPendingFlow({
        kind: "shot",
        possessionId,
        lastEventId: id,
      });
      return;
    }

    closePossession(possessionId);
  }

  function handlePassTarget(target: Lane) {
    if (!pendingFlow || pendingFlow.kind !== "pass") return;
    const { possessionId, lastEventId } = pendingFlow;
    const id = addEvent(target, possessionId, lastEventId);
    setPendingFlow({
      kind: "pass",
      possessionId,
      lastEventId: id,
      target,
    });
  }

  function continueFromPass(type: "drive" | "shot" | "turnover" | "reset") {
    if (!pendingFlow || pendingFlow.kind !== "pass") return;
    const { possessionId, lastEventId } = pendingFlow;
    const id = addEvent(type, possessionId, lastEventId);

    if (type === "drive") {
      setPendingFlow({
        kind: "drive",
        possessionId,
        lastEventId: id,
      });
      return;
    }

    if (type === "shot") {
      setPendingFlow({
        kind: "shot",
        possessionId,
        lastEventId: id,
      });
      return;
    }

    closePossession(possessionId);
  }

  function handleShotContext(result: ShotOutcome) {
    if (!pendingFlow || pendingFlow.kind !== "shot") return;
    const { possessionId, lastEventId } = pendingFlow;
    addEvent(result, possessionId, lastEventId);
    closePossession(possessionId);
  }

  function renderContext() {
    if (!pendingFlow) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
          Start with a root action.
        </div>
      );
    }

    if (pendingFlow.kind === "drive") {
      if (typeof pendingFlow.downhill === "undefined") {
        return (
          <div className="flex flex-wrap gap-2">
            <button className={contextButtonClass("green")} onClick={() => handleDriveContext("downhill")}>
              Downhill
            </button>
            <button className={contextButtonClass("neutral")} onClick={() => handleDriveContext("left")}>
              Skip to Left
            </button>
            <button className={contextButtonClass("neutral")} onClick={() => handleDriveContext("middle")}>
              Skip to Middle
            </button>
            <button className={contextButtonClass("neutral")} onClick={() => handleDriveContext("right")}>
              Skip to Right
            </button>
          </div>
        );
      }

      if (!pendingFlow.lane) {
        return (
          <div className="flex flex-wrap gap-2">
            <button className={contextButtonClass("neutral")} onClick={() => handleDriveContext("left")}>
              Left
            </button>
            <button className={contextButtonClass("neutral")} onClick={() => handleDriveContext("middle")}>
              Middle
            </button>
            <button className={contextButtonClass("neutral")} onClick={() => handleDriveContext("right")}>
              Right
            </button>
          </div>
        );
      }

      if (!pendingFlow.help) {
        return (
          <div className="flex flex-wrap gap-2">
            <button className={contextButtonClass("yellow")} onClick={() => handleDriveContext("help")}>
              Help
            </button>
            <button className={contextButtonClass("neutral")} onClick={() => handleDriveContext("no-help")}>
              No Help
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-wrap gap-2">
          <button className={contextButtonClass("green")} onClick={() => handleDriveContext("finish")}>
            Finish
          </button>
          <button className={contextButtonClass("purple")} onClick={() => handleDriveContext("pass")}>
            Pass
          </button>
          <button className={contextButtonClass("blue")} onClick={() => handleDriveContext("pull-up")}>
            Pull-up
          </button>
          <button className={contextButtonClass("red")} onClick={() => handleDriveContext("turnover")}>
            Turnover
          </button>
          <button className={contextButtonClass("neutral")} onClick={() => handleDriveContext("reset")}>
            Reset
          </button>
        </div>
      );
    }

    if (pendingFlow.kind === "pass") {
      if (!pendingFlow.target) {
        return (
          <div className="flex flex-wrap gap-2">
            <button className={contextButtonClass("neutral")} onClick={() => handlePassTarget("left")}>
              To Left
            </button>
            <button className={contextButtonClass("neutral")} onClick={() => handlePassTarget("middle")}>
              To Middle
            </button>
            <button className={contextButtonClass("neutral")} onClick={() => handlePassTarget("right")}>
              To Right
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-wrap gap-2">
          <button className={contextButtonClass("green")} onClick={() => continueFromPass("drive")}>
            Drive
          </button>
          <button className={contextButtonClass("blue")} onClick={() => continueFromPass("shot")}>
            Shot
          </button>
          <button className={contextButtonClass("red")} onClick={() => continueFromPass("turnover")}>
            Turnover
          </button>
          <button className={contextButtonClass("neutral")} onClick={() => continueFromPass("reset")}>
            Reset
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        <button className={contextButtonClass("green")} onClick={() => handleShotContext("make")}>
          Make
        </button>
        <button className={contextButtonClass("neutral")} onClick={() => handleShotContext("miss")}>
          Miss
        </button>
        <button className={contextButtonClass("red")} onClick={() => handleShotContext("blocked")}>
          Blocked
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-5">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#11161d] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="aspect-video w-full bg-black">
            <video
              ref={videoRef}
              src={src}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          </div>

          <div className="border-t border-white/8 bg-[#1b2129] px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-xs text-white/45">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div
              ref={timelineRef}
              onClick={onTimelineClick}
              className="relative h-16 cursor-pointer rounded-2xl border border-white/10 bg-[#242b34]"
            >
              <div className="absolute left-3 right-3 top-1/2 h-[2px] -translate-y-1/2 bg-white/12" />

              {Object.values(eventMap).map((event) => {
                const left = duration > 0 ? (event.time / duration) * 100 : 0;
                const selected = selectedEvents.some((e) => e.id === event.id);

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      seekTo(event.time);
                    }}
                    className={cx(
                      "absolute top-1/2 h-8 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border",
                      markerClass(event.type),
                      selected && "ring-2 ring-white/90 ring-offset-2 ring-offset-[#242b34]"
                    )}
                    style={{ left: `${left}%` }}
                    title={`${pretty(event.type)} • ${formatTime(event.time)}`}
                  />
                );
              })}

              <div
                className="absolute top-1/2 h-12 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-white shadow-[0_0_16px_rgba(255,255,255,0.35)]"
                style={{
                  left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                Root actions
              </div>

              <div className="flex flex-wrap gap-2">
                <button className={rootButtonClass("catch")} onClick={() => startRootAction("catch")}>
                  Catch
                </button>
                <button className={rootButtonClass("drive")} onClick={() => startRootAction("drive")}>
                  Drive
                </button>
                <button className={rootButtonClass("pass")} onClick={() => startRootAction("pass")}>
                  Pass
                </button>
                <button className={rootButtonClass("shot")} onClick={() => startRootAction("shot")}>
                  Shot
                </button>
                <button className={rootButtonClass("turnover")} onClick={() => startRootAction("turnover")}>
                  Turnover
                </button>
                <button className={rootButtonClass("reset")} onClick={() => startRootAction("reset")}>
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                {flowTitle}
              </div>
              {renderContext()}
            </div>
          </div>
        </div>
      </section>

      <aside className="rounded-[28px] border border-white/10 bg-[#242b34] p-5">
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
            Possession chain
          </div>
        </div>

        {!selectedPossession ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
            Start a possession to see the chain.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((event, i) => (
              <button
                key={event.id}
                type="button"
                onClick={() => seekTo(event.time)}
                className="w-full rounded-2xl border border-white/10 bg-[#11161d] px-3 py-3 text-left hover:bg-[#151b22]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-white">
                    {i + 1}. {pretty(event.type)}
                  </div>
                  <div className="text-xs text-white/45">{formatTime(event.time)}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          <div>Current time: {formatTime(currentTime)}</div>
          <div>Duration: {formatTime(duration)}</div>
          <div>Possessions: {possessions.length}</div>
          <div>Pending flow: {pendingFlow ? pendingFlow.kind : "none"}</div>
        </div>
      </aside>
    </div>
  );
}