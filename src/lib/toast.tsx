import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; variant: ToastVariant };

const ToastContext = createContext<{ toast: (message: string, variant?: ToastVariant) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-white/[0.08] bg-ink-800/90 p-3.5 shadow-soft backdrop-blur-xl animate-scale-in"
          >
            {t.variant === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />}
            {t.variant === 'error' && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
            {t.variant === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />}
            <p className="flex-1 text-sm text-ink-50">{t.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-ink-300 transition hover:text-white"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
