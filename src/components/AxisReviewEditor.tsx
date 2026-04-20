"use client";

import { useRef, useState } from "react";

type EventType =
  | "shot"
  | "pass"
  | "drive"
  | "turnover"
  | "foul"
  | "reset";

type HelpType = "help" | "no-help";
type LaneType = "left" | "middle" | "right";
type DriveType = "downhill" | "none";

type EventNode = {
  id: string;
  time: number;
  type: EventType;

  // logic layer
  drive?: DriveType;
  lane?: LaneType;
  help?: HelpType;

  next?: EventNode;
};

export default function AxisReviewEditor({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [events, setEvents] = useState<EventNode[]>([]);
  const [currentNode, setCurrentNode] = useState<EventNode | null>(null);

  // --- helpers
  const getTime = () => videoRef.current?.currentTime || 0;

  const createNode = (type: EventType): EventNode => ({
    id: crypto.randomUUID(),
    time: getTime(),
    type,
  });

  // --- core action
  function handleEvent(type: EventType) {
    const newNode = createNode(type);

    if (!currentNode) {
      setEvents([newNode]);
      setCurrentNode(newNode);
      return;
    }

    // link chain
    currentNode.next = newNode;

    setEvents((prev) => [...prev]);
    setCurrentNode(newNode);
  }

  // --- logic setters
  function setDrive(type: DriveType) {
    if (!currentNode) return;
    currentNode.drive = type;
    setEvents([...events]);
  }

  function setLane(lane: LaneType) {
    if (!currentNode) return;
    currentNode.lane = lane;
    setEvents([...events]);
  }

  function setHelp(help: HelpType) {
    if (!currentNode) return;
    currentNode.help = help;
    setEvents([...events]);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={src}
        controls
        className="w-full rounded-xl border border-neutral-700"
      />

      {/* TIMELINE (single playhead) */}
      <div className="relative h-12 rounded-xl bg-neutral-800 px-2 flex items-center">
        {events.map((e) => (
          <div
            key={e.id}
            className="absolute top-2 h-8 w-2 rounded bg-lime-400"
            style={{
              left: `${(e.time / (videoRef.current?.duration || 1)) * 100}%`,
            }}
          />
        ))}
      </div>

      {/* PRIMARY ACTIONS */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => handleEvent("shot")} className="btn-blue">
          Shot
        </button>
        <button onClick={() => handleEvent("pass")} className="btn-purple">
          Pass
        </button>
        <button onClick={() => handleEvent("drive")} className="btn-green">
          Drive
        </button>
        <button onClick={() => handleEvent("turnover")} className="btn-red">
          Turnover
        </button>
        <button onClick={() => handleEvent("foul")} className="btn-yellow">
          Foul
        </button>
        <button onClick={() => handleEvent("reset")} className="btn-gray">
          Reset
        </button>
      </div>

      {/* CONTEXT LOGIC */}
      {currentNode && (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-neutral-700">
          <div className="text-sm text-neutral-400">
            Selected: {currentNode.type}
          </div>

          {/* DRIVE TYPE */}
          {currentNode.type === "drive" && (
            <div className="flex gap-2">
              <button onClick={() => setDrive("downhill")} className="btn-green">
                Downhill
              </button>
            </div>
          )}

          {/* LANE */}
          <div className="flex gap-2">
            <button onClick={() => setLane("left")} className="btn-gray">
              Left
            </button>
            <button onClick={() => setLane("middle")} className="btn-gray">
              Middle
            </button>
            <button onClick={() => setLane("right")} className="btn-gray">
              Right
            </button>
          </div>

          {/* HELP */}
          <div className="flex gap-2">
            <button onClick={() => setHelp("help")} className="btn-red">
              Help
            </button>
            <button onClick={() => setHelp("no-help")} className="btn-green">
              No Help
            </button>
          </div>
        </div>
      )}

      {/* CHAIN VIEW */}
      <div className="p-4 rounded-xl border border-neutral-700 text-sm">
        <div className="mb-2 text-neutral-400">Possession Chain</div>

        {events.map((e) => (
          <div key={e.id}>
            {e.type} →{" "}
            {e.next ? e.next.type : <span className="text-neutral-500">end</span>}
          </div>
        ))}
      </div>
    </div>
  );
}