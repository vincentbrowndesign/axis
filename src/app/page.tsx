"use client";

import { useRouter } from "next/navigation";

export default function Page() {
const router = useRouter();

return (
<main className="min-h-screen bg-black text-white px-6 py-12 flex flex-col items-center">

{/* HERO */}
<section className="max-w-xl w-full text-center space-y-6">
<h1 className="text-4xl font-semibold tracking-tight">
Every possession. Measured.
</h1>

<p className="text-white/60 text-lg">
See what actually happened.
Not what you thought happened.
</p>

<div className="flex gap-4 justify-center pt-4">
<button
onClick={() => router.push("/review")}
className="px-6 py-3 rounded-xl bg-lime-500 text-black font-medium"
>
Start Session
</button>

<button
onClick={() => router.push("/review")}
className="px-6 py-3 rounded-xl border border-white/20 text-white/80"
>
Watch Breakdown
</button>
</div>
</section>

{/* PROOF */}
<section className="max-w-xl w-full mt-16 space-y-4">
<div className="text-white/40 text-sm text-center">
Clip → Tags → Chain → Insight
</div>

<div className="rounded-2xl border border-white/10 p-6 bg-white/5 space-y-3">
<div className="flex flex-wrap gap-2 text-sm">
<span className="px-3 py-1 rounded-full bg-white/10">Player A</span>
<span className="px-3 py-1 rounded-full bg-white/10">Downhill</span>
<span className="px-3 py-1 rounded-full bg-white/10">Help</span>
<span className="px-3 py-1 rounded-full bg-white/10">Pass</span>
</div>

<div className="text-lg font-medium">
Missed scoring window
</div>

<div className="text-white/50 text-sm">
Downhill + no help → finish available
</div>
</div>

<p className="text-center text-white/50 text-sm">
Decisions become visible.
</p>
</section>

{/* WHAT IT DOES */}
<section className="max-w-xl w-full mt-16 grid gap-6">

<div className="space-y-2">
<h3 className="text-lg font-medium">Track</h3>
<p className="text-white/50 text-sm">
Tag possessions in seconds. No typing. No friction.
</p>
</div>

<div className="space-y-2">
<h3 className="text-lg font-medium">Read</h3>
<p className="text-white/50 text-sm">
Detect scoring windows, help reads, and missed decisions.
</p>
</div>

<div className="space-y-2">
<h3 className="text-lg font-medium">Improve</h3>
<p className="text-white/50 text-sm">
Clear feedback on what happened and what to fix next.
</p>
</div>

</section>

{/* CTA */}
<section className="mt-20 text-center space-y-4">
<h2 className="text-2xl font-medium">
Start tracking your games.
</h2>

<button
onClick={() => router.push("/review")}
className="px-8 py-4 rounded-xl bg-lime-500 text-black font-medium"
>
Start Session
</button>
</section>

</main>
);
}
