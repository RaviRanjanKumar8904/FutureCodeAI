import React from 'react';
import { Video, Search, Filter, X, RefreshCw, Plus, Upload, Edit, Trash2, Calendar, User, Clock } from 'lucide-react';
import type { WebinarItem } from './types';
import { formatDateFull } from '../../../utils/webinarSchedule';

export interface WebinarCatalogProps {
  webinars: WebinarItem[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: 'All' | 'Upcoming' | 'Live' | 'Completed';
  setStatusFilter: (status: 'All' | 'Upcoming' | 'Live' | 'Completed') => void;
  webinarMetrics: Map<string, { total: number; eligibleCount: number; certCount: number; colleges: Set<string> }>;
  onSelectWebinar: (webinar: WebinarItem) => void;
  onCreateWebinar: () => void;
  onEditWebinar: (webinar: WebinarItem, e: React.MouseEvent) => void;
  onDeleteWebinar: (webinar: WebinarItem, e: React.MouseEvent) => void;
  onImportCsvForWebinar: (webinar?: WebinarItem) => void;
  onRefresh: () => void;
}

export default function WebinarCatalog({
  webinars,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  webinarMetrics,
  onSelectWebinar,
  onCreateWebinar,
  onEditWebinar,
  onDeleteWebinar,
  onImportCsvForWebinar,
  onRefresh,
}: WebinarCatalogProps) {
  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search webinars by title, topic, or speaker..."
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium w-full sm:w-auto">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer w-full sm:w-auto text-xs"
            >
              <option value="All">All Statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Live">Live Now</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shrink-0 active:scale-95 cursor-pointer"
            title="Refresh webinars"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Webinars Cards Grid */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading webinars...</p>
        </div>
      ) : webinars.length === 0 ? (
        <div className="py-16 px-4 text-center max-w-md mx-auto bg-white rounded-3xl border border-slate-200/80">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Video size={28} />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 mb-1">No Multi-Day Webinars Found</h3>
          <p className="text-xs text-slate-500 font-medium mb-6">
            Create a 15-day webinar, track attendance each day, and issue certificates to eligible students.
          </p>
          <button
            onClick={onCreateWebinar}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-md active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Create First Webinar</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {webinars.map((webinar) => {
            const metrics = webinarMetrics.get(webinar.id) || {
              total: 0,
              eligibleCount: 0,
              certCount: 0,
              colleges: new Set(),
            };
            const eligibleRate = metrics.total > 0 ? Math.round((metrics.eligibleCount / metrics.total) * 100) : 0;

            return (
              <div
                key={webinar.id}
                onClick={() => onSelectWebinar(webinar)}
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-purple-300 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden active:scale-[0.99]"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                        {webinar.totalDays}-Day Bootcamp
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                          webinar.status === 'Live'
                            ? 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse'
                            : webinar.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {webinar.status === 'Live' ? '● Live Now' : webinar.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => onEditWebinar(webinar, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                        title="Edit Webinar"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={(e) => onDeleteWebinar(webinar, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Webinar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-snug line-clamp-2">
                      {webinar.title}
                    </h3>
                    {webinar.topic && (
                      <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">{webinar.topic}</p>
                    )}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-purple-600 shrink-0" />
                      <span className="font-bold text-slate-800 truncate">
                        {formatDateFull(webinar.startDate)} &rarr; {formatDateFull(webinar.endDate || webinar.startDate)}
                      </span>
                    </div>
                    {webinar.speaker && (
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-indigo-600 shrink-0" />
                        <span className="truncate">
                          Host: <strong className="text-slate-800">{webinar.speaker}</strong>
                        </span>
                      </div>
                    )}
                    {webinar.time && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{webinar.time}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="pt-4 mt-3 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-purple-50/60 p-2 rounded-xl">
                      <p className="font-black text-purple-900 text-sm sm:text-base">{metrics.total}</p>
                      <p className="text-[10px] text-purple-700 uppercase font-bold">Students</p>
                    </div>
                    <div className="bg-emerald-50/60 p-2 rounded-xl">
                      <p className="font-black text-emerald-800 text-sm sm:text-base">{metrics.eligibleCount}</p>
                      <p className="text-[10px] text-emerald-700 uppercase font-bold">&ge;75% ({eligibleRate}%)</p>
                    </div>
                    <div className="bg-amber-50/60 p-2 rounded-xl">
                      <p className="font-black text-amber-800 text-sm sm:text-base">{metrics.certCount}</p>
                      <p className="text-[10px] text-amber-700 uppercase font-bold">Certs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectWebinar(webinar)}
                      className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Calendar size={14} />
                      <span>Daily Attendance ({webinar.totalDays} Days)</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onImportCsvForWebinar(webinar);
                      }}
                      className="p-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold transition-all active:scale-95 cursor-pointer"
                      title="Import Google Form CSV into this webinar"
                    >
                      <Upload size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
