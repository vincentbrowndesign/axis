"use client";

import { useMemo, useState } from "react";
import MuxVideoPlayer from "@/components/MuxVideoPlayer";

type UploadState = "idle" | "creating-url" | "uploading" | "processing" | "ready" | "error";

type AssetResponse = {
  id: string;
  status: string;
  playback_ids?: Array<{ id: string; policy: string }>;
};

export default function Page() {
  const [fileName, setFileName] = useState("");
  const [uploadId, setUploadId] = useState("");
  const [playbackId, setPlaybackId] = useState("");
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("Select a video to upload.");
  const [isPolling, setIsPolling] = useState(false);

  const canUpload = useMemo(() => status !== "creating-url" && status !== "uploading", [status]);

  async function pollAssetFromUpload(currentUploadId: string) {
    setIsPolling(true);

    try {
      for (let i = 0; i < 40; i += 1) {
        const res = await fetch(`/api/upload-status?uploadId=${encodeURIComponent(currentUploadId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to check upload status.");
        }

        const asset: AssetResponse | null = data.asset ?? null;

        if (asset?.playback_ids?.[0]?.id) {
          setPlaybackId(asset.playback_ids[0].id);
          setStatus("ready");
          setMessage("Video ready.");
          setIsPolling(false);
          return;
        }

        setStatus("processing");
        setMessage(`Processing video... (${asset?.status ?? "waiting"})`);

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      throw new Error("Timed out waiting for Mux to finish processing.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error.";
      setStatus("error");
      setMessage(text);
      setIsPolling(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPlaybackId("");
    setUploadId("");
    setStatus("creating-url");
    setMessage("Creating upload URL...");

    try {
      const createUploadRes = await fetch("/api/upload", {
        method: "POST",
      });

      const createUploadData = await createUploadRes.json();

      if (!createUploadRes.ok) {
        throw new Error(createUploadData.error || "Could not create upload URL.");
      }

      const { uploadUrl, uploadId: newUploadId } = createUploadData as {
        uploadUrl: string;
        uploadId: string;
      };

      setUploadId(newUploadId);
      setStatus("uploading");
      setMessage("Uploading video to Mux...");

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "video/mp4",
        },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("Upload to Mux failed.");
      }

      setStatus("processing");
      setMessage("Upload complete. Waiting for Mux to process...");
      await pollAssetFromUpload(newUploadId);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error.";
      setStatus("error");
      setMessage(text);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Axis</p>
          <h1 className="text-3xl font-semibold">Upload video</h1>
          <p className="text-sm text-white/60">
            Browser uploads directly to Mux. Then we pull the playback ID back into Axis.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <label className="mb-3 block text-sm text-white/70">Choose a video file</label>

          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={!canUpload}
            className="block w-full text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black"
          />

          <div className="mt-4 space-y-1 text-sm text-white/60">
            <p>Status: {status}</p>
            <p>{message}</p>
            {fileName ? <p>File: {fileName}</p> : null}
            {uploadId ? <p>Upload ID: {uploadId}</p> : null}
            {isPolling ? <p>Checking Mux processing status...</p> : null}
          </div>
        </div>

        {playbackId ? (
          <div className="space-y-3">
            <p className="text-sm text-white/50">Playback ID: {playbackId}</p>
            <MuxVideoPlayer playbackId={playbackId} title={fileName || "Axis Upload"} />
          </div>
        ) : null}
      </div>
    </main>
  );
}