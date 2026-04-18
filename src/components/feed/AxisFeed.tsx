"use client";

import { useMemo, useRef, useState } from "react";

export type FeedPossession = {
  id: string;
  playerName: string;
  sessionLabel: string;
  state: "advantage" | "neutral" | "breakdown";
  chain: string[];
  story: string;
  tags: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
};

export type FeedSession = {
  id: string;
  label: string;
  subtitle?: string;
  possessionCount: number;
  thumbnailUrl?: string;
};

type AxisFeedProps = {
  possessions: FeedPossession[];
  sessions: FeedSession[];
  activeSession?: {
    id: string;
    label: string;
    progressLabel: string;
  };
  onUpload?: () => void;
  onOpenResume?: (sessionId: string) => void;
  onOpenSession?: (sessionId: string) => void;
  onOpenPossession?: (possessionId: string) => void;
  onSavePossession?: (possessionId: string) => void;
  onSharePossession?: (possessionId: string) => void;
  onExportPossession?: (possessionId: string) => void;
  onReviewPossession?: (possessionId: string) => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function stateLabel(state: FeedPossession["state"]) {
  if (state === "advantage") return "ADVANTAGE";
  if (state === "breakdown") return "BREAKDOWN";
  return "NEUTRAL";
}

function stateClasses(state: FeedPossession["state"]) {
  if (state === "advantage") return "bg-lime-300 text-black";
  if (state === "breakdown") return "bg-white text-black";
  return "bg-white/10 text-white";
}

function FeedTopBar({ onUpload }: { onUpload?: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-[980px] items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/35">
            Axis
          </div>
        </div>

        <button
          type="button"
          onClick={onUpload}
          className="rounded-full bg-lime-300 px-4 py-2 text-sm font-medium text-black"
        >
          + Upload
        </button>
      </div>
    </header>
  );
}

function ResumeStrip({
  activeSession,
  onOpenResume,
}: {
  activeSession?: AxisFeedProps["activeSession"];
  onOpenResume?: (sessionId: string) => void;
}) {
  if (!activeSession) return null;

  return (
    <section className="mx-auto max-w-[980px] px-4 pt-4 sm:px-6">
      <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
        Continue
      </div>

      <button
        type="button"
        onClick={() => onOpenResume?.(activeSession.id)}
        className="flex w-full items-center justify-between rounded-[26px] border border-white/8 bg-white/[0.04] px-5 py-5 text-left transition hover:bg-white/[0.06]"
      >
        <div>
          <div className="text-sm text-white/45">{activeSession.progressLabel}</div>
          <div className="mt-1 text-xl font-semibold text-white">
            {activeSession.label}
          </div>
        </div>

        <div className="text-sm text-white/45">Open</div>
      </button>
    </section>
  );
}

function SessionRow({
  sessions,
  onOpenSession,
}: {
  sessions: FeedSession[];
  onOpenSession?: (sessionId: string) => void;
}) {
  return (
    <section className="mx-auto max-w-[980px] px-4 pt-6 sm:px-6">
      <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
        Sessions
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onOpenSession?.(session.id)}
            className="relative min-w-[220px] overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.06]"
          >
            {session.thumbnailUrl ? (
              <>
                <img
                  src={session.thumbnailUrl}
                  alt={session.label}
                  className="absolute inset-0 h-full w-full object-cover opacity-20"
                />
                <div className="absolute inset-0 bg-black/60" />
              </>
            ) : null}

            <div className="relative">
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                {session.possessionCount} possessions
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {session.label}
              </div>
              {session.subtitle ? (
                <div className="mt-1 text-sm text-white/55">{session.subtitle}</div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ActionRail({
  possessionId,
  onSavePossession,
  onSharePossession,
  onExportPossession,
  onReviewPossession,
}: {
  possessionId: string;
  onSavePossession?: (possessionId: string) => void;
  onSharePossession?: (possessionId: string) => void;
  onExportPossession?: (possessionId: string) => void;
  onReviewPossession?: (possessionId: string) => void;
}) {
  const actions = [
    { label: "Save", onClick: onSavePossession },
    { label: "Share", onClick: onSharePossession },
    { label: "Export", onClick: onExportPossession },
    { label: "Review", onClick: onReviewPossession },
  ];

  return (
    <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick?.(possessionId);
          }}
          className="rounded-full border border-white/12 bg-black/50 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white backdrop-blur-sm"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function PossessionMedia({
  possession,
}: {
  possession: FeedPossession;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function togglePlayback(e: React.MouseEvent) {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  if (possession.videoUrl) {
    return (
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          src={possession.videoUrl}
          muted
          playsInline
          loop
          preload="metadata"
          className="h-full w-full object-cover"
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
        <button
          type="button"
          onClick={togglePlayback}
          className="absolute inset-0 z-[1]"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        />
      </div>
    );
  }

  if (possession.thumbnailUrl) {
    return (
      <div className="absolute inset-0">
        <img
          src={possession.thumbnailUrl}
          alt={possession.story}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,242,100,0.14),transparent_30%)]" />
  );
}

function PossessionCard({
  possession,
  onOpenPossession,
  onSavePossession,
  onSharePossession,
  onExportPossession,
  onReviewPossession,
}: {
  possession: FeedPossession;
  onOpenPossession?: (possessionId: string) => void;
  onSavePossession?: (possessionId: string) => void;
  onSharePossession?: (possessionId: string) => void;
  onExportPossession?: (possessionId: string) => void;
  onReviewPossession?: (possessionId: string) => void;
}) {
  return (
    <article
      onClick={() => onOpenPossession?.(possession.id)}
      className="relative mx-auto h-[78vh] max-h-[900px] min-h-[620px] w-full max-w-[560px] cursor-pointer overflow-hidden rounded-[34px] border border-white/8 bg-black"
    >
      <PossessionMedia possession={possession} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-5">
        <div>
          <div className="text-sm font-medium text-white">
            {possession.playerName} • {possession.sessionLabel}
          </div>
        </div>

        <div
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium tracking-[0.2em]",
            stateClasses(possession.state)
          )}
        >
          {stateLabel(possession.state)}
        </div>
      </div>

      <ActionRail
        possessionId={possession.id}
        onSavePossession={onSavePossession}
        onSharePossession={onSharePossession}
        onExportPossession={onExportPossession}
        onReviewPossession={onReviewPossession}
      />

      <div className="absolute inset-x-0 bottom-0 z-10 p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {possession.chain.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/12 bg-black/45 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white backdrop-blur-sm"
            >
              {item}
            </span>
          ))}
        </div>

        <p className="max-w-[85%] text-[1.4rem] font-semibold leading-[1.1] text-white sm:text-[1.8rem]">
          {possession.story}
        </p>

        {possession.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {possession.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-30 border-t border-white/8 bg-black/85 backdrop-blur">
      <div className="mx-auto flex max-w-[980px] items-center justify-around px-4 py-3 text-sm text-white/65">
        <button type="button" className="rounded-full bg-white px-4 py-2 text-black">
          Feed
        </button>
        <button type="button" className="px-4 py-2">
          Sessions
        </button>
        <button type="button" className="px-4 py-2">
          Profile
        </button>
      </div>
    </nav>
  );
}

export default function AxisFeed({
  possessions,
  sessions,
  activeSession,
  onUpload,
  onOpenResume,
  onOpenSession,
  onOpenPossession,
  onSavePossession,
  onSharePossession,
  onExportPossession,
  onReviewPossession,
}: AxisFeedProps) {
  const visiblePossessions = useMemo(() => possessions, [possessions]);

  return (
    <main className="min-h-screen bg-black text-white">
      <FeedTopBar onUpload={onUpload} />
      <ResumeStrip activeSession={activeSession} onOpenResume={onOpenResume} />
      <SessionRow sessions={sessions} onOpenSession={onOpenSession} />

      <section className="mx-auto flex max-w-[980px] flex-col gap-6 px-4 pb-24 pt-6 sm:px-6">
        {visiblePossessions.length ? (
          visiblePossessions.map((possession) => (
            <PossessionCard
              key={possession.id}
              possession={possession}
              onOpenPossession={onOpenPossession}
              onSavePossession={onSavePossession}
              onSharePossession={onSharePossession}
              onExportPossession={onExportPossession}
              onReviewPossession={onReviewPossession}
            />
          ))
        ) : (
          <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-8 text-center text-white/55">
            No possessions yet.
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}