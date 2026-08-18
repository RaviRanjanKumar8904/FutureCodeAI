import { FileSpreadsheet, Upload, X } from 'lucide-react';
import type { WebinarItem } from './types';

export interface WebinarCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  csvFileName: string;
  parsedRows: any[];
  webinars: WebinarItem[];
  targetWebinarId: string;
  setTargetWebinarId: (id: string) => void;
  targetWebinarTitle: string;
  setTargetWebinarTitle: (title: string) => void;
  importAttendanceForDate: string;
  setImportAttendanceForDate: (date: string) => void;
  onConfirmImport: () => void;
  importing: boolean;
}

export default function WebinarCsvImportModal({
  isOpen,
  onClose,
  csvFileName,
  parsedRows,
  webinars,
  targetWebinarId,
  setTargetWebinarId,
  targetWebinarTitle,
  setTargetWebinarTitle,
  importAttendanceForDate,
  setImportAttendanceForDate,
  onConfirmImport,
  importing,
}: WebinarCsvImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 font-bold">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold text-slate-900">Preview CSV Import</h2>
              <p className="text-xs text-slate-500 font-medium">Found {parsedRows.length} attendee records in {csvFileName}</p>
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
          <div className="bg-purple-50/70 p-3.5 sm:p-4 rounded-2xl border border-purple-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-purple-900 mb-1">
                Destination Webinar Session <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetWebinarId}
                onChange={(e) => {
                  const wid = e.target.value;
                  setTargetWebinarId(wid);
                  const found = webinars.find((w) => w.id === wid);
                  if (found) setTargetWebinarTitle(found.title);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-900 text-xs sm:text-base cursor-pointer"
              >
                {webinars.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title} ({w.totalDays} Days)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-purple-900 mb-1">Initial Attendance (Optional Date)</label>
              <input
                type="date"
                value={importAttendanceForDate}
                onChange={(e) => setImportAttendanceForDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-medium text-slate-900 text-xs sm:text-base cursor-pointer"
              />
              <p className="text-[11px] text-purple-700 mt-0.5">Students will be marked Present on this date.</p>
            </div>
          </div>

          {/* Preview Table */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2">Parsed Records Preview ({parsedRows.length})</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[320px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] sm:text-[11px] sticky top-0 bg-slate-50">
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5">College</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900 truncate">{row.studentName}</td>
                      <td className="p-2.5 font-mono text-slate-600 truncate">{row.email}</td>
                      <td className="p-2.5 text-slate-700 truncate">{row.collegeName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-gray-200 hover:bg-slate-100 transition-colors text-xs sm:text-sm cursor-pointer"
            disabled={importing}
          >
            Cancel
          </button>
          <button
            onClick={onConfirmImport}
            disabled={importing || !targetWebinarTitle.trim()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs sm:text-sm hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Upload size={15} />
                <span>Confirm &amp; Import {parsedRows.length} Students</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
