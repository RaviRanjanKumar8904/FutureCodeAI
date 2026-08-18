import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Image as ImageIcon, ShieldCheck, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import StudentTranscript from './StudentTranscript';
import type { StudentTranscriptData } from './StudentTranscript';

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StudentTranscriptData | null;
}

export default function TranscriptModal({ isOpen, onClose, data }: TranscriptModalProps) {
  const [downloading, setDownloading] = useState<'pdf' | 'png' | null>(null);
  const [scale, setScale] = useState<number>(0.65);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic responsive scaling calculation
  useEffect(() => {
    if (!isOpen) return;

    const computeScale = () => {
      if (!previewContainerRef.current) return;
      const { clientWidth, clientHeight } = previewContainerRef.current;
      const padX = window.innerWidth < 640 ? 20 : 40;
      const padY = window.innerWidth < 640 ? 20 : 40;
      
      const availableW = Math.max(clientWidth - padX, 240);
      const availableH = Math.max(clientHeight - padY, 320);

      const scaleW = availableW / 794;
      const scaleH = availableH / 1123;
      const targetScale = Math.min(scaleW, scaleH, 0.85);

      setScale(Math.max(targetScale, 0.28));
    };

    computeScale();
    const timer = setTimeout(computeScale, 60);
    window.addEventListener('resize', computeScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', computeScale);
    };
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const getCleanFileName = () => {
    const student = (data.studentName || 'student').toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `FutureCode_Official_Transcript_${student}_${data.transcriptId}`;
  };

  const captureNode = () => document.getElementById('printable-transcript-node');

  const handleDownloadPNG = async () => {
    const node = captureNode();
    if (!node) { toast.error('Transcript preview not ready'); return; }
    setDownloading('png');
    const toastId = toast.loading('Generating high-resolution transcript image…');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(node, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png', 1);
      link.download = `${getCleanFileName()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Transcript image downloaded!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Image download failed', { id: toastId });
    } finally { setDownloading(null); }
  };

  const handleDownloadPDF = async () => {
    const node = captureNode();
    if (!node) { toast.error('Transcript preview not ready'); return; }
    setDownloading('pdf');
    const toastId = toast.loading('Generating official PDF transcript…');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(node, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      pdf.save(`${getCleanFileName()}.pdf`);
      toast.success('Official PDF transcript downloaded!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('PDF generation failed', { id: toastId });
    } finally { setDownloading(null); }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-5xl h-[92dvh] max-h-[950px] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-[#24a4b5]/20 text-[#24a4b5] border border-[#24a4b5]/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Official Academic Transcript</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3 inline mr-1" />
                    Verified Record
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Complete summary of certified courses, bootcamps, and attendance credentials
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Preview Area */}
          <div
            ref={previewContainerRef}
            className="flex-1 overflow-auto bg-slate-950/90 p-4 sm:p-8 flex items-start justify-center relative scrollbar-thin"
          >
            <div
              style={{
                width: `${794 * scale}px`,
                minHeight: `${1123 * scale}px`,
                margin: '0 auto',
              }}
              className="relative transition-all duration-200"
            >
              <StudentTranscript data={data} scale={scale} />
            </div>
          </div>

          {/* Footer / Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-7 py-4 border-t border-slate-800 bg-slate-950/90 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium self-start sm:self-center">
              <span>Transcript Ref:</span>
              <span className="font-mono text-white font-bold bg-slate-800 px-2 py-0.5 rounded-md">
                {data.transcriptId}
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
                title="Print Transcript"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPNG}
                disabled={downloading !== null}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                title="Download High-Res Image"
              >
                <ImageIcon className="w-4 h-4" />
                <span>{downloading === 'png' ? 'Saving...' : 'PNG Image'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading !== null}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#24a4b5] to-teal-500 hover:from-[#1f8f9e] hover:to-teal-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#24a4b5]/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                title="Download Official PDF Transcript"
              >
                <FileText className="w-4 h-4" />
                <span>{downloading === 'pdf' ? 'Generating PDF...' : 'Download Official PDF'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
