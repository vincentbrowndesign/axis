"use client";

import type { Shot } from "@/lib/types";

export default function ShotResults({ shots }: { shots: Shot[] }) {
  if (!shots || shots.length === 0) {
    return (
      <div className="card">
        <p className="section-copy">No results yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="stack">
        <h2 className="section-title">Shot Results</h2>

        <div className="results">
          {shots.map((shot, i) => (
            <div key={shot.id} className="shot-row">
              <div className="shot-left">
                <div className="shot-index">#{i + 1}</div>
                <div className="shot-meta">
                  <div>{shot.zone}</div>
                  <div className="shot-time">{shot.time}s</div>
                </div>
              </div>

              <div
                className={
                  shot.result === "make"
                    ? "badge make"
                    : "badge miss"
                }
              >
                {shot.result}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}