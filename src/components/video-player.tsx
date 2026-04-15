"use client";

type VideoPlayerProps = {
  url: string;
};

export default function VideoPlayer({ url }: VideoPlayerProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[28px] bg-black">
      <video
        key={url}
        src={url}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full object-contain bg-black"
      />
    </div>
  );
}