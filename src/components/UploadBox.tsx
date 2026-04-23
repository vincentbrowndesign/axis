"use client";

import { useState } from "react";
import type { AnalyzeResponse } from "@/lib/types";

type UploadBoxProps = {
  onResult: (data: AnalyzeResponse) => void;
};

export default function UploadBox({ onResult }: UploadBoxProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!file) return;

    setLoading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        throw new Error("Analyze request failed");
      }

      const data: AnalyzeResponse = await res.json();
      onResult(data);
    } catch (error) {
      console.error(error);
      alert("Something went wrong analyzing the video.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="stack">
        <div>
          <h2 className="section-title">Upload workout video</h2>
          <p className="section-copy">
            Start with one shooting video. We will return mock shot data first
            so we can test the flow.
          </p>
        </div>

        <label className="upload-field">
          <span className="upload-label">Choose video</span>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="row">
          <button
            type="button"
            className="button"
            onClick={handleAnalyze}
            disabled={!file || loading}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>

          <div className="file-meta">
            {file ? `Selected: ${file.name}` : "No file selected"}
          </div>
        </div>
      </div>
    </div>
  );
}