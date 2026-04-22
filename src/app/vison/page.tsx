import dynamic from "next/dynamic";

const VisionOverlay = dynamic(() => import("@/components/VisionOverlay"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-6 py-5 text-sm text-white/70">
          Loading vision overlay…
        </div>
      </div>
    </main>
  ),
});

export default function Page() {
  return <VisionOverlay />;
}