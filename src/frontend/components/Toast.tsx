import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  notify: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const TOAST_STYLES: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: '#064e3b', border: '#34d399' },
  error: { bg: '#450a0a', border: '#f87171' },
  info: { bg: '#0c4a6e', border: '#22d3ee' },
  warning: { bg: '#451a03', border: '#fbbf24' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: 400,
        }}
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: 12,
                padding: '14px 18px',
                color: '#f1f5f9',
                fontSize: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                animation: 'toastIn 0.2s ease',
              }}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
