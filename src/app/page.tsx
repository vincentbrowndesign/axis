import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#0a1220] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/35">Axis</p>
            <p className="mt-1 text-lg text-white/85">Review System</p>
          </div>

          <Link
            href="/review"
            className="rounded-2xl border border-white/15 px-5 py-3 text-sm text-white/85 transition hover:border-white/30"
          >
            Open Review
          </Link>
        </header>

        <section className="grid gap-10 py-12 md:py-16 lg:grid-cols-[1fr_460px] lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-lime-400">Axis</p>

            <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
              Turn decisions
              <br />
              into signal.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/58">
              Upload a session. Review possessions. Tag the decision chain. Build cards, branches,
              and usable signal from real play.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/review"
                className="rounded-2xl bg-lime-400 px-6 py-4 text-base font-medium text-black transition hover:opacity-90"
              >
                Start Review
              </Link>

              <Link
                href="/review"
                className="rounded-2xl border border-white/15 px-6 py-4 text-base text-white/90 transition hover:border-white/30"
              >
                Upload Game
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">Capture</p>
                <p className="mt-3 text-lg text-white/90">
                  Upload game or practice video into one review workspace.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">Tag</p>
                <p className="mt-3 text-lg text-white/90">
                  Mark drive, pass, shot, turnover, help, lane, and result.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">Build</p>
                <p className="mt-3 text-lg text-white/90">
                  Turn possessions into linked logic, cards, and session memory.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">Axis Review</p>
                <p className="mt-1 text-2xl text-white/95">Possession Instrument</p>
              </div>

              <div className="rounded-xl bg-lime-400 px-3 py-2 text-sm font-medium text-black">
                Live Logic
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/8 bg-black/50 p-4">
              <div className="aspect-video rounded-xl bg-gradient-to-br from-[#111827] to-black" />

              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div className="h-2 w-[42%] rounded-full bg-white/80" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {["Shot", "Pass", "Drive", "Downhill", "Middle", "No Help"].map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-white/85"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}