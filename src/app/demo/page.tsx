"use client";

import { useRouter } from "next/navigation";

const chain = [
"Player A",
"Middle",
"Downhill",
"No Help",
"Pass",
"Player B",
"Keep live",
"Right",
"No Help",
"Finish",
"Make",
];

const stats = [
{ label: "Possessions", value: "12" },
{ label: "Correct reads", value: "7" },
{ label: "Missed windows", value: "3" },
{ label: "Turnovers", value: "2" },
];

export default function DemoPage() {
const router = useRouter();

return (
<main className="min-h-screen bg-black text-white">
<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
<header className="flex flex-col gap-4 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
<div>
<p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Axis</p>
<h1 className="text-2xl font-semibold tracking-tight">Demo Breakdown</h1>
</div>

<div className="flex gap-3">
<button
onClick={() => router.push("/review")}
className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
>
Start Session
</button>
<button
onClick={() => router.push("/")}
className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/85 transition hover:border-white/20"
>
Back Home
</button>
</div>
</header>

<section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
<div className="space-y-6">
<div className="overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03]">
<div className="flex aspect-video items-center justify-center bg-neutral-950 text-white/35">
Demo clip
</div>
<div className="border-t border-white/8 px-4 py-4">
<div className="flex items-center justify-between text-xs text-white/45">
<span>0:03</span>
<span>0:11</span>
</div>
<div className="mt-3 h-1.5 rounded-full bg-white/8">
<div className="h-1.5 w-[62%] rounded-full bg-white" />
</div>
</div>
</div>

<div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
<p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Chain</p>
<div className="mt-4 flex flex-wrap gap-2">
{chain.map((item, index) => (
<span
key={`${item}-${index}`}
className={`rounded-full border px-3 py-1.5 text-sm ${
item === "Pass" || item === "Keep live"
? "border-lime-400/30 bg-lime-400/[0.08] text-lime-100"
: item === "Make"
? "border-white/16 bg-white/[0.08] text-white"
: "border-white/8 bg-white/[0.04] text-white/82"
}`}
>
{item}
</span>
))}
</div>
</div>

<div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
<p className="text-[10px] uppercase tracking-[0.24em] text-white/35">What the system saw</p>
<div className="mt-4 grid gap-3 sm:grid-cols-2">
{stats.map((stat) => (
<div
key={stat.label}
className="rounded-2xl border border-white/8 bg-black/30 px-4 py-4"
>
<p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
{stat.label}
</p>
<p className="mt-2 text-2xl font-medium text-white">{stat.value}</p>
</div>
))}
</div>
</div>
</div>

<div className="space-y-6">
<div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
<p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Read</p>
<div className="mt-4 flex items-center justify-between rounded-xl border border-lime-400/40 bg-lime-400/[0.08] px-3 py-3">
<span className="text-sm text-white/75">Decision quality</span>
<span className="rounded-full border border-lime-400/40 bg-lime-400/10 px-2.5 py-1 text-xs font-medium text-lime-300">
Correct
</span>
</div>
</div>

<div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
<p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Why</p>
<p className="mt-4 text-lg leading-8 text-white/90">
Player A created an advantage, moved the defense, and passed into a live finish.
</p>
</div>

<div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
<p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Next</p>
<p className="mt-4 text-lg leading-8 text-white/90">
Keep forcing rotations, but convert no-help windows earlier.
</p>
</div>

<div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
<p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Pattern</p>
<p className="mt-4 text-white/85">
The system is tracking whether pressure creates the right pass, whether players miss clean finishes,
and who creates versus who converts the edge.
</p>
</div>

<div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
<p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Call to action</p>
<div className="mt-4 flex flex-col gap-3">
<button
onClick={() => router.push("/review")}
className="rounded-xl bg-lime-400 px-4 py-3 text-sm font-medium text-black transition hover:opacity-90"
>
Start Your Session
</button>
<button
onClick={() => router.push("/")}
className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/85 transition hover:border-white/20"
>
Back to Landing
</button>
</div>
</div>
</div>
</section>
</div>
</main>
);
}
