import { FileSpreadsheet, Download, X } from 'lucide-react';

export interface StudentCsvGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadSample: () => void;
}

export default function StudentCsvGuideModal({
  isOpen,
  onClose,
  onDownloadSample,
}: StudentCsvGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto animate-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Student CSV Import Format</h2>
              <p className="text-xs text-slate-500 font-medium">Supported column headers for bulk importing students</p>
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
          <p className="text-slate-600">
            Ensure your CSV file contains the following column headers (case-insensitive):
          </p>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-2.5">Column Header</th>
                  <th className="p-2.5">Required?</th>
                  <th className="p-2.5">Example Value</th>
                  <th className="p-2.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="p-2.5 font-bold font-mono text-indigo-700">Name</td>
                  <td className="p-2.5 text-rose-600 font-bold">Required</td>
                  <td className="p-2.5">Rahul Kumar</td>
                  <td className="p-2.5 text-slate-500">Student's full name</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-indigo-700">Email</td>
                  <td className="p-2.5 text-rose-600 font-bold">Required</td>
                  <td className="p-2.5">rahul@example.com</td>
                  <td className="p-2.5 text-slate-500">Unique login / notification email</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-indigo-700">Phone</td>
                  <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                  <td className="p-2.5">9876543210</td>
                  <td className="p-2.5 text-slate-500">10-digit mobile number</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-indigo-700">Gender</td>
                  <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                  <td className="p-2.5">Male / Female</td>
                  <td className="p-2.5 text-slate-500">Defaults to Male if empty</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-indigo-700">College</td>
                  <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                  <td className="p-2.5">MIT Muzaffarpur</td>
                  <td className="p-2.5 text-slate-500">College or institute name</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-indigo-700">RollNo</td>
                  <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                  <td className="p-2.5">21CS045</td>
                  <td className="p-2.5 text-slate-500">College roll / registration number</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-indigo-700">Course</td>
                  <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                  <td className="p-2.5">Full Stack Web Dev</td>
                  <td className="p-2.5 text-slate-500">Course to auto-enroll</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-indigo-700">Center</td>
                  <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                  <td className="p-2.5">FutureCodeAI (Online)</td>
                  <td className="p-2.5 text-slate-500">Partner center / campus</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-indigo-700">Batch</td>
                  <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                  <td className="p-2.5">Oct 2026</td>
                  <td className="p-2.5 text-slate-500">Assigned batch month/year</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onDownloadSample}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>Download Sample CSV</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
