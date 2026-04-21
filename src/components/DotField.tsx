type DotTone = "good" | "neutral" | "warn";

type DotFieldItem = {
  tone: DotTone;
  label: string;
};

function toneClass(tone: DotTone) {
  if (tone === "good") return "bg-lime-400";
  if (tone === "warn") return "bg-amber-400";
  return "bg-white/35";
}

export default function DotField({
  dots,
  activeIndex,
  onSelect,
}: {
  dots: DotFieldItem[];
  activeIndex?: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
          Dot field
        </p>
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
          {dots.length} possessions
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {dots.length ? (
          dots.map((dot, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={`${dot.label}-${index}`}
                type="button"
                onClick={() => onSelect?.(index)}
                title={dot.label}
                className={`h-3.5 w-3.5 rounded-full transition ${
                  toneClass(dot.tone)
                } ${isActive ? "scale-125 ring-2 ring-white/70" : "hover:scale-110"}`}
              />
            );
          })
        ) : (
          <div className="text-sm text-white/35">No possessions yet.</div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-white/55">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-lime-400" />
          Correct
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
          Neutral
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Missed
        </div>
      </div>
    </div>
  );
}