export type StartAction = "drive" | "pass" | "shot";
export type Side = "left" | "middle" | "right";
export type Pressure = "downhill_yes" | "downhill_no";
export type PaintTouch = "paint_yes" | "paint_no";
export type Help = "help_yes" | "help_no";
export type Decision = "pass" | "finish" | "reset";
export type PassTarget = "corner" | "wing" | "top" | "skip";
export type Outcome = "make" | "miss" | "foul" | "turnover" | "not_shot";

export type PossessionRecord = {
  id?: string | number;
  startAction?: StartAction;
  side?: Side;
  pressure?: Pressure;
  paintTouch?: PaintTouch;
  help?: Help;
  decision?: Decision;
  passTarget?: PassTarget;
  outcome?: Outcome;
};

export type PossessionState = "advantage" | "neutral" | "breakdown";

export type PossessionIntelligence = {
  pressureCreated: boolean;
  elitePressure: boolean;
  noAdvantage: boolean;
  defenseBroken: boolean;
  rimAdvantage: boolean;
  correctRead: boolean;
  badRead: boolean;
  missedOpportunity: boolean;
  goodProcess: boolean;
  bailedOut: boolean;
  positiveOutcome: boolean;
  negativeOutcome: boolean;
  state: PossessionState;
  tags: string[];
  story: string;
};

export type SessionIntelligence = {
  total: number;
  downhillRate: number;
  paintTouchRate: number;
  helpRate: number;
  passRate: number;
  makeRate: number;
  advantageRate: number;
  breakdownRate: number;
  topTags: Array<{ tag: string; count: number }>;
  insights: string[];
};

function pct(num: number, total: number) {
  if (!total) return 0;
  return Math.round((num / total) * 100);
}

function titleize(value?: string) {
  if (!value) return "";
  return value
    .replaceAll("_yes", "")
    .replaceAll("_no", "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function possessionStory(record: PossessionRecord) {
  const parts: string[] = [];

  if (record.startAction) parts.push(titleize(record.startAction));
  if (record.side) parts.push(titleize(record.side));
  if (record.pressure === "downhill_yes") parts.push("Downhill");
  if (record.pressure === "downhill_no") parts.push("No Downhill");
  if (record.paintTouch === "paint_yes") parts.push("Paint Touch");
  if (record.paintTouch === "paint_no") parts.push("No Paint");
  if (record.help === "help_yes") parts.push("Help");
  if (record.help === "help_no") parts.push("No Help");
  if (record.decision) parts.push(titleize(record.decision));
  if (record.passTarget) parts.push(`To ${titleize(record.passTarget)}`);
  if (record.outcome) parts.push(titleize(record.outcome));

  return parts.join(" · ");
}

export function derivePossessionIntelligence(
  record: PossessionRecord
): PossessionIntelligence {
  const pressureCreated = record.pressure === "downhill_yes";
  const elitePressure = record.paintTouch === "paint_yes";
  const noAdvantage =
    record.pressure === "downhill_no" && record.paintTouch === "paint_no";
  const defenseBroken = record.help === "help_yes";
  const rimAdvantage =
    record.help === "help_no" && record.paintTouch === "paint_yes";

  const correctRead =
    (record.help === "help_yes" && record.decision === "pass") ||
    (record.help === "help_no" && record.decision === "finish");

  const badRead = record.help === "help_yes" && record.decision === "finish";
  const missedOpportunity =
    record.help === "help_no" && record.decision === "pass";

  const positiveOutcome =
    record.outcome === "make" || record.outcome === "foul";
  const negativeOutcome = record.outcome === "turnover";

  const goodProcess = correctRead && record.outcome === "miss";
  const bailedOut = badRead && record.outcome === "make";

  const tags: string[] = [];

  if (pressureCreated) tags.push("Pressure Created");
  if (elitePressure) tags.push("Paint Touch");
  if (defenseBroken) tags.push("Defense Rotated");
  if (rimAdvantage) tags.push("Rim Advantage");
  if (correctRead) tags.push("Correct Read");
  if (record.help === "help_yes" && record.decision === "pass") {
    tags.push("Help Punished");
  }
  if (record.help === "help_yes" && record.decision === "finish") {
    tags.push("Forced Finish");
  }
  if (missedOpportunity) tags.push("Missed Opportunity");
  if (noAdvantage) tags.push("No Advantage");
  if (record.paintTouch === "paint_no") tags.push("Missed Paint");
  if (record.decision === "reset") tags.push("Reset");
  if (record.help === "help_no" && record.decision === "reset") {
    tags.push("Reset Under No Pressure");
  }
  if (goodProcess) tags.push("Good Process");
  if (bailedOut) tags.push("Bailed Out");
  if (record.outcome === "turnover") tags.push("Turnover");
  if (record.outcome === "make") tags.push("Conversion");
  if (record.outcome === "foul") tags.push("Foul Drawn");

  let state: PossessionState = "neutral";

  if (negativeOutcome || badRead) {
    state = "breakdown";
  } else if (correctRead || (pressureCreated && elitePressure)) {
    state = "advantage";
  } else if (noAdvantage) {
    state = "neutral";
  }

  return {
    pressureCreated,
    elitePressure,
    noAdvantage,
    defenseBroken,
    rimAdvantage,
    correctRead,
    badRead,
    missedOpportunity,
    goodProcess,
    bailedOut,
    positiveOutcome,
    negativeOutcome,
    state,
    tags,
    story: possessionStory(record),
  };
}

export function deriveSessionIntelligence(
  records: PossessionRecord[]
): SessionIntelligence {
  const completed = records.filter((record) => record.outcome);
  const total = completed.length;

  const derived = completed.map(derivePossessionIntelligence);

  const downhillRate = pct(
    completed.filter((r) => r.pressure === "downhill_yes").length,
    total
  );
  const paintTouchRate = pct(
    completed.filter((r) => r.paintTouch === "paint_yes").length,
    total
  );
  const helpRate = pct(
    completed.filter((r) => r.help === "help_yes").length,
    total
  );
  const passRate = pct(
    completed.filter((r) => r.decision === "pass").length,
    total
  );
  const makeRate = pct(
    completed.filter((r) => r.outcome === "make").length,
    total
  );
  const advantageRate = pct(
    derived.filter((d) => d.state === "advantage").length,
    total
  );
  const breakdownRate = pct(
    derived.filter((d) => d.state === "breakdown").length,
    total
  );

  const tagCounts = new Map<string, number>();
  for (const item of derived) {
    for (const tag of item.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  const insights: string[] = [];

  if (downhillRate < 35) {
    insights.push("The first defender is not being displaced enough.");
  } else if (downhillRate >= 60) {
    insights.push("Pressure is being created consistently.");
  }

  if (paintTouchRate < 40) {
    insights.push("The offense is not reaching the paint enough.");
  } else if (paintTouchRate >= 60) {
    insights.push("The action is reaching paint often enough to bend the defense.");
  }

  if (helpRate > 40 && passRate < 30) {
    insights.push("Help is showing, but it is not being punished enough.");
  } else if (helpRate > 40 && passRate >= 30) {
    insights.push("The defense is rotating and the pass is active.");
  }

  if (paintTouchRate > 60 && helpRate < 30) {
    insights.push("Pressure is real, but the defense is not being forced into enough rotation.");
  }

  if (passRate > 40 && makeRate < 40) {
    insights.push("The reads are there, but finishing is lagging.");
  }

  if (advantageRate >= 60) {
    insights.push("Most possessions are ending in advantage states.");
  }

  if (breakdownRate >= 25) {
    insights.push("Breakdown possessions are showing up too often.");
  }

  if (!insights.length) {
    insights.push("The possession profile is balanced, but no dominant pattern is separating yet.");
  }

  return {
    total,
    downhillRate,
    paintTouchRate,
    helpRate,
    passRate,
    makeRate,
    advantageRate,
    breakdownRate,
    topTags,
    insights,
  };
}