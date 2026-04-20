// src/app/page.tsx

"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen px-10 py-12 flex flex-col justify-between">
      
      {/* HEADER */}
      <div className="flex justify-between items-center text-sm text-neutral-400">
        <div>
          <div className="text-xs tracking-widest text-neutral-500">AXIS</div>
          <div className="text-neutral-300">Review System</div>
        </div>

        <button
          onClick={() => router.push("/review")}
          className="border border-white/20 px-4 py-2 rounded-lg hover:bg-white/10 transition"
        >
          Open Review
        </button>
      </div>

      {/* HERO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mt-16">
        
        {/* LEFT SIDE */}
        <div>
          <div className="text-xs tracking-widest axis-accent mb-3">AXIS</div>

          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Review possessions.
            <br />
            Tag decisions.
            <br />
            Build the dataset.
          </h1>

          <p className="text-neutral-400 mt-6 max-w-md">
            Axis turns live basketball footage into structured review. Upload a session,
            mark the possession, track the decision chain, and turn real actions into usable signal.
          </p>

          {/* CTA */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => router.push("/review")}
              className="bg-lime-400 text-black px-5 py-3 rounded-lg font-medium hover:opacity-90"
            >
              Start Review
            </button>

            <button
              onClick={() => router.push("/review")}
              className="border border-white/20 px-5 py-3 rounded-lg hover:bg-white/10"
            >
              Upload Game
            </button>
          </div>

          {/* FEATURES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            
            <div className="card p-4 rounded-xl">
              <div className="text-xs text-neutral-400 mb-2">CAPTURE</div>
              <div className="text-sm">
                Upload game or practice video into one review workspace.
              </div>
            </div>

            <div className="card p-4 rounded-xl">
              <div className="text-xs text-neutral-400 mb-2">TAG</div>
              <div className="text-sm">
                Mark drive, pass, shot, turnover, help, lane, and result.
              </div>
            </div>

            <div className="card p-4 rounded-xl">
              <div className="text-xs text-neutral-400 mb-2">BUILD</div>
              <div className="text-sm">
                Turn possessions into linked logic, clips, and session memory.
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT SIDE (PREVIEW CARD) */}
        <div className="card p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-xs text-neutral-400">AXIS REVIEW</div>
              <div className="text-sm">Possession Instrument</div>
            </div>

            <div className="bg-lime-400 text-black text-xs px-2 py-1 rounded">
              Live Logic
            </div>
          </div>

          {/* VIDEO PLACEHOLDER */}
          <div className="h-40 bg-black/40 rounded-lg mb-6" />

          {/* TIMELINE */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>0:42</span>
              <span>4:18</span>
            </div>

            <div className="h-2 bg-white/10 rounded-full relative">
              <div className="absolute left-[30%] top-[-4px] w-2 h-4 bg-purple-400 rounded"></div>
              <div className="absolute left-[55%] top-[-4px] w-2 h-4 bg-green-400 rounded"></div>
              <div className="absolute left-[70%] top-[-4px] w-2 h-4 bg-yellow-400 rounded"></div>
            </div>
          </div>

          {/* TAG BUTTONS */}
          <div className="flex flex-wrap gap-2">
            <span className="bg-blue-500 px-3 py-1 rounded text-sm">Shot</span>
            <span className="bg-purple-500 px-3 py-1 rounded text-sm">Pass</span>
            <span className="bg-green-500 px-3 py-1 rounded text-sm">Drive</span>
            <span className="bg-yellow-500 px-3 py-1 rounded text-sm">Downhill</span>
            <span className="bg-neutral-700 px-3 py-1 rounded text-sm">Middle</span>
            <span className="bg-neutral-700 px-3 py-1 rounded text-sm">No Help</span>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="text-xs text-neutral-500 mt-12">
        Axis ©
      </div>
    </main>
  );
}