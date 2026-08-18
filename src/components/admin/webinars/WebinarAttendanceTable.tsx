import {
  Users, Upload, School, CheckCircle2, XCircle, History, Award, Sparkles, AlertCircle, Trash2, Mail, Phone
} from 'lucide-react';
import type { WebinarAttendee, WebinarItem } from './types';
import { formatDateFull, formatDateShort } from '../../../utils/webinarSchedule';

export interface WebinarAttendanceTableProps {
  displayedAttendees: WebinarAttendee[];
  selectedWebinar: WebinarItem;
  activeDate: string;
  selectedIds: string[];
  onToggleSelectId: (id: string) => void;
  onSelectAll: () => void;
  onToggleDailyAttendance: (attendee: WebinarAttendee, dateStr: string) => void;
  onOpenDetailStudent: (attendee: WebinarAttendee) => void;
  onIssueCertificate: (attendee: WebinarAttendee) => void;
  onDeleteAttendee: (attendee: WebinarAttendee) => void;
  onPromoteAttendee: (attendee: WebinarAttendee) => void;
  onImportCsv: () => void;
  computeStats: (
    attendee: WebinarAttendee,
    totalDays: number
  ) => { presentDays: number; percentage: number; isEligible: boolean; daysNeededFor75: number };
}

function getInitials(name: string): string {
  if (!name) return 'S';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function WebinarAttendanceTable({
  displayedAttendees,
  selectedWebinar,
  activeDate,
  selectedIds,
  onToggleSelectId,
  onSelectAll,
  onToggleDailyAttendance,
  onOpenDetailStudent,
  onIssueCertificate,
  onDeleteAttendee,
  onPromoteAttendee,
  onImportCsv,
  computeStats,
}: WebinarAttendanceTableProps) {
  if (displayedAttendees.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden py-16 px-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Users size={28} />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900 mb-1">No Students Match Criteria</h3>
        <p className="text-xs text-slate-500 font-medium mb-6">
          Try adjusting your filter or import Google Form CSV responses.
        </p>
        <button
          onClick={onImportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-md active:scale-95 cursor-pointer"
        >
          <Upload size={15} />
          <span>Import Google Form CSV</span>
        </button>
      </div>
    );
  }

  const totalDays = selectedWebinar.totalDays || 15;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length === displayedAttendees.length && displayedAttendees.length > 0}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  aria-label="Select all students"
                />
              </th>
              <th className="p-4">Student &amp; College</th>
              <th className="p-4">
                Attendance on <span className="text-purple-700 font-black">{formatDateFull(activeDate)}</span>
              </th>
              <th className="p-4">Overall {totalDays}-Day Attendance</th>
              <th className="p-4">Certificate Eligibility</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {displayedAttendees.map((attendee) => {
              const isSelected = selectedIds.includes(attendee.id);
              const isPresentToday = attendee.dailyAttendance?.[activeDate] === 'Present';
              const { presentDays, percentage, isEligible, daysNeededFor75 } = computeStats(attendee, totalDays);

              return (
                <tr
                  key={attendee.id}
                  className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-purple-50/40' : ''}`}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectId(attendee.id)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      aria-label={`Select student ${attendee.studentName}`}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-black flex items-center justify-center shrink-0 text-xs">
                        {getInitials(attendee.studentName)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 text-sm">{attendee.studentName}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{attendee.email}</div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5 font-medium">
                          <School size={12} className="text-indigo-500 shrink-0" />
                          <span>{attendee.collegeName}</span>
                        </div>
                        {attendee.status === 'Waitlisted' ? (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                              ⏳ Waitlisted {attendee.waitlistPosition ? `#${attendee.waitlistPosition}` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => onPromoteAttendee(attendee)}
                              className="text-[10px] font-extrabold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 cursor-pointer transition-colors"
                            >
                              Promote to Confirmed
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-700 mt-0.5">
                            ✓ Confirmed
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 1-Click Daily Attendance Toggle */}
                  <td className="p-4">
                    <button
                      onClick={() => onToggleDailyAttendance(attendee, activeDate)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-xs ${
                        isPresentToday
                          ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                      title={`Click to toggle attendance for ${formatDateFull(activeDate)}`}
                    >
                      {isPresentToday ? (
                        <>
                          <CheckCircle2 size={15} className="text-emerald-700" />
                          <span>Present</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={15} className="text-slate-400" />
                          <span>Absent</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Overall Progress & Detail Modal Trigger */}
                  <td className="p-4">
                    <div className="space-y-1.5 max-w-[180px]">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-black ${isEligible ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {percentage}%
                        </span>
                        <span className="text-slate-500 font-bold text-[11px]">
                          {presentDays}/{totalDays} Days
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <button
                        onClick={() => onOpenDetailStudent(attendee)}
                        className="text-[11px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer pt-0.5"
                      >
                        <History size={12} />
                        <span>View / Edit All {totalDays} Days</span>
                      </button>
                    </div>
                  </td>

                  {/* Certificate Eligibility & Action */}
                  <td className="p-4">
                    {attendee.certificateIssued ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          <Award size={13} className="text-amber-700" />
                          <span>Issued</span>
                        </span>
                        {attendee.certificateId && (
                          <p className="font-mono text-[10px] text-slate-500">{attendee.certificateId}</p>
                        )}
                      </div>
                    ) : isEligible ? (
                      <button
                        onClick={() => onIssueCertificate(attendee)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
                        title="Eligible (>= 75% attendance). Click to issue certificate."
                      >
                        <Sparkles size={13} />
                        <span>Issue Certificate</span>
                      </button>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle size={13} />
                          <span>Ineligible (&lt;75%)</span>
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium">Need {daysNeededFor75} more days</p>
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onDeleteAttendee(attendee)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer active:scale-95"
                      title="Delete record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile App-Style Cards View */}
      <div className="block md:hidden divide-y divide-slate-100">
        {displayedAttendees.map((attendee) => {
          const isSelected = selectedIds.includes(attendee.id);
          const isPresentToday = attendee.dailyAttendance?.[activeDate] === 'Present';
          const { presentDays, percentage, isEligible, daysNeededFor75 } = computeStats(attendee, totalDays);

          return (
            <div key={attendee.id} className={`p-4 space-y-3 ${isSelected ? 'bg-purple-50/40' : ''}`}>
              {/* Header: Student Info & Delete */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelectId(attendee.id)}
                    className="w-4 h-4 mt-1 rounded text-purple-600 focus:ring-purple-500 shrink-0 cursor-pointer"
                    aria-label={`Select student ${attendee.studentName}`}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-900 text-sm leading-snug truncate">
                      {attendee.studentName}
                    </h4>
                    <p className="text-slate-500 font-mono text-[11px] truncate flex items-center gap-1 mt-0.5">
                      <Mail size={11} className="shrink-0 text-slate-400" />
                      <span className="truncate">{attendee.email}</span>
                    </p>
                    {attendee.phone && (
                      <p className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="shrink-0 text-slate-400" />
                        <span>{attendee.phone}</span>
                      </p>
                    )}
                    <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5 font-medium truncate">
                      <School size={11} className="text-indigo-600 shrink-0" />
                      <span className="truncate">{attendee.collegeName}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteAttendee(attendee)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                  title="Delete Student"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Overall Progress Bar */}
              <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{totalDays}-Day Attendance:</span>
                  <span className={`font-black ${isEligible ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {percentage}% ({presentDays}/{totalDays} Days)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
              </div>

              {/* Mobile Actions: Daily Toggle & Days Grid */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  onClick={() => onToggleDailyAttendance(attendee, activeDate)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer ${
                    isPresentToday
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {isPresentToday ? (
                    <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">
                    {formatDateShort(activeDate)}: {isPresentToday ? 'Present' : 'Absent'}
                  </span>
                </button>

                <button
                  onClick={() => onOpenDetailStudent(attendee)}
                  className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors active:scale-95 cursor-pointer"
                >
                  <History size={13} className="shrink-0" />
                  <span>{totalDays} Days Grid</span>
                </button>
              </div>

              {/* Certificate Status / Action on Mobile */}
              <div className="pt-0.5">
                {attendee.certificateIssued ? (
                  <div className="w-full py-2 px-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Award size={14} className="text-amber-600" />
                      <span>Certificate Issued</span>
                    </span>
                    <span className="font-mono text-[10px] text-amber-700">{attendee.certificateId}</span>
                  </div>
                ) : isEligible ? (
                  <button
                    onClick={() => onIssueCertificate(attendee)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Issue Certificate (Eligible &ge; 75%)</span>
                  </button>
                ) : (
                  <div className="w-full py-2 px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <AlertCircle size={13} />
                      <span>Ineligible (&lt;75%)</span>
                    </span>
                    <span className="text-[11px] text-rose-600/80">Need {daysNeededFor75} more days</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
