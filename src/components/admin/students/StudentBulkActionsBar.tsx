import { Award, FileSpreadsheet, Trash2, X, CheckCircle2, Clock } from 'lucide-react';
import type { Student } from './types';

export interface StudentBulkActionsBarProps {
  selectedCount: number;
  selectedWithCert: Student[];
  selectedEligibleForCert: Student[];
  selectedInProgress: Student[];
  selectedStudents: Student[];
  onBulkCertificate: () => void;
  onPreviewSingleCert: (certData: any) => void;
  onExportCSV: (selectedOnly: boolean) => void;
  bulkBatch: string;
  setBulkBatch: (val: string) => void;
  onBulkBatchChange: (val: string) => void;
  batchOptions: string[];
  bulkCenter: string;
  setBulkCenter: (val: string) => void;
  onBulkCenterChange: (val: string) => void;
  centers: Array<{ id: string; name: string }>;
  onBulkDelete: () => void;
  onDeselectAll: () => void;
}

export default function StudentBulkActionsBar({
  selectedCount,
  selectedWithCert,
  selectedEligibleForCert,
  selectedInProgress,
  selectedStudents,
  onBulkCertificate,
  onPreviewSingleCert,
  onExportCSV,
  bulkBatch,
  setBulkBatch,
  onBulkBatchChange,
  batchOptions,
  bulkCenter,
  setBulkCenter,
  onBulkCenterChange,
  centers,
  onBulkDelete,
  onDeselectAll,
}: StudentBulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0d121c]/95 backdrop-blur-xl text-white px-4 sm:px-6 py-3 rounded-2xl sm:rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.6)] flex items-center gap-2.5 sm:gap-3.5 z-50 flex-wrap justify-center border border-amber-500/30 animate-in slide-in-from-bottom-4 duration-200 max-w-[95vw]">
      {/* Selection Badge & Count */}
      <div className="flex items-center gap-2 pr-1 border-r border-slate-700/80">
        <span className="font-extrabold text-xs sm:text-sm text-amber-300 whitespace-nowrap">
          {selectedCount} Selected
        </span>
        <div className="hidden sm:flex items-center gap-1 text-[10px]">
          {selectedWithCert.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              {selectedWithCert.length} Issued
            </span>
          )}
          {selectedEligibleForCert.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              {selectedEligibleForCert.length} Completed
            </span>
          )}
          {selectedInProgress.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
              {selectedInProgress.length} In Progress
            </span>
          )}
        </div>
      </div>

      {/* Smart Certificate Action Button */}
      {selectedEligibleForCert.length > 0 ? (
        <button
          onClick={onBulkCertificate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Award size={14} /> Issue Certs ({selectedEligibleForCert.length})
        </button>
      ) : selectedStudents.length === 1 && selectedStudents[0].certificateData ? (
        <button
          onClick={() => onPreviewSingleCert(selectedStudents[0].certificateData)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Award size={14} /> View Certificate
        </button>
      ) : selectedInProgress.length > 0 ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold whitespace-nowrap">
          <Clock size={13} className="text-blue-400" /> {selectedInProgress.length} In Progress
        </div>
      ) : (
        <button
          onClick={() => onExportCSV(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <CheckCircle2 size={13} className="text-emerald-400" /> All {selectedStudents.length} Certified
        </button>
      )}

      {/* Export Selected CSV */}
      <button
        onClick={() => onExportCSV(true)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
        title="Export Selected Students to CSV"
      >
        <FileSpreadsheet size={13} className="text-indigo-400" />
        <span className="hidden sm:inline">Export</span>
      </button>

      {/* Quick Batch Assignment */}
      <div className="flex items-center gap-1">
        <select
          value={bulkBatch}
          onChange={(e) => {
            const val = e.target.value;
            setBulkBatch(val);
            if (val) onBulkBatchChange(val);
          }}
          className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/40 cursor-pointer"
        >
          <option value="">Assign Batch...</option>
          {batchOptions.map((b) => (
            <option key={b} value={b}>
              Batch: {b}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Center Assignment */}
      <div className="flex items-center gap-1">
        <select
          value={bulkCenter}
          onChange={(e) => {
            const val = e.target.value;
            setBulkCenter(val);
            if (val) onBulkCenterChange(val);
          }}
          className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/40 cursor-pointer"
        >
          <option value="">Assign Center...</option>
          {centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Delete Action */}
      <button
        onClick={onBulkDelete}
        className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors active:scale-95 cursor-pointer whitespace-nowrap shadow-sm shadow-rose-900/30"
      >
        <Trash2 size={13} />
        <span>Delete</span>
      </button>

      {/* Deselect All (X) */}
      <button
        onClick={onDeselectAll}
        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
        title="Deselect All"
      >
        <X size={15} />
      </button>
    </div>
  );
}
