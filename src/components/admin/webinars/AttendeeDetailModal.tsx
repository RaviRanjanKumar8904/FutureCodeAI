import { Check, X, Award, User } from 'lucide-react';
import type { WebinarAttendee, WebinarItem } from './types';
import { formatDateShort } from '../../../utils/webinarSchedule';

export interface AttendeeDetailModalProps {
  attendee: WebinarAttendee | null;
  selectedWebinar: WebinarItem | null;
  activeSessionDates: string[];
  onClose: () => void;
  onToggleAttendance: (attendee: WebinarAttendee, dateStr: string) => void;
  onIssueCertificate: (attendee: WebinarAttendee) => void;
  computeStats: (
    attendee: WebinarAttendee,
    totalDays: number
  ) => { presentDays: number; percentage: number; isEligible: boolean; daysNeededFor75: number };
}

export default function AttendeeDetailModal({
  attendee,
  selectedWebinar,
  activeSessionDates,
  onClose,
  onToggleAttendance,
  onIssueCertificate,
  computeStats,
}: AttendeeDetailModalProps) {
  if (!attendee || !selectedWebinar) return null;

  const totalDays = selectedWebinar.totalDays || 15;
  const { presentDays, percentage, isEligible, daysNeededFor75 } = computeStats(attendee, totalDays);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 font-bold">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold text-slate-900">{attendee.studentName}</h2>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                {attendee.email} {attendee.collegeName ? `• ${attendee.collegeName}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-none space-y-4 text-xs sm:text-sm">
          {/* Summary Stats Badge */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isEligible ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            }`}
          >
            <div>
              <p className={`font-black text-sm ${isEligible ? 'text-emerald-900' : 'text-rose-900'}`}>
                Attendance: {percentage}% ({presentDays} of {totalDays} Days Attended)
              </p>
              <p className={`text-xs mt-0.5 ${isEligible ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isEligible
                  ? '✅ Eligible for Course Completion Certificate (>= 75%)'
                  : `❌ Ineligible for Certificate (Need ${daysNeededFor75} more days to reach 75%)`}
              </p>
            </div>

            {!attendee.certificateIssued && isEligible && (
              <button
                onClick={() => onIssueCertificate(attendee)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Award size={14} />
                <span>Issue Cert</span>
              </button>
            )}
          </div>

          <p className="font-bold text-slate-800 text-xs sm:text-sm">
            Tap any day to toggle attendance (Present / Absent):
          </p>

          {/* Days Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {activeSessionDates.map((dateStr, idx) => {
              const isPresent = attendee.dailyAttendance?.[dateStr] === 'Present';

              return (
                <button
                  key={dateStr}
                  onClick={() => onToggleAttendance(attendee, dateStr)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between active:scale-95 ${
                    isPresent
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Day {idx + 1}</span>
                    <span className="font-bold text-xs truncate block">{formatDateShort(dateStr)}</span>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ml-1.5 ${
                      isPresent ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isPresent ? <Check size={13} /> : <X size={13} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
