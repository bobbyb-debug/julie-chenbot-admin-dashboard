"use client";

import { CheckCircle2, X, XCircle, Info } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

const ToastContext = createContext<{ push: (message: string, variant?: ToastVariant) => void } | null>(
  null,
);

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLORS: Record<ToastVariant, string> = {
  success: "var(--status-healthy)",
  error: "var(--status-problem)",
  info: "var(--accent-strong)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-border-default bg-bg-elevated px-4 py-3 text-sm text-text-primary shadow-xl"
            >
              <Icon size={16} strokeWidth={2} style={{ color: COLORS[t.variant] }} className="mt-0.5 shrink-0" aria-hidden />
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-text-muted hover:text-text-primary"
                aria-label="Dismiss notification"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used within <ToastProvider>.");
  }
  return ctx;
}
