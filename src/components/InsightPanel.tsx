import { getPossessionInsight, getSessionInsight, type PossessionLike } from "@/lib/insight-engine";

function InsightRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "neutral" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
      : tone === "warn"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
      : "border-white/10 bg-white/[0.04] text-white/80";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2">
      <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

function InsightBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </p>
      <p className="mt-1 text-sm leading-5 text-white/88">
        {value}
      </p>
    </div>
  );
}

export default function InsightPanel({
  selectedPossession,
  possessions,
}: {
  selectedPossession?: PossessionLike;
  possessions: PossessionLike[];
}) {
  const possessionInsight = getPossessionInsight(selectedPossession);
  const sessionInsight = getSessionInsight(possessions);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
          Insight
        </p>
        <h3 className="mt-1 text-sm font-medium text-white">
          Current possession
        </h3>
      </div>

      <div className="space-y-3">
        <InsightRow
          label="Read"
          value={possessionInsight.read}
          tone={possessionInsight.tone}
        />
        <InsightBlock label="Why" value={possessionInsight.why} />
        <InsightBlock label="Next" value={possessionInsight.next} />
      </div>

      <div className="my-4 h-px bg-white/8" />

      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
          Session pattern
        </p>
        <InsightBlock label="Pattern" value={sessionInsight.pattern} />
        <InsightBlock label="Focus" value={sessionInsight.focus} />
      </div>
    </section>
  );
}