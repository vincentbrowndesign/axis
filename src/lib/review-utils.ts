import type {
  EventType,
  LinkDraft,
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

export function flattenLinkEvents(links: LinkDraft[]) {
  return links.flatMap((link) => sortEvents(link.events));
}

export function getEventLabel(type: EventType | Exclude<OutcomeType, null>) {
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

function buildLinkPhrase(link: LinkDraft) {
  const labels = sortEvents(link.events).map((event) => {
    if (event.type === "no_paint") return "no paint";
    if (event.type === "no_help") return "no help";
    if (event.type === "help") return "help showed";
    return getEventLabel(event.type).toLowerCase();
  });

  return labels.join(" • ");
}

export function buildStory(links: LinkDraft[], outcome: OutcomeType) {
  const nonEmptyLinks = links.filter((link) => link.events.length > 0);

  if (!nonEmptyLinks.length) return "No possession story yet.";

  const linkText = nonEmptyLinks
    .map((link, index) => `Link ${index + 1}: ${buildLinkPhrase(link)}`)
    .join("  →  ");

  const outcomeText = outcome ? `  •  ${getEventLabel(outcome)}` : "";

  return `${linkText}${outcomeText}`;
}

export function getStateFromLinks(
  links: LinkDraft[],
  outcome: OutcomeType
): "advantage" | "neutral" | "breakdown" {
  const types = flattenLinkEvents(links).map((event) => event.type);

  const createdPressure =
    types.includes("drive") ||
    types.includes("paint") ||
    types.includes("help") ||
    types.includes("finish") ||
    types.includes("shot");

  if (outcome === "turnover") return "breakdown";
  if (outcome === "foul") return "advantage";
  if (outcome === "make" && createdPressure) return "advantage";
  if (outcome === "miss" && createdPressure) return "neutral";

  return "neutral";
}

export function buildSavedPossession(args: {
  id: string;
  startTimeSec: number;
  endTimeSec: number;
  links: LinkDraft[];
  outcome: Exclude<OutcomeType, null>;
}): SavedPossession {
  const links = args.links
    .map((link) => ({
      ...link,
      events: sortEvents(link.events),
    }))
    .filter((link) => link.events.length > 0);

  return {
    id: args.id,
    startTimeSec: args.startTimeSec,
    endTimeSec: args.endTimeSec,
    links,
    outcome: args.outcome,
    story: buildStory(links, args.outcome),
    state: getStateFromLinks(links, args.outcome),
  };
}