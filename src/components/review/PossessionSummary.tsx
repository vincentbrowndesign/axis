"use client";

import type { LinkDraft, OutcomeType } from "@/lib/review-types";
import { buildStory, formatTime, getEventLabel } from "@/lib/review-utils";

type Props = {
  startTimeSec: number | null;
  endTimeSec: number | null;
  links: LinkDraft[];
  outcome: OutcomeType;
};

export default function PossessionSummary({
  startTimeSec,
  endTimeSec,
  links,
  outcome,
}: Props) {
  const nonEmptyLinks = links.filter((link) => link.events.length > 0);

  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/42">
        Possession
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[16px] border border-white/8 bg-black/30 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/36">
            Start
          </div>
          <div className="mt-1 text-sm text-white/82">
            {startTimeSec == null ? "—" : formatTime(startTimeSec)}
          </div>
        </div>

        <div className="rounded-[16px] border border-white/8 bg-black/30 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/36">
            End
          </div>
          <div className="mt-1 text-sm text-white/82">
            {endTimeSec == null ? "—" : formatTime(endTimeSec)}
          </div>
        </div>

        <div className="rounded-[16px] border border-white/8 bg-black/30 px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/36">
            Outcome
          </div>
          <div className="mt-1 text-sm text-white/82">
            {outcome == null ? "—" : getEventLabel(outcome)}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/36">
          Links
        </div>

        {nonEmptyLinks.length ? (
          nonEmptyLinks.map((link, index) => (
            <div
              key={link.id}
              className="rounded-[16px] border border-white/8 bg-black/30 px-3 py-3"
            >
              <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/36">
                Link {index + 1}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {link.events.map((event) => (
                  <div
                    key={event.id}
                    className="h-8 shrink-0 whitespace-nowrap rounded-full border border-white/8 bg-black/30 px-3 text-[11px] leading-8 tracking-[0.04em] text-white/78"
                  >
                    {getEventLabel(event.type)}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-white/42">No links yet.</div>
        )}
      </div>

      <div className="mt-4 rounded-[16px] border border-white/8 bg-black/30 px-3 py-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/36">
          Story
        </div>
        <div className="text-sm leading-6 text-white/88">
          {buildStory(links, outcome)}
        </div>
      </div>
    </div>
  );
}