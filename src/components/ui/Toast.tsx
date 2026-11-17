import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/domain';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastCtx {
  notify: (message: string, kind?: ToastKind) => void;
}

const Ctx = createContext<ToastCtx>({ notify: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const tm = timers.current.get(id);
    if (tm) clearTimeout(tm);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      seq.current += 1;
      const id = seq.current;
      setToasts((t) => [...t.slice(-3), { id, kind, message }]);
      timers.current.set(id, setTimeout(() => dismiss(id), kind === 'error' ? 6500 : 3500));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <Ctx.Provider value={{ notify }}>
      {children}
      {createPortal(
        <section aria-live="polite" aria-label="Bildirimler" className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end">
          {toasts.map((t) => {
            const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertTriangle : Info;
            return (
              <output
                key={t.id}
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg',
                  t.kind === 'success' && 'border-emerald-200',
                  t.kind === 'error' && 'border-red-200',
                  t.kind === 'info' && 'border-sky-200',
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn('mt-0.5 size-5 shrink-0', t.kind === 'success' && 'text-emerald-600', t.kind === 'error' && 'text-red-600', t.kind === 'info' && 'text-sky-600')}
                />
                <span className="flex-1 text-slate-800">{t.message}</span>
                <button type="button" onClick={() => dismiss(t.id)} aria-label="Bildirimi kapat" className="rounded p-0.5 text-slate-500 hover:bg-slate-100">
                  <X aria-hidden="true" className="size-4" />
                </button>
              </output>
            );
          })}
        </section>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(Ctx);
