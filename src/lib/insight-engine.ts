export type InsightTone = "good" | "neutral" | "warn";

export type PossessionLike = {
  player?: string;
  start?: string;
  nodes?: string[];
  outcome?: string | null;
};

export type PossessionInsight = {
  read: string;
  tone: InsightTone;
  why: string;
  next: string;
};

export type SessionInsight = {
  pattern: string;
  focus: string;
};

function hasNode(nodes: string[], value: string) {
  return nodes.includes(value);
}

export function getPossessionInsight(possession?: PossessionLike): PossessionInsight {
  if (!possession) {
    return {
      read: "No possession selected",
      tone: "neutral",
      why: "Choose a possession to see the read.",
      next: "Tag one possession all the way through to get feedback.",
    };
  }

  const nodes = possession.nodes ?? [];
  const downhill = hasNode(nodes, "Downhill");
  const help = hasNode(nodes, "Help");
  const noHelp = hasNode(nodes, "No Help");
  const pass = hasNode(nodes, "Pass");
  const finish = hasNode(nodes, "Finish");
  const shot = hasNode(nodes, "Shot");
  const reset = hasNode(nodes, "Reset");
  const make = possession.outcome === "Make" || hasNode(nodes, "Make");
  const miss = possession.outcome === "Miss" || hasNode(nodes, "Miss");
  const turnover = possession.outcome === "Turnover" || hasNode(nodes, "Turnover");

  if (!downhill) {
    return {
      read: "No paint pressure",
      tone: "warn",
      why: "The possession never got downhill enough to bend the defense.",
      next: "Create pressure first before settling.",
    };
  }

  if (help && pass) {
    return {
      read: "Correct",
      tone: "good",
      why: "Help committed, so the pass kept the advantage alive.",
      next: "Keep attacking to collapse the defense before moving it.",
    };
  }

  if (noHelp && pass) {
    return {
      read: "Missed scoring window",
      tone: "warn",
      why: "The defense stayed home, so the lane was still available.",
      next: "Finish when no help shows.",
    };
  }

  if (noHelp && finish) {
    return {
      read: "Correct",
      tone: "good",
      why: "No help showed, so the finish was the clean read.",
      next: "Keep converting clean lanes into finishes.",
    };
  }

  if (help && finish && make) {
    return {
      read: "Tough make",
      tone: "neutral",
      why: "Help was there, but the finish still converted.",
      next: "Good score. Also look for the early spray if help loads sooner.",
    };
  }

  if (help && finish && (miss || turnover)) {
    return {
      read: "Forced finish",
      tone: "warn",
      why: "Help had already arrived, so the window was crowded.",
      next: "See the second defender earlier and play off the help.",
    };
  }

  if (shot && !help) {
    return {
      read: "Low advantage shot",
      tone: "warn",
      why: "The shot came before the defense was really shifted.",
      next: "Touch paint or force help before settling.",
    };
  }

  if (reset) {
    return {
      read: "Neutral",
      tone: "neutral",
      why: "No clean edge was created on the first action.",
      next: "Reset fast and re-attack with better timing.",
    };
  }

  if (turnover && pass) {
    return {
      read: "Bad execution",
      tone: "warn",
      why: "The idea may have been right, but the pass did not get there clean.",
      next: "Keep the read. Tighten the delivery.",
    };
  }

  return {
    read: "Incomplete",
    tone: "neutral",
    why: "This possession does not have enough signal yet.",
    next: "Tag downhill, help, action, and outcome for a cleaner read.",
  };
}

export function getSessionInsight(possessions: PossessionLike[]): SessionInsight {
  if (!possessions.length) {
    return {
      pattern: "No session pattern yet.",
      focus: "Tag a few possessions to build signal.",
    };
  }

  let noHelpPasses = 0;
  let helpPasses = 0;
  let forcedFinishes = 0;
  let downhillTouches = 0;
  let turnovers = 0;

  for (const p of possessions) {
    const nodes = p.nodes ?? [];
    const downhill = hasNode(nodes, "Downhill");
    const help = hasNode(nodes, "Help");
    const noHelp = hasNode(nodes, "No Help");
    const pass = hasNode(nodes, "Pass");
    const finish = hasNode(nodes, "Finish");
    const turnover = p.outcome === "Turnover" || hasNode(nodes, "Turnover");
    const miss = p.outcome === "Miss" || hasNode(nodes, "Miss");

    if (downhill) downhillTouches += 1;
    if (help && pass) helpPasses += 1;
    if (noHelp && pass) noHelpPasses += 1;
    if (help && finish && (miss || turnover)) forcedFinishes += 1;
    if (turnover) turnovers += 1;
  }

  if (noHelpPasses >= 3) {
    return {
      pattern: `Passed out of ${noHelpPasses} clean scoring windows.`,
      focus: "Score first when the defense stays home.",
    };
  }

  if (downhillTouches <= Math.max(1, Math.floor(possessions.length * 0.3))) {
    return {
      pattern: "Not enough downhill pressure to bend the defense.",
      focus: "Create paint pressure earlier in possessions.",
    };
  }

  if (helpPasses >= 3 && noHelpPasses <= 1) {
    return {
      pattern: "Recognized help well and moved it on time.",
      focus: "Keep collapsing the defense before passing.",
    };
  }

  if (forcedFinishes >= 2) {
    return {
      pattern: `Forced ${forcedFinishes} finishes into help.`,
      focus: "See the second defender sooner and play off the collapse.",
    };
  }

  if (turnovers >= 2) {
    return {
      pattern: `Turnovers ended ${turnovers} possessions.`,
      focus: "Slow the decision half a beat and simplify the next read.",
    };
  }

  return {
    pattern: "Session is still building.",
    focus: "Stack more possessions to reveal the clearest habit.",
  };
}