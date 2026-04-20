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
  if (!lastAction) {
    return ["Downhill", "Pass", "Shot", "Reset", "Turnover"];
  }

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

    case "Make":
    case "Miss":
    case "Turnover":
    case "Foul":
    case "Reset":
      return [];

    default:
      return [];
  }
}

function classifyPossession(nodes: ChainNode[]) {
  const actions = nodes.map((node) => node.action);
  const has = (action: ActionType) => actions.includes(action);

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

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [currentChain, setCurrentChain] = useState<ChainNode[]>([]);
  const [completedPossessions, setCompletedPossessions] = useState<CompletedPossession[]>([]);
  const [selectedPossessionId, setSelectedPossessionId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [justAutoFinishedId, setJustAutoFinishedId] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => setDuration(video.duration || 0);
    const onTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [videoUrl]);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  const lastAction = currentChain.length ? currentChain[currentChain.length - 1].action : null;
  const nextActions = getNextActions(lastAction);

  const selectedPossession = useMemo(() => {
    return completedPossessions.find((p) => p.id === selectedPossessionId) ?? null;
  }, [completedPossessions, selectedPossessionId]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function handleSeek(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  }

  function skipBy(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = next;
    setCurrentTime(next);
  }

  function jumpToTime(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }

  function saveCompletedPossession(nodes: ChainNode[]) {
    if (!nodes.length) return;

    const newPossession: CompletedPossession = {
      id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nodes,
      note: "",
    };

    setCompletedPossessions((prev) => [newPossession, ...prev]);
    setSelectedPossessionId(newPossession.id);
    setNoteDraft("");
    return newPossession.id;
  }

  function addAction(action: ActionType) {
    const node: ChainNode = {
      id: `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      time: currentTime,
    };

    setCurrentChain((prev) => {
      const nextChain = [...prev, node];

      if (END_ACTIONS.includes(action)) {
        const newId = saveCompletedPossession(nextChain);
        setJustAutoFinishedId(newId ?? null);
        return [];
      }

      setJustAutoFinishedId(null);
      return nextChain;
    });
  }

  function undoLastAction() {
    setCurrentChain((prev) => prev.slice(0, -1));
    setJustAutoFinishedId(null);
  }

  function clearCurrentChain() {
    setCurrentChain([]);
    setJustAutoFinishedId(null);
  }

  function finishPossession() {
    if (!currentChain.length) return;
    saveCompletedPossession(currentChain);
    setCurrentChain([]);
    setJustAutoFinishedId(null);
  }

  function selectPossession(possession: CompletedPossession) {
    setSelectedPossessionId(possession.id);
    setNoteDraft(possession.note);

    if (possession.nodes.length) {
      jumpToTime(possession.nodes[0].time);
    }
  }

  function savePossessionNote() {
    if (!selectedPossessionId) return;

    setCompletedPossessions((prev) =>
      prev.map((possession) =>
        possession.id === selectedPossessionId
          ? {
              ...possession,
              note: noteDraft,
            }
          : possession
      )
    );
  }

  function deleteSelectedPossession() {
    if (!selectedPossessionId) return;

    setCompletedPossessions((prev) =>
      prev.filter((possession) => possession.id !== selectedPossessionId)
    );
    setSelectedPossessionId(null);
    setNoteDraft("");
  }

  function exportSession() {
    const payload = {
      exportedAt: new Date().toISOString(),
      duration,
      completedPossessions: completedPossessions.map((possession) => ({
        ...possession,
        classification: classifyPossession(possession.nodes),
      })),
    };

    downloadText("axis-possession-export.json", JSON.stringify(payload, null, 2));
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="block h-auto max-h-[34vh] w-full object-contain bg-black"
                playsInline
                preload="metadata"
                controls
              />
            </div>
          </div>

          <div className="sticky top-[73px] z-30 space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between text-sm text-neutral-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.01}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full"
              />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => skipBy(-5)}
                  className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
                >
                  -5s
                </button>

                <button
                  onClick={togglePlay}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>

                <button
                  onClick={() => skipBy(5)}
                  className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
                >
                  +5s
                </button>

                <button
                  onClick={exportSession}
                  className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900"
                >
                  Export
                </button>
              </div>

              <div className="mt-3 text-xs text-neutral-500">
                Progress: {progress.toFixed(1)}%
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-white">Current possession</div>

                <div className="flex gap-2">
                  <button
                    onClick={undoLastAction}
                    disabled={!currentChain.length}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-xs hover:bg-neutral-900 disabled:opacity-40"
                  >
                    Undo
                  </button>

                  <button
                    onClick={clearCurrentChain}
                    disabled={!currentChain.length}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-xs hover:bg-neutral-900 disabled:opacity-40"
                  >
                    Clear
                  </button>

                  <button
                    onClick={finishPossession}
                    disabled={!currentChain.length}
                    className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-40"
                  >
                    Finish
                  </button>
                </div>
              </div>

              {currentChain.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-800 p-4 text-sm text-neutral-500">
                  Start one possession. First tap starts the chain.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentChain.map((node, index) => (
                    <button
                      key={node.id}
                      onClick={() => jumpToTime(node.time)}
                      className={`rounded-full border px-3 py-2 text-sm ${ACTION_STYLES[node.action]}`}
                    >
                      {index + 1}. {node.action} · {formatTime(node.time)}
                    </button>
                  ))}
                </div>
              )}

              {justAutoFinishedId && currentChain.length === 0 && (
                <div className="mt-3 text-xs text-lime-300">
                  Possession auto-finished on terminal event.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-3 text-sm font-medium text-white">
                {lastAction ? `Next after ${lastAction}` : "Start possession"}
              </div>

              <div className="flex flex-wrap gap-2">
                {nextActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => addAction(action)}
                    className={`rounded-lg border px-3 py-2 text-sm ${ACTION_STYLES[action]}`}
                  >
                    {action}
                  </button>
                ))}
              </div>

              <div className="mt-3 text-xs text-neutral-500">
                Terminal actions auto-save and reset the chain.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-white">Completed possessions</div>
              <div className="text-xs text-neutral-500">{completedPossessions.length} saved</div>
            </div>

            {completedPossessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 p-4 text-sm text-neutral-500">
                No finished possessions yet.
              </div>
            ) : (
              <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                {completedPossessions.map((possession, index) => {
                  const isSelected = possession.id === selectedPossessionId;
                  const classification = classifyPossession(possession.nodes);

                  return (
                    <button
                      key={possession.id}
                      onClick={() => selectPossession(possession)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-white bg-neutral-900"
                          : "border-neutral-800 bg-black hover:bg-neutral-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-white">
                          Possession {completedPossessions.length - index}
                        </div>
                        <div className="text-xs text-lime-300">{classification}</div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {possession.nodes.map((node) => (
                          <span
                            key={node.id}
                            className={`rounded-full border px-2 py-1 text-xs ${ACTION_STYLES[node.action]}`}
                          >
                            {node.action}
                          </span>
                        ))}
                      </div>

                      {possession.note ? (
                        <div className="mt-2 text-sm text-neutral-300">{possession.note}</div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="mb-3 text-sm font-medium text-white">Selected possession</div>

            {selectedPossession ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-neutral-800 bg-black p-3">
                  <div className="text-sm text-lime-300">
                    {classifyPossession(selectedPossession.nodes)}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedPossession.nodes.map((node, index) => (
                      <button
                        key={node.id}
                        onClick={() => jumpToTime(node.time)}
                        className={`rounded-full border px-2 py-1 text-xs ${ACTION_STYLES[node.action]}`}
                      >
                        {index + 1}. {node.action} · {formatTime(node.time)}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add note..."
                  rows={6}
                  className="w-full rounded-xl border border-neutral-800 bg-black p-3 text-sm text-white outline-none placeholder:text-neutral-600"
                />

                <div className="flex gap-2">
                  <button
                    onClick={savePossessionNote}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
                  >
                    Save Note
                  </button>

                  <button
                    onClick={deleteSelectedPossession}
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900"
                  >
                    Delete Possession
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-800 p-4 text-sm text-neutral-500">
                Select a finished possession to review it.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}