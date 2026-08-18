import React from 'react';
import { Award, X, AlertTriangle, CheckCircle2, Calendar, Sparkles } from 'lucide-react';
import type { Student } from './types';
import { computeCompletionDate } from './types';

export interface IssueCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  issueForm: {
    studentName: string;
    studentEmail: string;
    courseName: string;
    domain: string;
    gender: 'Male' | 'Female';
    startDate: string;
    endDate: string;
    issueDate: string;
    grade: string;
    marksPercentage: string;
  };
  setIssueForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  isIssuing: boolean;
  courses: Array<{ id: string; title?: string; courseName?: string; duration?: string }>;
}

export default function IssueCertificateModal({
  isOpen,
  onClose,
  student,
  issueForm,
  setIssueForm,
  onSubmit,
  isIssuing,
  courses,
}: IssueCertificateModalProps) {
  if (!isOpen || !student) return null;

  const nowMs = Date.now();
  const endMs = new Date(issueForm.endDate || '').getTime();
  const isFormCompletionMet = !isNaN(endMs) && nowMs >= endMs;
  const formDaysRemaining = !isNaN(endMs) && endMs > nowMs ? Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center font-bold">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Issue Official Certificate</h3>
              <p className="text-xs text-slate-500 font-medium">For {student.displayName || student.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center shadow-sm cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Reactive Course Duration Status Banner */}
        {!isFormCompletionMet ? (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-800 animate-in fade-in duration-150">
            <AlertTriangle size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Course Duration In Progress</span>
              <span>
                Start: <strong>{issueForm.startDate}</strong> ({student.courseDuration || '3 Months'}). Scheduled completion date: <strong>{issueForm.endDate}</strong> ({formDaysRemaining} days remaining).
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-150">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Course Duration Completed</span>
              <span>
                Completed on <strong>{issueForm.endDate}</strong>. Certificate is ready for official issuance.
              </span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Student Name *</label>
              <input
                type="text"
                required
                value={issueForm.studentName}
                onChange={(e) => setIssueForm({ ...issueForm, studentName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
              <select
                value={issueForm.gender}
                onChange={(e) => setIssueForm({ ...issueForm, gender: e.target.value as any })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="Male">Male (He / His)</option>
                <option value="Female">Female (She / Her)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Student Email</label>
            <input
              type="email"
              value={issueForm.studentEmail}
              onChange={(e) => setIssueForm({ ...issueForm, studentEmail: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Program / Course *</label>
              <input
                type="text"
                required
                value={issueForm.courseName}
                onChange={(e) => {
                  const newCourseName = e.target.value;
                  const matched = courses.find(
                    (c) =>
                      c.title?.toLowerCase() === newCourseName.toLowerCase() ||
                      c.courseName?.toLowerCase() === newCourseName.toLowerCase()
                  );
                  const dur = matched?.duration || student.courseDuration || '3 Months';
                  const newEnd = computeCompletionDate(issueForm.startDate, dur);
                  setIssueForm({
                    ...issueForm,
                    courseName: newCourseName,
                    domain: newCourseName,
                    endDate: newEnd,
                    issueDate: newEnd,
                  });
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Specialization / Domain</label>
              <input
                type="text"
                value={issueForm.domain}
                onChange={(e) => setIssueForm({ ...issueForm, domain: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Start Date (Enrollment Date) and Completion/Issue Date */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-indigo-600" /> Start Date (Enrollment) *
              </label>
              <input
                type="date"
                required
                value={issueForm.startDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  const newEnd = computeCompletionDate(newStart, student.courseDuration);
                  setIssueForm({
                    ...issueForm,
                    startDate: newStart,
                    endDate: newEnd,
                    issueDate: newEnd,
                  });
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Changing auto-updates end date</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600" /> Completion &amp; Issue Date *
              </label>
              <input
                type="date"
                required
                value={issueForm.endDate}
                onChange={(e) => {
                  const newEnd = e.target.value;
                  setIssueForm({
                    ...issueForm,
                    endDate: newEnd,
                    issueDate: newEnd,
                  });
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              />
              <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">Identical on certificate</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Grade</label>
              <input
                type="text"
                value={issueForm.grade}
                onChange={(e) => setIssueForm({ ...issueForm, grade: e.target.value })}
                placeholder="E.g. A+"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Marks %</label>
              <input
                type="text"
                value={issueForm.marksPercentage}
                onChange={(e) => setIssueForm({ ...issueForm, marksPercentage: e.target.value })}
                placeholder="E.g. 94"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isIssuing}
              className="flex-1 py-2.5 rounded-xl font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isIssuing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Issuing...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Generate Certificate
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
