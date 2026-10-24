import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type Detent = 'MEDIUM' | 'LARGE';

interface Props {
  title: string;
  detent: Detent;
  onDetent: (d: Detent) => void;
  onClose: () => void;
  /** Distance from the bottom of the screen (e.g. the floating tab bar). */
  bottom: number;
  /** Right-hand panel instead of a bottom sheet (landscape phones). */
  side?: boolean;
  children: ReactNode;
}

/** iOS-style sheet with a grabber and two detents. Drag the handle; swipe down to dismiss. */
export default function Sheet({ title, detent, onDetent, onClose, bottom, side = false, children }: Props) {
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number } | null>(null);
  const [vh, setVh] = useState(() => window.innerHeight);
  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const top = 'max(56px, calc(env(safe-area-inset-top) + 48px))';
  const medium = Math.round(vh * 0.5);
  const large = Math.round(vh - bottom - 64 - (typeof window !== 'undefined' ? 0 : 0));
  const height = drag ?? (detent === 'LARGE' ? large : medium);

  if (side) {
    return (
      <aside
        className="glass-strong pointer-events-auto absolute bottom-2 right-[max(8px,env(safe-area-inset-right))] top-[max(8px,env(safe-area-inset-top))] flex w-[min(46vw,400px)] flex-col overflow-hidden rounded-[26px]"
        aria-label={title}
      >
        <header className="flex items-center justify-between px-4 pb-1 pt-3">
          <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
          <button className="touch-target flex h-11 w-11 items-center justify-center rounded-full bg-white/10" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">{children}</div>
      </aside>
    );
  }

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, h: detent === 'LARGE' ? large : medium };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const h = start.current.h - (e.clientY - start.current.y);
    setDrag(Math.max(120, Math.min(large, h)));
  };
  const onUp = () => {
    if (!start.current || drag === null) {
      start.current = null;
      return;
    }
    const h = drag;
    start.current = null;
    setDrag(null);
    if (h < medium * 0.62) onClose();
    else onDetent(h > (medium + large) / 2 ? 'LARGE' : 'MEDIUM');
  };

  return (
    <section
      className="glass-strong pointer-events-auto absolute inset-x-2 flex flex-col overflow-hidden rounded-[28px]"
      style={{
        bottom: `calc(${bottom}px + env(safe-area-inset-bottom))`,
        height,
        maxHeight: `calc(100dvh - ${top})`,
        transition: drag === null ? 'height 320ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
      }}
      aria-label={title}
    >
      <div className="touch-none select-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-white/35" />
        <header className="flex items-center justify-between px-4 pb-1 pt-2">
          <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
          <button
            className="touch-target flex h-11 w-11 items-center justify-center rounded-full bg-white/10"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">{children}</div>
    </section>
  );
}
