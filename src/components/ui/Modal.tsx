import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
          <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-stone-100 shrink-0 flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
