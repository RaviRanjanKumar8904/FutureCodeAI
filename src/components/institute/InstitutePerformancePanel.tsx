import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  Users, 
  BookOpen, 
  Calendar 
} from 'lucide-react';

interface InstitutePerformanceProps {
  totalStudents: number;
  completedStudents: number;
  certifiedStudents: number;
  averageAttendance: number;
  activeBatchesCount: number;
  loading?: boolean;
}

export const InstitutePerformancePanel: React.FC<InstitutePerformanceProps> = ({
  totalStudents,
  completedStudents,
  certifiedStudents,
  averageAttendance,
  activeBatchesCount,
  loading = false,
}) => {
  const completionRate = totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;
  const certificateRate = totalStudents > 0 ? Math.round((certifiedStudents / totalStudents) * 100) : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <span>Center Performance &amp; Student Metrics</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time analytics for your registered students and active batches
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20">
          Center Scoped
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Completion Rate Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Course Completion Rate
            </span>
            <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 size={18} />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {completionRate}%
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                ({completedStudents}/{totalStudents} students)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            {completionRate >= 80 ? '🌟 Exceptional batch completion rate' : 'Students actively completing coursework'}
          </p>
        </motion.div>

        {/* 2. Certificate Issuance Rate Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Certificate Rate
            </span>
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
              <Award size={18} />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {certificateRate}%
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                ({certifiedStudents} issued)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${certificateRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            Verified by FutureCode AI Examination Board
          </p>
        </motion.div>

        {/* 3. Average Attendance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Average Attendance
            </span>
            <div className="p-2 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
              <Calendar size={18} />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {averageAttendance}%
              </span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                averageAttendance >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {averageAttendance >= 75 ? 'Healthy' : 'Needs Follow-up'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, averageAttendance)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-sky-500 rounded-full"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            Across practical lab and lecture sessions
          </p>
        </motion.div>

        {/* 4. Total Enrolled & Active Batches */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Center Cohorts
            </span>
            <div className="p-2 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
              <Users size={18} />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {totalStudents}
              </span>
              <span className="text-xs text-slate-500 block font-semibold">Total Students</span>
            </div>

            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-purple-700">
                {activeBatchesCount}
              </span>
              <span className="text-xs text-slate-500 block font-semibold">Active Batches</span>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-100 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <BookOpen size={13} className="text-primary" />
            <span>Assigned Center: FutureCode Partner</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InstitutePerformancePanel;
