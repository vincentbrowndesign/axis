"use client";

import { useState } from "react";

export default function ReviewPage() {
  const [collapsed, setCollapsed] = useState({
    stats: true,
    visuals: true,
    map: true,
  });

  const toggle = (key: keyof typeof collapsed) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // mock state (replace with your real data later)
  const chain = ["Player A", "Catch", "Downhill", "Left Wing", "Help"];
  const lastOutcome = "Turnover";

  return (
    <main className="min-h-screen bg-black text-white px-4 py-4 space-y-4">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Capture V3</h1>
        <div className="flex gap-2 text-xs">
          <button className="px-3 py-1 border border-white/20 rounded">Record</button>
          <button className="px-3 py-1 border border-white/20 rounded">Library</button>
          <button className="px-3 py-1 border border-white/20 rounded">Export</button>
        </div>
      </div>

      {/* VIDEO */}
      <div className="w-full aspect-video bg-neutral-900 rounded-xl flex items-center justify-center">
        <span className="text-white/40 text-sm">Video</span>
      </div>

      {/* CONTROLS */}
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-white/10 rounded">Play</button>
        <button className="px-4 py-2 bg-white/10 rounded">-2s</button>
        <button className="px-4 py-2 bg-white/10 rounded">+2s</button>
        <button className="px-4 py-2 bg-white/10 rounded">Undo</button>
        <button className="px-4 py-2 bg-green-500 text-black rounded">Finish</button>
      </div>

      {/* PROMPT + ACTION */}
      <div className="bg-neutral-900 rounded-xl p-4 space-y-3">

        <div className="text-sm text-white/60">PROMPT</div>
        <div className="text-lg font-medium">Who has the ball?</div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-2">
          {["Player A", "Player B", "Player C", "Player D"].map((p) => (
            <button
              key={p}
              className="py-3 rounded-xl bg-white/5 border border-white/10 active:scale-95"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* CURRENT CHAIN */}
      <div className="bg-neutral-900 rounded-xl p-4">
        <div className="text-xs text-white/50 mb-2">CURRENT CHAIN</div>
        <div className="flex flex-wrap gap-2">
          {chain.map((c, i) => (
            <span
              key={i}
              className="px-3 py-1 text-sm rounded-full bg-white/10"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* LAST POSSESSION (ALWAYS VISIBLE) */}
      <div className="bg-green-900/30 border border-green-500/40 rounded-xl p-4">
        <div className="text-sm text-white/70 mb-2">LAST POSSESSION</div>
        <div className="text-sm mb-3">
          Player A attacked downhill, drew help, passed → turnover.
        </div>

        <div className="flex gap-4 text-xs text-white/60">
          <div>Outcome: {lastOutcome}</div>
          <div>Tags: 8</div>
        </div>
      </div>

      {/* INSIGHT (ALWAYS VISIBLE) */}
      <div className="bg-neutral-900 rounded-xl p-4 space-y-3">
        <div className="text-xs text-white/50">INSIGHT</div>

        <div>
          <div className="text-sm text-white/60">NEXT</div>
          <div className="text-sm">Keep forcing rotations.</div>
        </div>

        <div>
          <div className="text-sm text-white/60">PATTERN</div>
          <div className="text-sm">
            Not enough downhill pressure to bend the defense.
          </div>
        </div>
      </div>

      {/* VISUALS (COLLAPSIBLE) */}
      <div className="bg-neutral-900 rounded-xl p-4">
        <button
          onClick={() => toggle("visuals")}
          className="w-full flex justify-between text-sm text-white/70"
        >
          Visuals
          <span>{collapsed.visuals ? "+" : "-"}</span>
        </button>

        {!collapsed.visuals && (
          <div className="mt-4 space-y-4">
            <div className="h-40 bg-black rounded-xl border border-white/10 flex items-center justify-center">
              Dot Field
            </div>
            <div className="h-40 bg-black rounded-xl border border-white/10 flex items-center justify-center">
              Mini Court
            </div>
          </div>
        )}
      </div>

      {/* STATS (COLLAPSIBLE + COMPRESSED) */}
      <div className="bg-neutral-900 rounded-xl p-4">
        <button
          onClick={() => toggle("stats")}
          className="w-full flex justify-between text-sm text-white/70"
        >
          Stats
          <span>{collapsed.stats ? "+" : "-"}</span>
        </button>

        {!collapsed.stats && (
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <div className="bg-black p-3 rounded">Possessions: 1</div>
            <div className="bg-black p-3 rounded">Downhill: 1</div>
            <div className="bg-black p-3 rounded">Passes: 1</div>
            <div className="bg-black p-3 rounded">Turnovers: 1</div>
          </div>
        )}
      </div>

      {/* MAP (COLLAPSIBLE) */}
      <div className="bg-neutral-900 rounded-xl p-4">
        <button
          onClick={() => toggle("map")}
          className="w-full flex justify-between text-sm text-white/70"
        >
          Possession Map
          <span>{collapsed.map ? "+" : "-"}</span>
        </button>

        {!collapsed.map && (
          <div className="mt-4 h-64 bg-black rounded-xl border border-white/10 flex items-center justify-center">
            Map View
          </div>
        )}
      </div>

    </main>
  );
}