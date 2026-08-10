export default function PixelLock({ reason, compact = false }: { reason: string; compact?: boolean }) {
  return (
    <span className="group/lock relative inline-flex shrink-0 items-center" tabIndex={0} aria-label={`Locked: ${reason}`}>
      <span aria-hidden="true" className={`${compact ? 'h-5 w-5' : 'h-8 w-8'} grid place-items-center border-2 border-amber-500 bg-neutral-950 text-amber-300 shadow-[2px_2px_0_#78350f] [image-rendering:pixelated]`}>
        <span className={`relative block ${compact ? 'h-3 w-2.5' : 'h-4 w-3.5'}`}>
          <span className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-t-sm border-amber-300 ${compact ? 'h-1.5 w-2 border-x border-t' : 'h-2 w-2.5 border-x-2 border-t-2'}`} />
          <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 bg-amber-300 ${compact ? 'h-2 w-2.5' : 'h-2.5 w-3.5'}`} />
        </span>
      </span>
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-64 -translate-x-1/2 border border-amber-700 bg-neutral-950 p-2 text-left text-[11px] leading-4 text-amber-100 shadow-[4px_4px_0_#000] group-hover/lock:block group-focus/lock:block">
        <span className="font-bold uppercase text-amber-400">Locked</span><br />{reason}
      </span>
    </span>
  );
}
