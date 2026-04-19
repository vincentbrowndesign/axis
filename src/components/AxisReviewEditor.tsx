"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ActionType,
  DraftPossession,
  InferredRead,
  SavedPossession,
  VideoState,
  YesNo,
} from "@/lib/review-types";

const EMPTY_DRAFT: DraftPossession = {
  start: null,
  end: null,
  downhill: null,
  action: null,
  help: null,
};

export default function AxisReviewEditor() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [video, setVideo] = useState<VideoState | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [draft, setDraft] = useState<DraftPossession>(EMPTY_DRAFT);
  const [possessions, setPossessions] = useState<SavedPossession[]>([]);

  useEffect(() => {
    return () => {
      if (video?.url) URL.revokeObjectURL(video.url);
    };
  }, [video]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please choose a video file.");
      event.target.value = "";
      return;
    }

    if (video?.url) URL.revokeObjectURL(video.url);

    const url = URL.createObjectURL(file);

    setVideo({
      file,
      url,
      name: file.name,
      type: file.type,
      size: file.size,
    });

    setCurrentTime(0);
    setDuration(0);
    setStatus("loading");
    setErrorMessage("");
    setDraft(EMPTY_DRAFT);
    setPossessions([]);
    event.target.value = "";
  }

  function resetVideo() {
    if (video?.url) URL.revokeObjectURL(video.url);
    setVideo(null);
    setCurrentTime(0);
    setDuration(0);
    setStatus("idle");
    setErrorMessage("");
    setDraft(EMPTY_DRAFT);
    setPossessions([]);
  }

  function jumpTo(time: number) {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }

  function markStart() {
    setDraft((prev) => ({ ...prev, start: currentTime }));
  }

  function markEnd() {
    setDraft((prev) => ({ ...prev, end: currentTime }));
  }

  function setDownhill(value: Exclude<YesNo, null>) {
    setDraft((prev) => ({ ...prev, downhill: value }));
  }

  function setAction(value: Exclude<ActionType, null>) {
    setDraft((prev) => ({ ...prev, action: value }));
  }

  function setHelp(value: Exclude<YesNo, null>) {
    setDraft((prev) => ({ ...prev, help: value }));
  }

  function undoDraft() {
    setDraft(EMPTY_DRAFT);
  }

  function deletePossession(id: string) {
    setPossessions((prev) => prev.filter((item) => item.id !== id));
  }

  function savePossession() {
    if (!isDraftComplete(draft)) {
      alert("Add start, end, downhill, action, and help first.");
      return;
    }

    if (draft.end <= draft.start) {
      alert("End must be after start.");
      return;
    }

    const inference = inferRead(draft.downhill, draft.action, draft.help);

    const newPossession: SavedPossession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      start: draft.start,
      end: draft.end,
      downhill: draft.downhill,
      action: draft.action,
      help: draft.help,
      inference,
    };

    setPossessions((prev) => [...prev, newPossession]);
    setDraft(EMPTY_DRAFT);
  }

  const currentInference = useMemo(() => {
    if (!draft.downhill || !draft.action || !draft.help) return null;
    return inferRead(draft.downhill, draft.action, draft.help);
  }, [draft.downhill, draft.action, draft.help]);

  const canSaveDraft = isDraftComplete(draft) && draft.end > draft.start;

  const startLabel = formatTimeOrDash(draft.start);
  const endLabel = formatTimeOrDash(draft.end);

  const flowMessage = getFlowMessage(draft);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!video ? (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/5 p-8">
            <div className="text-xs uppercase tracking-[0.24em] text-white/40">
              Axis Review
            </div>
            <h1 className="mt-3 text-3xl font-semibold">Upload video</h1>
            <p className="mt-2 text-sm text-white/55">
              Tag possessions using Downhill → Action → Help.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full bg-lime-400 px-5 py-3 text-sm font-medium text-black"
              >
                Select video
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetVideo}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
            >
              Back
            </button>

            <div className="min-w-0 flex-1 text-center text-sm text-white/60">
              <div className="truncate">{video.name}</div>
            </div>

            <button
              type="button"
              onClick={savePossession}
              disabled={!canSaveDraft}
              className="rounded-full px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
              style={{
                backgroundColor: canSaveDraft ? "#a3ff12" : undefined,
              }}
            >
              Save
            </button>
          </div>

          <div className="grid flex-1 gap-5 lg:grid-cols-[1.45fr_0.55fr]">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black">
                <video
                  ref={videoRef}
                  src={video.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full bg-black"
                  onLoadedMetadata={(event) => {
                    setDuration(event.currentTarget.duration || 0);
                    setStatus("ready");
                    setErrorMessage("");
                  }}
                  onLoadedData={() => {
                    setStatus("ready");
                  }}
                  onTimeUpdate={(event) => {
                    setCurrentTime(event.currentTarget.currentTime || 0);
                  }}
                  onError={() => {
                    setStatus("error");
                    setErrorMessage(
                      "This file was selected, but the browser could not load or decode it."
                    );
                  }}
                />
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm text-white/55">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.01}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => {
                    jumpTo(Number(event.target.value));
                  }}
                  className="w-full"
                />
              </div>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                    Flow
                  </div>
                  <div className="text-sm text-white/50">{flowMessage}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={markStart}
                    className="rounded-full bg-lime-400 px-4 py-2 text-sm font-medium text-black"
                  >
                    Mark Start
                  </button>
                  <button
                    type="button"
                    onClick={markEnd}
                    className="rounded-full bg-lime-400 px-4 py-2 text-sm font-medium text-black"
                  >
                    Mark End
                  </button>
                  <button
                    type="button"
                    onClick={undoDraft}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
                  >
                    Undo
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <InfoTile label="Start" value={startLabel} />
                  <InfoTile label="End" value={endLabel} />
                </div>
              </div>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                  1. Downhill
                </div>
                <p className="mt-2 text-sm text-white/50">
                  Did the player beat their defender and create pressure?
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <ChoiceButton
                    label="YES"
                    active={draft.downhill === "YES"}
                    onClick={() => setDownhill("YES")}
                  />
                  <ChoiceButton
                    label="NO"
                    active={draft.downhill === "NO"}
                    onClick={() => setDownhill("NO")}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                  2. Action
                </div>
                <p className="mt-2 text-sm text-white/50">
                  What did the player do?
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <ChoiceButton
                    label="DRIVE"
                    active={draft.action === "DRIVE"}
                    onClick={() => setAction("DRIVE")}
                  />
                  <ChoiceButton
                    label="PASS"
                    active={draft.action === "PASS"}
                    onClick={() => setAction("PASS")}
                  />
                  <ChoiceButton
                    label="SHOT"
                    active={draft.action === "SHOT"}
                    onClick={() => setAction("SHOT")}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                  3. Help
                </div>
                <p className="mt-2 text-sm text-white/50">
                  Did the defense react with help?
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <ChoiceButton
                    label="YES"
                    active={draft.help === "YES"}
                    onClick={() => setHelp("YES")}
                  />
                  <ChoiceButton
                    label="NO"
                    active={draft.help === "NO"}
                    onClick={() => setHelp("NO")}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                    Inferred Read
                  </div>
                  <div className="text-sm text-white/45">
                    {currentInference ? currentInference.confidence : "—"}
                  </div>
                </div>

                {!currentInference ? (
                  <div className="mt-4 text-sm text-white/55">
                    Complete Downhill, Action, and Help to generate the read.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    <InferenceTile label="Saw" value={currentInference.saw} />
                    <InferenceTile
                      label="Should"
                      value={currentInference.should}
                    />
                    <InferenceTile label="Next" value={currentInference.next} />
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                    Possessions
                  </div>
                  <div className="text-sm text-white/45">{possessions.length}</div>
                </div>

                {possessions.length === 0 ? (
                  <div className="mt-4 text-sm text-white/55">
                    No possessions saved yet.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {possessions.map((possession, index) => (
                      <div
                        key={possession.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => jumpTo(possession.start)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="text-sm text-white/85">
                              Possession {index + 1}
                            </div>
                            <div className="mt-1 text-sm text-white/50">
                              {formatTime(possession.start)} →{" "}
                              {formatTime(possession.end)}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55">
                              <span>{possession.downhill}</span>
                              <span>•</span>
                              <span>{possession.action}</span>
                              <span>•</span>
                              <span>{possession.help}</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => deletePossession(possession.id)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                          >
                            Delete
                          </button>
                        </div>

                        <div className="mt-3 grid gap-2">
                          <MiniInferenceRow
                            label="Saw"
                            value={possession.inference.saw}
                          />
                          <MiniInferenceRow
                            label="Should"
                            value={possession.inference.should}
                          />
                          <MiniInferenceRow
                            label="Next"
                            value={possession.inference.next}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <aside className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                Debug
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <InfoRow label="Status" value={status} />
                <InfoRow label="Name" value={video.name} />
                <InfoRow label="Type" value={video.type || "Unknown"} />
                <InfoRow label="Size" value={formatBytes(video.size)} />
                <InfoRow label="Duration" value={formatTime(duration)} />
                <InfoRow label="Current" value={formatTime(currentTime)} />
                <InfoRow label="Downhill" value={draft.downhill ?? "—"} />
                <InfoRow label="Action" value={draft.action ?? "—"} />
                <InfoRow label="Help" value={draft.help ?? "—"} />
              </div>

              {errorMessage ? (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}

function isDraftComplete(
  draft: DraftPossession
): draft is {
  start: number;
  end: number;
  downhill: Exclude<YesNo, null>;
  action: Exclude<ActionType, null>;
  help: Exclude<YesNo, null>;
} {
  return (
    draft.start !== null &&
    draft.end !== null &&
    draft.downhill !== null &&
    draft.action !== null &&
    draft.help !== null
  );
}

function getFlowMessage(draft: DraftPossession) {
  if (draft.start === null) return "Mark start";
  if (draft.end === null) return "Mark end";
  if (draft.downhill === null) return "Choose downhill";
  if (draft.action === null) return "Choose action";
  if (draft.help === null) return "Choose help";
  return "Ready to save";
}

function inferRead(
  downhill: Exclude<YesNo, null>,
  action: Exclude<ActionType, null>,
  help: Exclude<YesNo, null>
): InferredRead {
  if (downhill === "NO" && action === "SHOT" && help === "NO") {
    return {
      saw: "Defender stayed in front and no real advantage was created.",
      should: "Create pressure first or move the ball before taking the shot.",
      next: "Likely tough or low-quality attempt.",
      confidence: "HIGH",
    };
  }

  if (downhill === "YES" && action === "PASS" && help === "YES") {
    return {
      saw: "The ball handler got downhill and the defense collapsed.",
      should: "Kick out or find the open teammate created by help.",
      next: "Open catch, rotation scramble, or advantage extension.",
      confidence: "VERY HIGH",
    };
  }

  if (downhill === "YES" && action === "SHOT" && help === "YES") {
    return {
      saw: "Pressure was created, but help met the shot at the rim or lane.",
      should: "Finish through length only if the window is still real; otherwise read the pass.",
      next: "Contested finish or blocked angle.",
      confidence: "HIGH",
    };
  }

  if (downhill === "YES" && action === "SHOT" && help === "NO") {
    return {
      saw: "The defender was beaten and no help rotation arrived.",
      should: "Finish strong. This is the scoring window.",
      next: "High-percentage shot or layup opportunity.",
      confidence: "VERY HIGH",
    };
  }

  if (downhill === "YES" && action === "DRIVE" && help === "YES") {
    return {
      saw: "The player stayed aggressive downhill even after help showed.",
      should: "Read whether the second defender fully committed or whether the finish lane still exists.",
      next: "Contested finish, dump-off, or kickout decision.",
      confidence: "MEDIUM",
    };
  }

  if (downhill === "YES" && action === "DRIVE" && help === "NO") {
    return {
      saw: "The player beat the matchup and kept attacking with no extra defender showing.",
      should: "Continue the attack and finish before the defense recovers.",
      next: "Clean finish window.",
      confidence: "HIGH",
    };
  }

  if (downhill === "NO" && action === "PASS" && help === "NO") {
    return {
      saw: "No advantage was created, so the ball moved without forcing rotation.",
      should: "Use the pass to improve the angle or shift the defense.",
      next: "Reset, swing, or new action.",
      confidence: "MEDIUM",
    };
  }

  if (downhill === "NO" && action === "PASS" && help === "YES") {
    return {
      saw: "The pass triggered a defensive reaction even without clear downhill pressure.",
      should: "Look for the next closeout or shifted defender.",
      next: "Secondary advantage may develop.",
      confidence: "LOW",
    };
  }

  if (downhill === "NO" && action === "DRIVE" && help === "NO") {
    return {
      saw: "The player drove without truly beating the defender.",
      should: "Shift the matchup better before committing downhill.",
      next: "Crowded lane or forced continuation.",
      confidence: "MEDIUM",
    };
  }

  if (downhill === "NO" && action === "DRIVE" && help === "YES") {
    return {
      saw: "The attack drew multiple defenders without a clean first advantage.",
      should: "Recognize early resistance and move the ball sooner.",
      next: "Traffic, pickup, or late pass.",
      confidence: "MEDIUM",
    };
  }

  if (downhill === "NO" && action === "SHOT" && help === "YES") {
    return {
      saw: "The shot went up without advantage and into extra defensive pressure.",
      should: "Avoid shooting into stacked defense unless the clock forces it.",
      next: "Heavily contested attempt.",
      confidence: "HIGH",
    };
  }

  return {
    saw: "The possession created a readable offensive-defensive exchange.",
    should: "Confirm whether the response matched the defensive reaction.",
    next: "Use the next action to judge decision quality.",
    confidence: "LOW",
  };
}

function ChoiceButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-4 py-2 text-sm transition"
      style={{
        backgroundColor: active ? "#a3ff12" : "rgba(255,255,255,0.05)",
        color: active ? "#000" : "rgba(255,255,255,0.85)",
        border: active
          ? "1px solid transparent"
          : "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {label}
    </button>
  );
}

function InferenceTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 text-sm leading-6 text-white/82">{value}</div>
    </div>
  );
}

function MiniInferenceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-1 text-xs leading-5 text-white/75">{value}</div>
    </div>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 text-sm text-white/85">{value}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-white/40">{label}</div>
      <div className="mt-1 break-all text-white/80">{value}</div>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatTimeOrDash(value: number | null) {
  return value === null ? "—" : formatTime(value);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}