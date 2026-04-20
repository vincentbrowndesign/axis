"use client";

import MuxPlayer from "@mux/mux-player-react";

type Props = {
  playbackId: string;
  title?: string;
};

export default function MuxVideoPlayer({ playbackId, title }: Props) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
      <MuxPlayer
        playbackId={playbackId}
        streamType="on-demand"
        metadata={{
          video_title: title ?? "Axis Upload",
        }}
      />
    </div>
  );
}