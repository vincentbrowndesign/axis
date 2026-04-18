"use client";

import { useRef, useState } from "react";

type Props = {
  onUploaded: (file: File, url: string) => void;
};

export default function UploadModal({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);

    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      setProgress(p);

      if (p >= 100) {
        clearInterval(interval);
        const url = URL.createObjectURL(f);
        onUploaded(f, url);
      }
    }, 120);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">

        <h2 className="text-lg font-semibold mb-4">
          Upload game
        </h2>

        <div
          onClick={() => inputRef.current?.click()}
          className="border border-dashed rounded-xl p-6 text-center cursor-pointer"
        >
          Tap to upload video
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {file && (
          <div className="mt-4 text-sm">
            {file.name} — {progress}%
          </div>
        )}

      </div>
    </div>
  );
}