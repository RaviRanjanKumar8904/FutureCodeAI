import { AlertTriangle, Trash2, Award, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 text-rose-600',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
          icon: <Trash2 size={24} />,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-600',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
          icon: <AlertTriangle size={24} />,
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-indigo-100 text-indigo-600',
          btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
          icon: <Award size={24} />,
        };
    }
  };

  const style = getVariantStyles();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center z-[1100] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative my-auto border border-gray-100 p-6 text-center"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${style.iconBg} flex items-center justify-center mx-auto mb-4 shadow-inner`}>
            {style.icon}
          </div>

          {/* Text */}
          <h3 className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 ${style.btnBg}`}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
