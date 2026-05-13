import React, { createContext, useContext, useCallback, useState, useRef } from 'react';

// ─── Toast Types ──────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number; // ms, default 3000
}

interface ToastContextType {
  items: ToastItem[];
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const MAX_TOASTS = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((variant: ToastVariant, title: string, message?: string, duration?: number) => {
    const id = ++idRef.current;
    setItems((prev) => {
      const next = [...prev, { id, variant, title, message, duration: duration ?? 3000 }];
      // Keep max 3 visible — remove oldest if exceeding
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
    return id;
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => push('success', title, message, duration), [push]);
  const error   = useCallback((title: string, message?: string, duration?: number) => push('error', title, message, duration), [push]);
  const info    = useCallback((title: string, message?: string, duration?: number) => push('info', title, message, duration), [push]);
  const warning = useCallback((title: string, message?: string, duration?: number) => push('warning', title, message, duration), [push]);

  return (
    <ToastContext.Provider value={{ items, success, error, info, warning, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
