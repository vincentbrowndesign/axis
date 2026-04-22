"use client";

type Props = {
  playbackId?: string;
  title?: string;
  className?: string;
};

export default function MuxVideoPlayer({
  playbackId,
  title = "Video",
  className = "",
}: Props) {
  return (
    <div
      className={`flex min-h-[240px] items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-sm text-white/60 ${className}`}
    >
      {playbackId ? `Mux disabled temporarily: ${title}` : "Mux player disabled temporarily"}
    </div>
  );
}