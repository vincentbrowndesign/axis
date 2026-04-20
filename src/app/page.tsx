import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#1b2128] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-white/8 pb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-white/35">
              Axis
            </div>
            <div className="mt-1 text-sm font-medium text-white/85">
              Review System
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/review"
              className="rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10"
            >
              Open Review
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.3em] text-lime-300/75">
              Axis
            </div>

            <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl">
              Review possessions.
              <br />
              Tag decisions.
              <br />
              Build the dataset.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/62">
              Axis turns live basketball footage into structured review. Upload
              a session, mark the possession, track the decision chain, and
              turn real actions into usable signal.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/review"
                className="rounded-2xl bg-lime-300 px-5 py-3 text-sm font-medium text-black transition hover:bg-lime-200"
              >
                Start Review
              </Link>

              <Link
                href="/review"
                className="rounded-2xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white/88 transition hover:bg-white/10"
              >
                Upload Game
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                  Capture
                </div>
                <div className="mt-3 text-sm text-white/82">
                  Upload game or practice video into one review workspace.
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                  Tag
                </div>
                <div className="mt-3 text-sm text-white/82">
                  Mark drive, pass, shot, turnover, help, lane, and result.
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                  Build
                </div>
                <div className="mt-3 text-sm text-white/82">
                  Turn possessions into linked logic, clips, and session memory.
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[32px] border border-white/10 bg-[#242b34] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
              <div className="rounded-[24px] border border-white/8 bg-[#11161d] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/35">
                      Axis Review
                    </div>
                    <div className="mt-1 text-sm text-white/85">
                      Possession Instrument
                    </div>
                  </div>

                  <div className="rounded-full bg-lime-300/12 px-3 py-1 text-xs text-lime-200">
                    Live Logic
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-[24px] border border-white/8 bg-black">
                  <div className="aspect-video w-full bg-[radial-gradient(circle_at_top,#2d3642_0%,#11161d_55%,#0a0d11_100%)]" />
                </div>

                <div className="mt-4 rounded-2xl border border-white/8 bg-[#1a2028] p-4">
                  <div className="mb-3 flex items-center justify-between text-xs text-white/45">
                    <span>0:42</span>
                    <span>4:18</span>
                  </div>

                  <div className="relative h-14 rounded-2xl border border-white/10 bg-[#242b34]">
                    <div className="absolute left-3 right-3 top-1/2 h-[2px] -translate-y-1/2 bg-white/12" />
                    <div className="absolute left-[18%] top-1/2 h-8 w-3 -translate-y-1/2 rounded-full border border-violet-100/50 bg-violet-300" />
                    <div className="absolute left-[36%] top-1/2 h-8 w-3 -translate-y-1/2 rounded-full border border-emerald-100/50 bg-emerald-300" />
                    <div className="absolute left-[57%] top-1/2 h-8 w-3 -translate-y-1/2 rounded-full border border-amber-100/50 bg-amber-300" />
                    <div className="absolute left-[44%] top-1/2 h-11 w-[2px] -translate-y-1/2 bg-white shadow-[0_0_16px_rgba(255,255,255,0.35)]" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="rounded-xl border border-sky-400/30 bg-sky-400/14 px-4 py-2 text-sm text-sky-100">
                      Shot
                    </div>
                    <div className="rounded-xl border border-violet-400/30 bg-violet-400/14 px-4 py-2 text-sm text-violet-100">
                      Pass
                    </div>
                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/14 px-4 py-2 text-sm text-emerald-100">
                      Drive
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/82">
                      Downhill
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/82">
                      Middle
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/82">
                      No Help
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -left-6 top-10 h-28 w-28 rounded-full bg-lime-300/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-6 right-0 h-28 w-28 rounded-full bg-sky-300/10 blur-3xl" />
          </div>
        </section>
      </div>
    </main>
  );
}