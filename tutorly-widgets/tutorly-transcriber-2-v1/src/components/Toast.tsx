import React, { useEffect, useState } from 'react';
import { cn } from '../utils/cn';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss
    const dur = toast.duration ?? (toast.type === 'error' ? 6000 : 4000);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, dur);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const colors = {
    error: 'bg-red-900 border-red-700 text-red-100',
    success: 'bg-emerald-900 border-emerald-700 text-emerald-100',
    info: 'bg-slate-800 border-slate-700 text-slate-100',
    warning: 'bg-amber-900 border-amber-700 text-amber-100',
  };

  const icons = {
    error: <AlertCircle size={16} className="text-red-400 shrink-0" />,
    success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
    info: <Info size={16} className="text-blue-400 shrink-0" />,
    warning: <AlertCircle size={16} className="text-amber-400 shrink-0" />,
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-sm transition-all duration-300',
        colors[toast.type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      {icons[toast.type]}
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        className="p-0.5 rounded-md hover:bg-white/10 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

let toastIdCounter = 0;
export function createToast(type: ToastType, message: string, duration?: number): ToastMessage {
  return { id: `toast-${++toastIdCounter}`, type, message, duration };
}
