import { FileSpreadsheet, CheckCircle2, Download, X } from 'lucide-react';

export interface WebinarCsvGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadSample: () => void;
}

export default function WebinarCsvGuideModal({
  isOpen,
  onClose,
  onDownloadSample,
}: WebinarCsvGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 font-bold">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold text-slate-900">Google Form CSV Specification</h2>
              <p className="text-xs text-slate-500 font-medium">How to download and import Google Form responses</p>
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
          <div className="bg-purple-50/70 p-3.5 sm:p-4 rounded-2xl border border-purple-100 space-y-2">
            <h4 className="font-extrabold text-purple-900 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-purple-600" />
              How to export from Google Forms:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 text-xs sm:text-sm">
              <li>Open your Google Form &rarr; Click on the <strong>Responses</strong> tab.</li>
              <li>Click the 3 vertical dots (<strong>&vellip;</strong>) next to the Google Sheets icon.</li>
              <li>Select <strong>Download responses (.csv)</strong>.</li>
              <li>Open any webinar and click <strong>Import Google Form CSV</strong>.</li>
            </ol>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 mb-2">Supported Column Header Names</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
                    <th className="p-2.5">Field</th>
                    <th className="p-2.5">Supported Keywords</th>
                    <th className="p-2.5">Sample Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="p-2.5 font-bold">Student Name <span className="text-rose-500">*</span></td>
                    <td className="p-2.5 font-mono text-[11px] text-purple-700">Name, Full Name, Student Name</td>
                    <td className="p-2.5">Rahul Sharma</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Email <span className="text-rose-500">*</span></td>
                    <td className="p-2.5 font-mono text-[11px] text-purple-700">Email, Email Address, Mail</td>
                    <td className="p-2.5">rahul@example.com</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Phone</td>
                    <td className="p-2.5 font-mono text-[11px] text-purple-700">Phone, WhatsApp, Mobile</td>
                    <td className="p-2.5">+91 9876543210</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">College</td>
                    <td className="p-2.5 font-mono text-[11px] text-purple-700">College, College Name, Institute</td>
                    <td className="p-2.5">MIT Muzaffarpur</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Branch / Year</td>
                    <td className="p-2.5 font-mono text-[11px] text-purple-700">Branch, Department, Year</td>
                    <td className="p-2.5">CSE • 3rd Year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            onClick={onDownloadSample}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>Download Sample CSV</span>
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
