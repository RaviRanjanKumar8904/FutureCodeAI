import React from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, UserCheck, Search, X, SlidersHorizontal, School, RefreshCw, Trash2
} from 'lucide-react';
import type { WebinarItem, WebinarAttendee } from './types';
import type { ScheduleItem } from '../../../utils/webinarSchedule';
import { formatDateShort, formatDateFull } from '../../../utils/webinarSchedule';

export interface WebinarAttendanceFiltersProps {
  selectedWebinar: WebinarItem;
  activeDate: string;
  setActiveDate: (date: string) => void;
  activeScheduleList: ScheduleItem[];
  activeSessionDates: string[];
  attendeesForSelectedWebinar: WebinarAttendee[];
  dayRibbonRef: React.RefObject<HTMLDivElement | null>;
  scrollDayRibbon: (dir: 'left' | 'right') => void;
  handleNavigateDay: (dir: 'prev' | 'next') => void;
  handleTogglePostponeDay: (date: string, isResuming: boolean) => void;
  handleMarkAllPresentOnActiveDate: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  attendanceEligibilityFilter: 'All' | 'Confirmed' | 'Waitlisted' | 'Eligible' | 'Ineligible' | 'CertIssued' | 'CertPending';
  setAttendanceEligibilityFilter: (filter: 'All' | 'Confirmed' | 'Waitlisted' | 'Eligible' | 'Ineligible' | 'CertIssued' | 'CertPending') => void;
  selectedCollege: string;
  setSelectedCollege: (college: string) => void;
  uniqueColleges: string[];
  selectedIds: string[];
  onBulkMarkAttended: () => void;
  onBulkDelete: () => void;
  onRefresh: () => void;
}

export default function WebinarAttendanceFilters({
  selectedWebinar,
  activeDate,
  setActiveDate,
  activeScheduleList,
  activeSessionDates,
  attendeesForSelectedWebinar,
  dayRibbonRef,
  scrollDayRibbon,
  handleNavigateDay,
  handleTogglePostponeDay,
  handleMarkAllPresentOnActiveDate,
  searchTerm,
  setSearchTerm,
  attendanceEligibilityFilter,
  setAttendanceEligibilityFilter,
  selectedCollege,
  setSelectedCollege,
  uniqueColleges,
  selectedIds,
  onBulkMarkAttended,
  onBulkDelete,
  onRefresh,
}: WebinarAttendanceFiltersProps) {
  const currentDaySchedule = activeScheduleList.find((s) => s.date === activeDate);

  return (
    <div className="space-y-4">
      {/* Daily Attendance & Schedule Tracker */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-purple-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span>Daily Attendance &amp; Schedule Tracker</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                      currentDaySchedule?.isPostponed
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    Active: {formatDateFull(activeDate)} {currentDaySchedule?.isPostponed ? '(Postponed)' : ''}
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  Select any session day or back-date below to mark attendance or postpone when unavailable.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Prev/Next for activeDate */}
          <div className="flex items-center gap-2 flex-wrap">
            {!currentDaySchedule?.isPostponed && (
              <button
                onClick={handleMarkAllPresentOnActiveDate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <UserCheck size={14} />
                <span>Mark All Present ({formatDateShort(activeDate)})</span>
              </button>
            )}

            {/* Postpone / Resume Toggle Button */}
            {currentDaySchedule?.isPostponed ? (
              <button
                onClick={() => handleTogglePostponeDay(activeDate, true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Resume this session as an active teaching day"
              >
                <span>▶️ Resume Day</span>
              </button>
            ) : (
              <button
                onClick={() => handleTogglePostponeDay(activeDate, false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Postpone this day (Schedule extends by +1 day)"
              >
                <span>⏸️ Postpone Day (+1d)</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl text-xs font-bold text-slate-700">
              <Calendar size={13} className="text-slate-500" />
              <span>Date:</span>
              <input
                type="date"
                value={activeDate}
                onChange={(e) => setActiveDate(e.target.value)}
                className="bg-transparent font-bold outline-none cursor-pointer text-xs"
              />
            </div>

            {/* Day Navigation Chevrons in Header */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => handleNavigateDay('prev')}
                disabled={activeSessionDates.indexOf(activeDate) <= 0}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => handleNavigateDay('next')}
                disabled={activeSessionDates.indexOf(activeDate) >= activeSessionDates.length - 1}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Day Ribbon */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollDayRibbon('left')}
            className="hidden sm:flex p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shrink-0 active:scale-95 cursor-pointer"
            title="Scroll Days Left"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={dayRibbonRef}
            className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none snap-x snap-mandatory overscroll-x-contain flex-1 px-1"
          >
            {activeScheduleList.map((scheduleItem) => {
              const dateStr = scheduleItem.date;
              const isSelected = activeDate === dateStr;
              const isPostponed = scheduleItem.isPostponed;
              const presentCount = attendeesForSelectedWebinar.filter(
                (a) => a.dailyAttendance?.[dateStr] === 'Present'
              ).length;
              const total = attendeesForSelectedWebinar.length;

              return (
                <button
                  key={dateStr}
                  onClick={() => setActiveDate(dateStr)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-left transition-all cursor-pointer snap-start ${
                    isSelected
                      ? isPostponed
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-transparent shadow-md ring-2 ring-amber-400/50 scale-[1.02]'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md shadow-purple-500/25 ring-2 ring-purple-400/50 scale-[1.02]'
                      : isPostponed
                      ? 'bg-amber-50/90 hover:bg-amber-100 text-amber-900 border-amber-200 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        isSelected ? 'text-white' : isPostponed ? 'text-amber-800' : 'text-slate-400'
                      }`}
                    >
                      {isPostponed ? '⏸️ Postponed' : scheduleItem.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isPostponed
                          ? 'bg-amber-200 text-amber-950'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPostponed ? 'No Class' : `${presentCount}/${total}`}
                    </span>
                  </div>
                  <p className="text-xs font-extrabold mt-0.5 whitespace-nowrap">{formatDateShort(dateStr)}</p>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => scrollDayRibbon('right')}
            className="hidden sm:flex p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shrink-0 active:scale-95 cursor-pointer"
            title="Scroll Days Right"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Postponed Day Banner */}
        {currentDaySchedule?.isPostponed && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-extrabold text-lg">
                ⏸️
              </div>
              <div>
                <p className="font-extrabold text-sm">
                  Session on {formatDateFull(activeDate)} is Postponed / Rescheduled
                </p>
                <p className="text-xs text-amber-800 font-medium mt-0.5">
                  Reason: <strong className="font-bold">{currentDaySchedule?.reason || 'Instructor Unavailable'}</strong> •
                  The bootcamp has been extended by +1 day (New End Date:{' '}
                  <strong>{formatDateFull(selectedWebinar.endDate || activeDate)}</strong>). No attendance required for this
                  date.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePostponeDay(activeDate, true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
            >
              ▶️ Resume Active Day
            </button>
          </div>
        )}
      </div>

      {/* Search, Filter & Bulk Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search students by name, email, phone, or college..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Eligibility Filter */}
            <div className="flex-1 sm:flex-initial flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium">
              <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
              <select
                value={attendanceEligibilityFilter}
                onChange={(e) => setAttendanceEligibilityFilter(e.target.value as any)}
                className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer w-full text-xs"
              >
                <option value="All">All Students ({attendeesForSelectedWebinar.length})</option>
                <option value="Confirmed">Confirmed Seats</option>
                <option value="Waitlisted">Waitlisted Students</option>
                <option value="Eligible">Eligible (&ge; 75% Attendance)</option>
                <option value="Ineligible">Ineligible (&lt; 75% Attendance)</option>
                <option value="CertIssued">Certificates Issued</option>
                <option value="CertPending">Pending Issuance (&ge; 75%)</option>
              </select>
            </div>

            {/* College Filter */}
            {uniqueColleges.length > 0 && (
              <div className="flex-1 sm:flex-initial flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium">
                <School size={14} className="text-slate-400 shrink-0" />
                <select
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer w-full max-w-[150px] truncate text-xs"
                >
                  <option value="All">All Colleges ({uniqueColleges.length})</option>
                  {uniqueColleges.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shrink-0 active:scale-95 cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Bulk Controls Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
            <span className="text-xs font-bold text-purple-900">{selectedIds.length} student(s) selected</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onBulkMarkAttended}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs active:scale-95 cursor-pointer"
              >
                <UserCheck size={14} />
                <span>Mark Present ({formatDateShort(activeDate)})</span>
              </button>
              <button
                onClick={onBulkDelete}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs active:scale-95 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
