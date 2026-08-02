export default function PixelLock({ reason, compact = false }: { reason: string; compact?: boolean }) {
  return (
    <span className="group/lock relative inline-flex shrink-0 items-center" tabIndex={0} aria-label={`Locked: ${reason}`}>
      <span aria-hidden="true" className={`${compact ? 'h-5 w-5 text-[11px]' : 'h-8 w-8 text-sm'} grid place-items-center border-2 border-amber-500 bg-neutral-950 text-amber-300 shadow-[2px_2px_0_#78350f] [image-rendering:pixelated]`}>▣</span>
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-64 -translate-x-1/2 border border-amber-700 bg-neutral-950 p-2 text-left text-[11px] leading-4 text-amber-100 shadow-[4px_4px_0_#000] group-hover/lock:block group-focus/lock:block">
        <span className="font-bold uppercase text-amber-400">Locked</span><br />{reason}
      </span>
    </span>
  );
}
