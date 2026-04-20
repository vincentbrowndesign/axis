"use client";

import { useMemo, useRef, useState } from "react";
import AxisReviewEditor from "@/components/review/AxisReviewEditor";

export default function ReviewPage() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasVideo = useMemo(() => Boolean(videoUrl), [videoUrl]);

  function handlePickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setVideoUrl(localUrl);
    setFileName(file.name);
  }

  return (
    <main className="axis-shell">
      <div className="axis-topbar">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.32em] text-white/35">
                Axis
              </div>
              <div className="text-sm font-medium text-white/90">Review</div>
            </div>

            <div className="hidden h-8 w-px bg-white/10 lg:block" />

            <div className="hidden lg:block">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                Session
              </div>
              <div className="max-w-[460px] truncate text-sm text-white/85">
                {fileName || "No session loaded"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="btn-gray"
            >
              Front Door
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1600px] grid-cols-[250px_minmax(0,1fr)_360px] px-4 py-4">
        <aside className="rounded-l-[28px] border border-r-0 border-white/10 bg-[#242b34] px-4 py-5">
          <div className="space-y-6">
            <div>
              <div className="axis-label">New upload</div>

              <div className="mt-3 axis-panel-soft p-4">
                <div className="font-medium text-white">Local review</div>
                <div className="mt-1 text-sm text-white/55">
                  Upload a possession file and start tagging.
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept="video/*"
                  onChange={handlePickFile}
                  className="mt-4 block w-full text-xs text-white/50 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-medium file:text-black"
                />
              </div>
            </div>

            <div>
              <div className="axis-label">Session</div>

              <div className="mt-3 axis-panel-soft p-4">
                <div className="truncate text-sm font-medium text-white">
                  {fileName || "No file loaded"}
                </div>
                <div className="mt-1 text-xs text-white/45">
                  {hasVideo ? "Review ready" : "Waiting"}
                </div>
              </div>
            </div>

            <div>
              <div className="axis-label">Focus</div>

              <div className="mt-3 axis-panel-soft p-4 text-sm text-white/60">
                <div>One playhead</div>
                <div>Possession chain</div>
                <div>Drive context</div>
                <div>Pass link flow</div>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 border-y border-white/10 bg-[#2a313b] px-6 py-5">
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-[0.26em] text-white/35">
              Review session
            </div>
            <h1 className="mt-2 text-4xl font-semibold leading-tight text-white">
              {fileName || "Axis Review Workspace"}
            </h1>
          </div>

          <div className="axis-video-wrap p-5">
            {videoUrl ? (
              <AxisReviewEditor src={videoUrl} />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-[22px] border border-white/10 bg-black text-sm text-white/40">
                Upload a video to begin review.
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-r-[28px] border border-l-0 border-white/10 bg-[#242b34] px-5 py-5">
          <div className="space-y-4">
            <div className="axis-label">Review mode</div>

            <div className="axis-panel-soft p-4 text-sm text-white/70">
              This screen is now centered on:
              <div className="mt-3 space-y-2 text-white/55">
                <div>• root action</div>
                <div>• contextual logic</div>
                <div>• chained possession flow</div>
                <div>• single playhead review</div>
              </div>
            </div>

            <div className="axis-panel-soft p-4 text-sm text-white/70">
              Next layer:
              <div className="mt-3 space-y-2 text-white/55">
                <div>• clip save / export</div>
                <div>• smarter pass-to-next-link behavior</div>
                <div>• visual possession graph</div>
                <div>• cleaner role-based color system</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}