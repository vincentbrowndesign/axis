"use client";

import { useEffect, useState } from "react";

type Step = "upload" | "review";

type VideoData = {
  file: File;
  url: string;
  name: string;
};

export default function Page() {
  const [step, setStep] = useState<Step>("upload");
  const [video, setVideo] = useState<VideoData | null>(null);

  useEffect(() => {
    return () => {
      if (video?.url) URL.revokeObjectURL(video.url);
    };
  }, [video]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Only video files");
      return;
    }

    const url = URL.createObjectURL(file);

    setVideo({
      file,
      url,
      name: file.name,
    });

    setStep("review");
  }

  function reset() {
    setStep("upload");
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      {step === "upload" && (
        <div className="p-6 border border-white/10 rounded-2xl">
          <input type="file" accept="video/*" onChange={handleFile} />
        </div>
      )}

      {step === "review" && video && (
        <div className="w-full max-w-2xl space-y-4">
          <button onClick={reset}>Back</button>

          <video
            src={video.url}
            controls
            className="w-full rounded-xl"
          />

          <div>{video.name}</div>
        </div>
      )}
    </main>
  );
}