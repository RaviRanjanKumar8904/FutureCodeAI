import { Clock, X } from 'lucide-react';
import { formatDateFull } from '../../../utils/webinarSchedule';

export interface PostponeDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateTarget: string;
  reason: string;
  setReason: (val: string) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function PostponeDayModal({
  isOpen,
  onClose,
  dateTarget,
  reason,
  setReason,
  onConfirm,
  isSubmitting,
}: PostponeDayModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-extrabold text-lg">
              ⏸️
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Postpone Session</h2>
              <p className="text-xs text-slate-500 font-medium">{formatDateFull(dateTarget)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-1">
            <p className="font-extrabold text-xs">ℹ️ Schedule Extension</p>
            <p className="text-xs text-amber-800">
              Postponing this session shifts subsequent sessions by +1 day, extending the bootcamp end date automatically.
              Students will see this day marked as Postponed.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Reason for Postponement <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-bold text-slate-900 bg-white text-xs sm:text-sm cursor-pointer mb-2"
            >
              <option value="Instructor Unavailable">Instructor Unavailable</option>
              <option value="National / Public Holiday">National / Public Holiday</option>
              <option value="Technical Maintenance & Upgrades">Technical Maintenance & Upgrades</option>
              <option value="Exam Preparation Break">Exam Preparation Break</option>
              <option value="Custom">Other / Custom Reason</option>
            </select>

            {reason === 'Custom' && (
              <input
                type="text"
                placeholder="Enter custom reason..."
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm"
              />
            )}
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-gray-200 hover:bg-slate-100 transition-colors text-xs sm:text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs sm:text-sm hover:bg-amber-700 transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Postponing...</span>
              </>
            ) : (
              <>
                <Clock size={15} />
                <span>Confirm Postponement (+1d)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
