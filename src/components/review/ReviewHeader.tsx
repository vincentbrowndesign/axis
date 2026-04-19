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
    <header className="sticky top-0 z-20 border-b border-white/8 bg-black/80 pb-3 pt-1 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-9 rounded-full border border-white/10 px-4 text-xs text-white/70"
        >
          Back
        </button>

        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-sm text-white/62">{title}</div>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="h-9 rounded-full bg-lime-300 px-4 text-xs font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </header>
  );
}