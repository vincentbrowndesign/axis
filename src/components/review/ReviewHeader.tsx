"use client";

type Props = {
  title: string;
  onBack?: () => void;
  onSave?: () => void;
  canSave?: boolean;
};

export default function ReviewHeader({
  title,
  onBack,
  onSave,
  canSave = false,
}: Props) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-white/8 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white"
      >
        Back
      </button>

      <div className="min-w-0 flex-1 text-center">
        <div className="truncate text-sm text-white/55">{title}</div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className="rounded-full bg-lime-300 px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        Save
      </button>
    </header>
  );
}