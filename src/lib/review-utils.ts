import type {
  EventType,
  OutcomeType,
  SavedPossession,
  TimelineEvent,
} from "./review-types";

export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${tenths}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function createId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sortEvents(events: TimelineEvent[]) {
  return [...events].sort((a, b) => a.timeSec - b.timeSec);
}

export function getEventLabel(type: EventType) {
  switch (type) {
    case "drive":
      return "Drive";
    case "pass":
      return "Pass";
    case "shot":
      return "Shot";
    case "left":
      return "Left";
    case "middle":
      return "Middle";
    case "right":
      return "Right";
    case "paint":
      return "Paint";
    case "no_paint":
      return "No Paint";
    case "help":
      return "Help";
    case "no_help":
      return "No Help";
    case "finish":
      return "Finish";
    case "reset":
      return "Reset";
    case "make":
      return "Make";
    case "miss":
      return "Miss";
    case "turnover":
      return "Turnover";
    case "foul":
      return "Foul";
  }
}

export function getEventGroup(type: EventType) {
  if (type === "drive" || type === "pass" || type === "shot") return "action";
  if (type === "left" || type === "middle" || type === "right") return "side";
  if (type === "paint" || type === "no_paint") return "paint";
  if (type === "help" || type === "no_help") return "help";
  if (type === "finish" || type === "reset") return "decision";
  return "outcome";
}

export function getStateFromEvents(
  events: TimelineEvent[],
  outcome: OutcomeType
): "advantage" | "neutral" | "breakdown" {
  const types = events.map((event) => event.type);

  const createdPressure =
    types.includes("drive") ||
    types.includes("paint") ||
    types.includes("help") ||
    types.includes("finish");

  if (outcome === "turnover") return "breakdown";
  if (outcome === "foul") return "advantage";
  if (outcome === "make" && createdPressure) return "advantage";
  if (outcome === "miss" && createdPressure) return "neutral";

  return "neutral";
}

export function buildStory(events: TimelineEvent[], outcome: OutcomeType) {
  const types = events.map((event) => event.type);

  const parts: string[] = [];

  if (types.includes("drive")) parts.push("Drive");
  else if (types.includes("pass")) parts.push("Pass");
  else if (types.includes("shot")) parts.push("Shot");

  if (types.includes("left")) parts.push("left");
  if (types.includes("middle")) parts.push("middle");
  if (types.includes("right")) parts.push("right");

  if (types.includes("paint")) parts.push("paint touch");
  if (types.includes("no_paint")) parts.push("no paint");

  if (types.includes("help")) parts.push("help showed");
  if (types.includes("no_help")) parts.push("no help");

  if (types.includes("finish")) parts.push("finish");
  if (types.includes("reset")) parts.push("reset");

  if (outcome === "make") parts.push("make");
  if (outcome === "miss") parts.push("miss");
  if (outcome === "turnover") parts.push("turnover");
  if (outcome === "foul") parts.push("foul");

  if (!parts.length) return "No possession story yet.";

  return parts.join(" · ");
}

export function buildSavedPossession(args: {
  id: string;
  startTimeSec: number;
  endTimeSec: number;
  events: TimelineEvent[];
  outcome: Exclude<OutcomeType, null>;
}): SavedPossession {
  const orderedEvents = sortEvents(args.events);
  const story = buildStory(orderedEvents, args.outcome);
  const state = getStateFromEvents(orderedEvents, args.outcome);

  return {
    id: args.id,
    startTimeSec: args.startTimeSec,
    endTimeSec: args.endTimeSec,
    events: orderedEvents,
    outcome: args.outcome,
    story,
    state,
  };
}