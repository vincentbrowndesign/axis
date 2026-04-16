"use client";

import { useMemo, useRef, useState } from "react";
import { downloadPDF, downloadPNG, downloadSVG } from "./exportUtils";
import {
  derivePossessionIntelligence,
  deriveSessionIntelligence,
  type PossessionRecord,
} from "./intelligence";

export type { PossessionRecord } from "./intelligence";

type ExportReportProps = {
  title?: string;
  subtitle?: string;
  possessions: PossessionRecord[];
};

type ExportView = "report" | "card";

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

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-3 last:border-b-0">
      <span className="text-sm uppercase tracking-[0.22em] text-white/45">
        {label}
      </span>
      <span className="text-2xl font-semibold">{value}</span>
    </div>
  );
}

function Bar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm text-white/60">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-lime-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function StatePill({ state }: { state: "advantage" | "neutral" | "breakdown" }) {
  const styles =
    state === "advantage"
      ? "bg-lime-300 text-black border-lime-300/20"
      : state === "breakdown"
      ? "bg-white text-black border-white/20"
      : "bg-white/5 text-white border-white/10";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${styles}`}
    >
      {state}
    </span>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ExportView;
  onChange: (view: ExportView) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-white/[0.05] p-1">
      <button
        type="button"
        onClick={() => onChange("report")}
        className={`rounded-full px-5 py-3 text-sm transition ${
          value === "report" ? "bg-white text-black" : "text-white/65 hover:text-white"
        }`}
      >
        Report
      </button>
      <button
        type="button"
        onClick={() => onChange("card")}
        className={`rounded-full px-5 py-3 text-sm transition ${
          value === "card" ? "bg-white text-black" : "text-white/65 hover:text-white"
        }`}
      >
        Card
      </button>
    </div>
  );
}

function FormatButtons({
  onPNG,
  onSVG,
  onPDF,
  isExporting,
}: {
  onPNG: () => void;
  onSVG: () => void;
  onPDF: () => void;
  isExporting: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={isExporting}
        onClick={onPNG}
        className="rounded-full bg-lime-300 px-5 py-3 text-sm font-medium text-black transition hover:brightness-105 disabled:opacity-70"
      >
        PNG
      </button>
      <button
        type="button"
        disabled={isExporting}
        onClick={onSVG}
        className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-70"
      >
        SVG
      </button>
      <button
        type="button"
        disabled={isExporting}
        onClick={onPDF}
        className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-70"
      >
        PDF
      </button>
    </div>
  );
}

function ReportView({
  title,
  subtitle,
  session,
  derivedPossessions,
  sideDist,
  passDist,
  outcomeDist,
}: {
  title: string;
  subtitle: string;
  session: ReturnType<typeof deriveSessionIntelligence>;
  derivedPossessions: Array<{
    id: string | number;
    record: PossessionRecord;
    intelligence: ReturnType<typeof derivePossessionIntelligence>;
  }>;
  sideDist: Record<string, number>;
  passDist: Record<string, number>;
  outcomeDist: Record<string, number>;
}) {
  const stateDist = countBy(derivedPossessions.map((p) => p.intelligence.state));

  return (
    <div className="space-y-6 rounded-[28px] bg-black">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Session Metrics">
          <div className="space-y-1">
            <Stat label="Reviewed" value={session.total} />
            <Stat label="Downhill" value={`${session.downhillRate}%`} />
            <Stat label="Paint Touch" value={`${session.paintTouchRate}%`} />
            <Stat label="Help" value={`${session.helpRate}%`} />
            <Stat label="Pass" value={`${session.passRate}%`} />
            <Stat label="Make" value={`${session.makeRate}%`} />
            <Stat label="Advantage" value={`${session.advantageRate}%`} />
            <Stat label="Breakdown" value={`${session.breakdownRate}%`} />
          </div>
        </SectionCard>

        <SectionCard title="Machine Read">
          <div className="space-y-3">
            {session.insights.map((insight, i) => (
              <div
                key={i}
                className="rounded-[18px] border border-white/8 bg-black/50 p-4 text-base leading-7 text-white/80"
              >
                {insight}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Pressure Funnel">
        <div className="space-y-4">
          <Bar label="Downhill" value={session.downhillRate} />
          <Bar label="Paint Touch" value={session.paintTouchRate} />
          <Bar label="Help" value={session.helpRate} />
          <Bar label="Pass" value={session.passRate} />
          <Bar label="Make" value={session.makeRate} />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <SectionCard title="State Mix">
          <div className="space-y-4">
            {Object.entries(stateDist).length ? (
              Object.entries(stateDist).map(([key, value]) => (
                <Bar
                  key={key}
                  label={labelize(key)}
                  value={pct(value, session.total)}
                />
              ))
            ) : (
              <div className="text-white/45">No state data yet.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Side Distribution">
          <div className="space-y-4">
            {Object.entries(sideDist).length ? (
              Object.entries(sideDist).map(([key, value]) => (
                <Bar
                  key={key}
                  label={labelize(key)}
                  value={pct(value, session.total)}
                />
              ))
            ) : (
              <div className="text-white/45">No side data yet.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Pass Targets">
          <div className="space-y-4">
            {Object.entries(passDist).length ? (
              Object.entries(passDist).map(([key, value]) => (
                <Bar
                  key={key}
                  label={labelize(key)}
                  value={pct(value, session.total)}
                />
              ))
            ) : (
              <div className="text-white/45">No pass data yet.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Outcomes">
          <div className="space-y-4">
            {Object.entries(outcomeDist).length ? (
              Object.entries(outcomeDist).map(([key, value]) => (
                <Bar
                  key={key}
                  label={labelize(key)}
                  value={pct(value, session.total)}
                />
              ))
            ) : (
              <div className="text-white/45">No outcome data yet.</div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Top Tags">
        <div className="flex flex-wrap gap-3">
          {session.topTags.length ? (
            session.topTags.map((item) => (
              <span
                key={item.tag}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
              >
                {item.tag} · {item.count}
              </span>
            ))
          ) : (
            <div className="text-white/45">No tags yet.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Possession Stories">
        <div className="grid grid-cols-1 gap-3">
          {derivedPossessions.length ? (
            derivedPossessions.map((item) => (
              <div
                key={item.id}
                className="rounded-[18px] border border-white/8 bg-black/40 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm text-white/35">#{item.id}</div>
                  <StatePill state={item.intelligence.state} />
                </div>

                <div className="text-sm leading-7 text-white/82">
                  {item.intelligence.story}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {item.intelligence.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[18px] border border-white/8 bg-black/40 p-4 text-sm text-white/50">
              No completed possessions yet.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function CardView({
  session,
}: {
  session: ReturnType<typeof deriveSessionIntelligence>;
}) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-white/8 bg-black">
      <div className="bg-[radial-gradient(circle_at_top,rgba(190,242,100,0.16),transparent_30%)] p-6 sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.32em] text-white/30">
              Axis
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Possession Profile
            </h2>
            <p className="mt-2 max-w-xl text-white/55">
              A session-level story generated from possession taps.
            </p>
          </div>

          <div className="rounded-full border border-lime-300/20 bg-lime-300 px-4 py-2 text-sm font-medium text-black">
            {session.total} possessions
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            ["Downhill", `${session.downhillRate}%`],
            ["Paint", `${session.paintTouchRate}%`],
            ["Help", `${session.helpRate}%`],
            ["Pass", `${session.passRate}%`],
            ["Advantage", `${session.advantageRate}%`],
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

        <div className="mt-8 space-y-3">
          {session.insights.slice(0, 2).map((insight, i) => (
            <div
              key={i}
              className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5 text-lg leading-8 text-white/82"
            >
              {insight}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {session.topTags.slice(0, 5).map((item) => (
            <span
              key={item.tag}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/82"
            >
              {item.tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ExportReport({
  title = "Session Report",
  subtitle = "Structured possession taps turned into a readable visual report.",
  possessions,
}: ExportReportProps) {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [view, setView] = useState<ExportView>("report");
  const [showRaw, setShowRaw] = useState(false);

  const completedPossessions = useMemo(
    () => possessions.filter((p) => p.outcome),
    [possessions]
  );

  const derivedPossessions = useMemo(
    () =>
      completedPossessions.map((p, i) => ({
        id: p.id ?? i + 1,
        record: p,
        intelligence: derivePossessionIntelligence(p),
      })),
    [completedPossessions]
  );

  const session = useMemo(
    () => deriveSessionIntelligence(completedPossessions),
    [completedPossessions]
  );

  const sideDist = useMemo(
    () => countBy(completedPossessions.map((d) => d.side!).filter(Boolean)),
    [completedPossessions]
  );

  const passDist = useMemo(
    () => countBy(completedPossessions.map((d) => d.passTarget!).filter(Boolean)),
    [completedPossessions]
  );

  const outcomeDist = useMemo(
    () => countBy(completedPossessions.map((d) => d.outcome!).filter(Boolean)),
    [completedPossessions]
  );

  async function runExport(kind: "png" | "svg" | "pdf") {
    try {
      setIsExporting(true);
      const node = view === "report" ? reportRef.current : cardRef.current;
      const base = view === "report" ? "axis-session-report" : "axis-share-card";

      if (kind === "png") await downloadPNG(node, `${base}.png`);
      if (kind === "svg") await downloadSVG(node, `${base}.svg`);
      if (kind === "pdf") await downloadPDF(node, `${base}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Export failed. Try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.32em] text-white/30">
            Axis Export
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-white/60">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ViewToggle value={view} onChange={setView} />
          <FormatButtons
            onPNG={() => runExport("png")}
            onSVG={() => runExport("svg")}
            onPDF={() => runExport("pdf")}
            isExporting={isExporting}
          />
        </div>
      </header>

      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-white/60">
        {view === "report"
          ? "Report view is the full session export."
          : "Card view is the compact share version."}
      </div>

      <div className={view === "report" ? "block" : "hidden"}>
        <div ref={reportRef}>
          <ReportView
            title={title}
            subtitle={subtitle}
            session={session}
            derivedPossessions={derivedPossessions}
            sideDist={sideDist}
            passDist={passDist}
            outcomeDist={outcomeDist}
          />
        </div>
      </div>

      <div className={view === "card" ? "block" : "hidden"}>
        <div ref={cardRef}>
          <CardView session={session} />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="text-sm text-white/45 underline-offset-4 hover:text-white/70 hover:underline"
        >
          {showRaw ? "Hide raw data" : "Show raw data"}
        </button>
      </div>

      {showRaw ? (
        <section className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
          <h2 className="mb-4 text-xl font-semibold">Raw export data</h2>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-white/70">
            {JSON.stringify(
              {
                session,
                possessions: derivedPossessions.map((item) => ({
                  id: item.id,
                  ...item.record,
                  intelligence: item.intelligence,
                })),
              },
              null,
              2
            )}
          </pre>
        </section>
      ) : null}
    </div>
  );
}