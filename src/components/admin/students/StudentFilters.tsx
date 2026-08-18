import { useState } from 'react';
import { Search, Filter, X, Award, Check, Clock } from 'lucide-react';

export interface StudentFiltersProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterCourse: string;
  setFilterCourse: (val: string) => void;
  filterCenter: string;
  setFilterCenter: (val: string) => void;
  filterBatch: string;
  setFilterBatch: (val: string) => void;
  filterGender: string;
  setFilterGender: (val: string) => void;
  filterCertStatus: string;
  setFilterCertStatus: (val: string) => void;
  courseOptions: string[];
  centerOptions: string[];
  batchOptions: string[];
  totalCount: number;
  certifiedCount: number;
  completedUncertifiedCount: number;
  inProgressCount: number;
  filteredCount?: number;
  onClearFilters: () => void;
}

export default function StudentFilters({
  searchTerm,
  setSearchTerm,
  filterCourse,
  setFilterCourse,
  filterCenter,
  setFilterCenter,
  filterBatch,
  setFilterBatch,
  filterGender,
  setFilterGender,
  filterCertStatus,
  setFilterCertStatus,
  courseOptions,
  centerOptions,
  batchOptions,
  totalCount,
  certifiedCount,
  completedUncertifiedCount,
  inProgressCount,
  onClearFilters,
}: StudentFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = Boolean(
    searchTerm || filterCourse || filterCenter || filterBatch || filterGender !== 'all' || (filterCertStatus && filterCertStatus !== 'all')
  );

  return (
    <div className="p-4 border-b border-slate-200 flex flex-col gap-3 bg-slate-50/50">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Search name, email, roll, cert ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
          />
        </div>

        {/* Quick Filter Toggles */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Certificate & Completion Filter Quick Pills */}
          <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-white text-xs font-bold shadow-sm">
            <button
              onClick={() => setFilterCertStatus('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterCertStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilterCertStatus('issued')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                filterCertStatus === 'issued' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award size={12} /> Issued ({certifiedCount})
            </button>
            <button
              onClick={() => setFilterCertStatus('completed')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                filterCertStatus === 'completed' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Course Duration Completed - Ready for Certificate"
            >
              <Check size={12} /> Completed ({completedUncertifiedCount})
            </button>
            <button
              onClick={() => setFilterCertStatus('in_progress')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                filterCertStatus === 'in_progress' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Course still in progress"
            >
              <Clock size={12} /> In Progress ({inProgressCount})
            </button>
          </div>

          {/* Advanced Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>

      {/* Collapsible Filter Row */}
      {showFilters && (
        <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
          <select
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="">All Batches</option>
            {batchOptions.map((b) => (
              <option key={b} value={b}>
                Batch: {b}
              </option>
            ))}
          </select>

          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="">All Courses</option>
            {courseOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterCenter}
            onChange={(e) => setFilterCenter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="">All Centers</option>
            {centerOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male only</option>
            <option value="Female">Female only</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X size={13} /> Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
