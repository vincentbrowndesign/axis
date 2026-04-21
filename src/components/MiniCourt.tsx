type MiniCourtPoint = {
  x: number;
  y: number;
};

type MiniCourtProps = {
  lane?: "Left Corner" | "Left Wing" | "Middle" | "Right Wing" | "Right Corner" | null;
  downhill?: boolean;
  help?: "Help" | "No Help" | null;
  decision?: "Finish" | "Pass" | "Reset" | "Shot" | null;
};

function getLanePoint(
  lane?: "Left Corner" | "Left Wing" | "Middle" | "Right Wing" | "Right Corner" | null
): MiniCourtPoint {
  switch (lane) {
    case "Left Corner":
      return { x: 18, y: 82 };
    case "Left Wing":
      return { x: 24, y: 58 };
    case "Middle":
      return { x: 50, y: 56 };
    case "Right Wing":
      return { x: 76, y: 58 };
    case "Right Corner":
      return { x: 82, y: 82 };
    default:
      return { x: 50, y: 70 };
  }
}

function getDecisionPoint(
  decision?: "Finish" | "Pass" | "Reset" | "Shot" | null
): MiniCourtPoint {
  switch (decision) {
    case "Finish":
      return { x: 50, y: 18 };
    case "Pass":
      return { x: 70, y: 42 };
    case "Shot":
      return { x: 50, y: 36 };
    case "Reset":
      return { x: 50, y: 70 };
    default:
      return { x: 50, y: 34 };
  }
}

export default function MiniCourt({
  lane,
  downhill,
  help,
  decision,
}: MiniCourtProps) {
  const start = { x: 50, y: 88 };
  const attack = getLanePoint(lane);
  const end = getDecisionPoint(decision);

  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
          Mini court
        </p>
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
          Visual read
        </p>
      </div>

      <div className="mt-3 rounded-2xl border border-white/8 bg-black/30 p-3">
        <svg viewBox="0 0 100 100" className="w-full">
          <rect x="8" y="8" width="84" height="84" rx="6" fill="transparent" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
          <rect x="28" y="8" width="44" height="26" rx="2" fill="transparent" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" />
          <path d="M 38 34 A 12 12 0 0 0 62 34" fill="transparent" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
          <circle cx="50" cy="14" r="1.8" fill="rgba(255,255,255,0.65)" />

          {downhill ? (
            <>
              <line
                x1={start.x}
                y1={start.y}
                x2={attack.x}
                y2={attack.y}
                stroke="rgba(163,230,53,0.95)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <line
                x1={attack.x}
                y1={attack.y}
                x2={end.x}
                y2={end.y}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeDasharray={decision === "Pass" ? "3 3" : "0"}
              />
            </>
          ) : null}

          <circle cx={start.x} cy={start.y} r="3" fill="rgba(255,255,255,0.85)" />
          <circle cx={attack.x} cy={attack.y} r="3.2" fill="rgba(163,230,53,0.95)" />
          <circle
            cx={end.x}
            cy={end.y}
            r="3.2"
            fill={decision === "Pass" ? "rgba(250,204,21,0.95)" : "rgba(255,255,255,0.9)"}
          />

          {help === "Help" ? (
            <circle cx="62" cy="38" r="4" fill="transparent" stroke="rgba(250,204,21,0.95)" strokeWidth="1.5" />
          ) : null}
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/60">
        <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
          Lane: <span className="text-white">{lane ?? "—"}</span>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
          Help: <span className="text-white">{help ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}