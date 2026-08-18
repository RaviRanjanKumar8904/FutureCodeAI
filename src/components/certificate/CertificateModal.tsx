import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Image as ImageIcon, Copy, CheckCircle2, ShieldCheck, Award, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import CourseCertificate from './CourseCertificate';
import type { CertificateData } from './CourseCertificate';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CertificateData | null;
}

export default function CertificateModal({ isOpen, onClose, certificate }: CertificateModalProps) {
  const [downloading, setDownloading] = useState<'pdf' | 'png' | null>(null);
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState<number>(0.65);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic responsive scaling calculation to fit any screen (mobile, tablet, desktop)
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

  if (!isOpen || !certificate) return null;

  const getCleanFileName = () => {
    const student = (certificate.studentName || 'student').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const course = (certificate.courseName || 'course').toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `FutureCode_${student}_${course}_${certificate.certificateId}`;
  };

  const captureNode = () =>
    document.getElementById('export-certificate-node') ||
    document.getElementById('printable-certificate-node');

  const handleDownloadPNG = async () => {
    const node = captureNode();
    if (!node) { toast.error('Certificate not ready'); return; }
    setDownloading('png');
    const toastId = toast.loading('Generating high-res certificate image…');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(node, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png', 1);
      link.download = `${getCleanFileName()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Certificate image downloaded!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Download failed', { id: toastId });
    } finally { setDownloading(null); }
  };

  const handleDownloadPDF = async () => {
    const node = captureNode();
    if (!node) { toast.error('Certificate not ready'); return; }
    setDownloading('pdf');
    const toastId = toast.loading('Generating official PDF certificate…');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(node, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      pdf.save(`${getCleanFileName()}.pdf`);
      toast.success('Official PDF certificate downloaded!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('PDF generation failed', { id: toastId });
    } finally { setDownloading(null); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/verify?id=${certificate.certificateId}`);
    setCopied(true);
    toast.success('Verification link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop with luxury blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window themed to match Gold/Antique Certificate aesthetic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl bg-[#0d121c] border border-amber-500/25 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden z-10 flex flex-col h-[94vh] sm:h-[92vh] max-h-[950px]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header - Luxury Certificate Theme */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#0a0e17] border-b border-amber-500/20 flex items-center justify-between shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                <Award size={20} className="text-amber-400" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight truncate">
                    Verified Credential
                  </h3>
                  <span className="hidden xs:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold">
                    {certificate.certificateId}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-200/60 truncate">
                  {certificate.studentName} <span className="text-amber-500/40">•</span> {certificate.courseName}
                </p>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-200/90 text-xs font-bold transition-all border border-amber-500/20 hover:border-amber-500/40 shadow-sm"
              >
                {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Copy Link'}</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-700/60"
                aria-label="Close modal"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#080c14]/90 border-b border-amber-500/15 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 w-full xs:w-auto">
              <button
                onClick={handleDownloadPDF}
                disabled={Boolean(downloading)}
                className="flex-1 xs:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                <FileText size={15} />
                <span>{downloading === 'pdf' ? 'Generating PDF…' : 'Download PDF'}</span>
              </button>
              <button
                onClick={handleDownloadPNG}
                disabled={Boolean(downloading)}
                className="flex-1 xs:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold text-xs sm:text-sm transition-all border border-amber-500/25 active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                <ImageIcon size={15} />
                <span>{downloading === 'png' ? 'Saving Image…' : 'Download PNG'}</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-amber-200/50 font-medium">
              <Sparkles size={13} className="text-amber-400" />
              <span>Official 300 DPI Certificate</span>
            </div>
          </div>

          {/* Certificate Dynamic Preview Area - Auto-scaled to never crop on any screen */}
          <div
            ref={previewContainerRef}
            className="flex-1 overflow-hidden p-2 sm:p-4 bg-gradient-to-b from-[#070a10] via-[#0a0f18] to-[#070a10] flex items-center justify-center relative"
          >
            {/* Ambient gold glow */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
              }}
            />

            {/* Scaled Certificate Wrapper */}
            <div
              style={{
                width: `${794 * scale}px`,
                height: `${1123 * scale}px`,
                position: 'relative',
                transition: 'width 0.15s ease-out, height 0.15s ease-out',
              }}
              className="shadow-[0_10px_40px_rgba(0,0,0,0.7)] rounded-sm overflow-hidden border border-amber-500/30 shrink-0"
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: '794px',
                  height: '1123px',
                }}
              >
                <CourseCertificate containerId="printable-certificate-node" data={certificate} />
              </div>
            </div>
          </div>

          {/* Hidden 1:1 crisp off-screen container for high-res exports */}
          <div
            style={{
              position: 'fixed',
              top: '-10000px',
              left: '-10000px',
              width: '794px',
              height: '1123px',
              zIndex: -1,
              pointerEvents: 'none',
            }}
          >
            <CourseCertificate containerId="export-certificate-node" data={certificate} />
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#0a0e17] border-t border-amber-500/20 flex items-center justify-between text-xs text-amber-200/60 shrink-0">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck size={14} /> Authenticity Verified
            </span>
            <span className="font-mono text-[11px] text-amber-400/50">
              FutureCode AI Certification
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
