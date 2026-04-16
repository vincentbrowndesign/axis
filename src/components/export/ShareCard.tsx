"use client";

import type { PossessionRecord } from "./ExportReport";

type ShareCardProps = {
  title?: string;
  subtitle?: string;
  possessions: PossessionRecord[];
};

function pct(num: number, total: number) {
  if (!total) return 0;
  return Math.round((num / total) * 100);
}

function countBy<T extends string>(items: T[]) {
  const map: Record<string, number> = {};
  for (const item of items) {
    if (!item) continue;
    map[item] = (map[item] || 0) + 1;
  }
  return map;
}

function labelize(value?: string) {
  if (!value) return "—";
  return value
    .replaceAll("_yes", "")
    .replaceAll("_no", "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ShareCard({
  title = "Possession Profile",
  subtitle = "A session-level story generated from possession taps.",
  possessions,
}: ShareCardProps) {
  const total = possessions.length;
  const downhillRate = pct(
    possessions.filter((p) => p.pressure === "downhill_yes").length,
    total
  );
  const paintRate = pct(
    possessions.filter((p) => p.paintTouch === "paint_yes").length,
    total
  );
  const helpRate = pct(
    possessions.filter((p) => p.help === "help_yes").length,
    total
  );
  const passRate = pct(
    possessions.filter((p) => p.decision === "pass").length,
    total
  );
  const makeRate = pct(
    possessions.filter((p) => p.outcome === "make").length,
    total
  );

  const sideDist = countBy(possessions.map((d) => d.side!).filter(Boolean));
  const passDist = countBy(possessions.map((d) => d.passTarget!).filter(Boolean));
  const outcomeDist = countBy(possessions.map((d) => d.outcome!).filter(Boolean));

  return (
    <div className="overflow-hidden rounded-[32px] border border-white/8 bg-black">
      <div className="bg-[radial-gradient(circle_at_top,rgba(190,242,100,0.16),transparent_30%)] p-6 sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.32em] text-white/30">
              Axis
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h2>
            <p className="mt-2 max-w-xl text-white/55">{subtitle}</p>
          </div>

          <div className="rounded-full border border-lime-300/20 bg-lime-300 px-4 py-2 text-sm font-medium text-black">
            {total} possessions
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            ["Downhill", `${downhillRate}%`],
            ["Paint", `${paintRate}%`],
            ["Help", `${helpRate}%`],
            ["Pass", `${passRate}%`],
            ["Make", `${makeRate}%`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4"
            >
              <div className="text-xs uppercase tracking-[0.22em] text-white/35">
                {label}
              </div>
              <div className="mt-2 text-3xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.22em] text-white/35">
              Main Side
            </div>
            <div className="text-2xl font-semibold">
              {Object.entries(sideDist).sort((a, b) => b[1] - a[1])[0]
                ? labelize(Object.entries(sideDist).sort((a, b) => b[1] - a[1])[0][0])
                : "—"}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.22em] text-white/35">
              Main Pass
            </div>
            <div className="text-2xl font-semibold">
              {Object.entries(passDist).sort((a, b) => b[1] - a[1])[0]
                ? labelize(Object.entries(passDist).sort((a, b) => b[1] - a[1])[0][0])
                : "—"}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.22em] text-white/35">
              Main Outcome
            </div>
            <div className="text-2xl font-semibold">
              {Object.entries(outcomeDist).sort((a, b) => b[1] - a[1])[0]
                ? labelize(Object.entries(outcomeDist).sort((a, b) => b[1] - a[1])[0][0])
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}