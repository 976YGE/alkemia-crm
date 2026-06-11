import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'error', onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    error: {
      bg: 'bg-white',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      accent: 'bg-red-500'
    },
    success: {
      bg: 'bg-white',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
      accent: 'bg-emerald-500'
    },
    info: {
      bg: 'bg-white',
      border: 'border-brand-200',
      text: 'text-brand-700',
      icon: <Info className="w-5 h-5 text-brand-500" />,
      accent: 'bg-brand-500'
    }
  };

  const style = styles[type];

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`${style.bg} ${style.border} border rounded-xl shadow-float p-4 pr-10 max-w-md min-w-[320px] overflow-hidden relative`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${style.accent}`} />
        <div className="flex items-start gap-3">
          {style.icon}
          <p className={`${style.text} text-sm flex-1`}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-black/5 rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
