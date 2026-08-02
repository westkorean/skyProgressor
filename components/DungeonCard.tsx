import type { ReactNode } from 'react';
import PixelLock from './PixelLock';

export default function DungeonCard({ title, value, detail, lockedReason }: { title: string; value: ReactNode; detail?: ReactNode; lockedReason?: string }) {
  return <div className="relative rounded-lg border border-neutral-800 bg-neutral-950 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-neutral-600"><div className="flex items-start justify-between gap-2"><div className="text-xs text-neutral-500">{title}</div>{lockedReason && <PixelLock reason={lockedReason} compact />}</div><div className="font-semibold mt-1">{value}</div>{detail && <div className="text-xs text-neutral-400 mt-1">{detail}</div>}</div>;
}
