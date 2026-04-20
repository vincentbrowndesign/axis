"use client";

type Props = {
  videoUrl: string;
};

export default function AxisReviewEditor({ videoUrl }: Props) {
  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      <div className="flex-1 flex items-center justify-center p-4">
        <video
          src={videoUrl}
          controls
          className="max-h-full max-w-full rounded-lg"
        />
      </div>

      <div className="border-t border-neutral-800 p-4">
        <p className="text-sm text-neutral-400">Timeline + tagging coming next</p>
      </div>
    </div>
  );
}