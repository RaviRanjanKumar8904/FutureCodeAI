import {
  Users, Mail, Eye, Award, CheckSquare, Square, Calendar,
  Edit2, CheckCircle2, Clock, Building2, Trash2, Check
} from 'lucide-react';
import type { Student } from './types';

export interface StudentTableProps {
  students: Student[];
  loading: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  isAllSelected: boolean;
  onOpenIssueModal: (student: Student) => void;
  onViewProfile: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
}

export default function StudentTable({
  students,
  loading,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  isAllSelected,
  onOpenIssueModal,
  onViewProfile,
  onEditStudent,
  onDeleteStudent,
}: StudentTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Desktop / Tablet Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[680px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <th className="p-3.5 pl-4 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
                  aria-label="Select all students"
                >
                  {isAllSelected ? <CheckSquare size={17} className="text-indigo-600" /> : <Square size={17} />}
                </button>
              </th>
              <th className="p-3.5">Student Information</th>
              <th className="p-3.5 hidden md:table-cell">Timeline &amp; Duration</th>
              <th className="p-3.5 hidden lg:table-cell">Course &amp; Center</th>
              <th className="p-3.5 text-center">Certificate Status</th>
              <th className="p-3.5 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading students and course timelines...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-3 mx-auto">
                    <Users size={28} />
                  </div>
                  <p className="text-slate-900 font-bold text-base mb-0.5">No Students Found</p>
                  <p className="text-slate-500 text-xs">Try adjusting your search terms or filters.</p>
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const hasCert = Boolean(student.certificateId);
                const isSelected = selectedIds.has(student.id);
                const isCompleted = student.isDurationCompleted;

                return (
                  <tr
                    key={student.id}
                    className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="p-3.5 pl-4 align-middle">
                      <button
                        onClick={() => toggleSelect(student.id)}
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
                        aria-label={`Select student ${student.displayName}`}
                      >
                        {isSelected ? <CheckSquare size={17} className="text-indigo-600" /> : <Square size={17} />}
                      </button>
                    </td>

                    {/* Student Profile & Details */}
                    <td className="p-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 text-indigo-700 flex items-center justify-center font-extrabold text-base shrink-0 shadow-inner border border-indigo-200/50">
                          {student.displayName ? student.displayName.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {student.displayName || 'Unnamed Student'}
                            </span>
                            {student.gender && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                  student.gender.toLowerCase() === 'female'
                                    ? 'bg-pink-50 text-pink-700 border border-pink-100'
                                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                                }`}
                              >
                                {student.gender}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <Mail size={12} className="shrink-0 text-slate-400" /> {student.email}
                          </div>
                          {(student.collegeName || student.rollNo) && (
                            <div className="text-[11px] font-semibold text-slate-600 mt-0.5 truncate">
                              🏫 {student.collegeName || 'College'} {student.rollNo ? `• Roll: ${student.rollNo}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Timeline: Enrollment Start -> Completion Date */}
                    <td className="p-3.5 align-middle hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                          <Calendar size={13} className="text-indigo-600" />
                          <span>Start: {student.enrolledAtDate || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span>
                            Duration: <strong className="text-slate-700">{student.courseDuration || '3 Months'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Ends: <strong className="text-slate-700">{student.completionDate}</strong>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Course & Center */}
                    <td className="p-3.5 align-middle hidden lg:table-cell">
                      <div className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                        {student.enrolledCourse || 'General Curriculum'}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <Building2 size={11} className="text-slate-400" /> {student.assignedCenter || 'Online Platform'}
                        {student.batch && <span className="text-slate-400 font-mono">({student.batch})</span>}
                      </div>
                    </td>

                    {/* Certificate Status with Direct Action */}
                    <td className="p-3.5 align-middle text-center">
                      {hasCert ? (
                        <button
                          onClick={() => onOpenIssueModal(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer"
                          title="Certificate Issued - Click to Preview & Download"
                        >
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Issued</span>
                          <span className="font-mono text-[10px] text-emerald-800/80">({student.certificateId})</span>
                        </button>
                      ) : isCompleted ? (
                        <button
                          onClick={() => onOpenIssueModal(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm cursor-pointer"
                          title="Duration Completed! Click to Issue Certificate"
                        >
                          <Check size={13} className="text-emerald-600" />
                          <span>Completed</span>
                          <span className="text-[10px] bg-amber-200/60 px-1 rounded text-amber-900 font-extrabold">+ Issue Cert</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenIssueModal(student)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm cursor-pointer"
                          title={`Course in progress. Completes on ${student.completionDate} (${student.daysRemaining} days left). Click to view.`}
                        >
                          <Clock size={12} className="text-blue-600" />
                          <span>In Progress</span>
                          <span className="text-[10px] text-blue-600 font-mono font-bold">({student.daysRemaining}d left)</span>
                        </button>
                      )}
                    </td>

                    {/* Row Action Buttons */}
                    <td className="p-3.5 pr-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1-Click Certificate Action */}
                        {hasCert ? (
                          <button
                            onClick={() => onOpenIssueModal(student)}
                            className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200/60 cursor-pointer"
                            title="Preview Certificate"
                            aria-label="Preview Certificate"
                          >
                            <Award size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenIssueModal(student)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors border cursor-pointer ${
                              isCompleted
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200/60'
                                : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200/60'
                            }`}
                            title={
                              isCompleted
                                ? 'Issue Certificate (Course Completed)'
                                : `Issue Certificate (Completes on ${student.completionDate})`
                            }
                            aria-label="Issue Certificate"
                          >
                            <Award size={16} />
                          </button>
                        )}

                        {/* Profile View */}
                        <button
                          onClick={() => onViewProfile(student)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="View Full Profile"
                          aria-label="View Student Profile"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Edit Student */}
                        <button
                          onClick={() => onEditStudent(student)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Student Info"
                          aria-label="Edit Student"
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* Delete Student */}
                        <button
                          onClick={() => onDeleteStudent(student)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Student Record"
                          aria-label="Delete Student"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile App-Style Cards View (< 640px) */}
      <div className="block sm:hidden divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-2 mx-auto">
              <Users size={24} />
            </div>
            <p className="text-slate-900 font-bold text-sm">No Students Found</p>
            <p className="text-slate-500 text-xs">Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          students.map((student) => {
            const hasCert = Boolean(student.certificateId);
            const isSelected = selectedIds.has(student.id);
            const isCompleted = student.isDurationCompleted;

            return (
              <div
                key={student.id}
                className={`p-4 space-y-3 transition-colors ${isSelected ? 'bg-indigo-50/50' : 'bg-white'}`}
              >
                {/* Header row: Checkbox, Avatar, Name, Gender, Delete */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => toggleSelect(student.id)}
                      className="mt-0.5 min-w-[44px] min-h-[44px] -ml-2 -mt-2 flex items-center justify-center text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
                      aria-label={`Select student ${student.displayName}`}
                    >
                      {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                    </button>

                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 text-indigo-700 flex items-center justify-center font-extrabold text-base shrink-0 border border-indigo-200/50 shadow-inner">
                      {student.displayName ? student.displayName.charAt(0).toUpperCase() : 'S'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {student.displayName || 'Unnamed Student'}
                        </span>
                        {student.gender && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              student.gender.toLowerCase() === 'female'
                                ? 'bg-pink-50 text-pink-700 border border-pink-100'
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}
                          >
                            {student.gender}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <Mail size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate">{student.email}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteStudent(student)}
                    className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                    title="Delete Student"
                    aria-label="Delete Student"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* College & Center metadata */}
                {(student.collegeName || student.rollNo || student.enrolledCourse) && (
                  <div className="bg-slate-50/80 rounded-xl p-2.5 text-xs space-y-1 border border-slate-100">
                    {student.enrolledCourse && (
                      <div className="font-bold text-slate-800 truncate">
                        📚 {student.enrolledCourse}
                      </div>
                    )}
                    {(student.collegeName || student.rollNo) && (
                      <div className="text-slate-600 truncate flex items-center gap-1">
                        <span>🏫 {student.collegeName || 'College'}</span>
                        {student.rollNo && <span className="text-slate-500 font-mono">• Roll: {student.rollNo}</span>}
                      </div>
                    )}
                    <div className="text-slate-500 text-[11px] flex items-center gap-2 flex-wrap pt-0.5">
                      <span>Start: <strong>{student.enrolledAtDate || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Ends: <strong>{student.completionDate}</strong></span>
                      {student.assignedCenter && (
                        <>
                          <span>•</span>
                          <span>{student.assignedCenter}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Status and Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  {/* Certificate Status Badge */}
                  <div>
                    {hasCert ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>Issued</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Check size={12} className="text-emerald-600" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock size={12} className="text-blue-600" />
                        <span>{student.daysRemaining}d left</span>
                      </span>
                    )}
                  </div>

                  {/* Touch-Friendly Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenIssueModal(student)}
                      className={`min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        hasCert
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isCompleted
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                      aria-label="Certificate Actions"
                    >
                      <Award size={15} />
                      <span>{hasCert ? 'Preview' : 'Cert'}</span>
                    </button>

                    <button
                      onClick={() => onViewProfile(student)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                      title="View Profile"
                      aria-label="View Student Profile"
                    >
                      <Eye size={17} />
                    </button>

                    <button
                      onClick={() => onEditStudent(student)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                      title="Edit Student"
                      aria-label="Edit Student"
                    >
                      <Edit2 size={17} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
