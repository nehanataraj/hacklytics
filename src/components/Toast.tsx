'use client';

import { useState, useCallback, useRef } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastState = {
  id: number;
  message: string;
  kind: ToastKind;
} | null;

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01" />
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
    </svg>
  ),
};

const STYLES: Record<ToastKind, string> = {
  success: 'bg-gray-900 border-gray-600 text-white',
  error: 'bg-gray-900 border-gray-600 text-white',
  info: 'bg-gray-900 border-gray-600 text-white',
};

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-start gap-2.5 px-4 py-3 shadow-2xl border text-sm font-medium max-w-sm backdrop-blur-sm ${STYLES[toast.kind]}`}
    >
      {ICONS[toast.kind]}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1 leading-none"
      >
        ✕
      </button>
    </div>
  );
}

const AUTO_DISMISS_MS = 4000;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterRef = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++counterRef.current;
    setToast({ id, message, kind });
    timerRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, show, dismiss } as const;
}
