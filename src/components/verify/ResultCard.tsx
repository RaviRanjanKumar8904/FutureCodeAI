import { useState } from 'react';
import Reveal from '../Reveal';
import { 
  CheckCircle2, XCircle, Download, Calendar, BookOpen, User, 
  ShieldAlert, Award, Copy, Check, Share2, Eye, ExternalLink, 
  Sparkles, Building2, ShieldCheck, CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import CertificateModal from '../certificate/CertificateModal';
import CourseCertificate, { type CertificateData } from '../certificate/CourseCertificate';
import toast from 'react-hot-toast';

interface ResultCardProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'revoked';
  data: any | null;
}

export default function ResultCard({ status, data }: ResultCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (status === 'idle') return null;

  const handleCopyLink = () => {
    if (!data?.certificateId) return;
    const url = `${window.location.origin}/verify?id=${data.certificateId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Verification link copied to clipboard!', { icon: '🔗' });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLinkedInShare = () => {
    if (!data) return;
    const url = `${window.location.origin}/verify?id=${data.certificateId}`;
    const text = `Verified Credential: ${data.studentName} has successfully completed the "${data.courseName}" program at FutureCode AI! 🎓\n\nVerification Link: ${url}`;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Standardize certificate data for the certificate modal & renderer
  const certPayload: CertificateData | null = data ? {
    id: data.certificateId,
    certificateId: data.certificateId,
    studentName: data.studentName || 'Student',
    studentEmail: data.studentEmail || '',
    gender: data.gender || 'Male',
    courseName: data.courseName || 'Course Certificate',
    domain: data.domain || data.courseName,
    startDate: data.startDate,
    endDate: data.endDate || data.issueDate,
    issueDate: data.endDate || data.issueDate,
    grade: data.grade,
    marksPercentage: data.marksPercentage,
  } : null;

  return (
    <div className="container mx-auto px-4 sm:px-6 max-w-5xl pb-16 sm:pb-24 relative z-10 -mt-2 sm:mt-4">
      <Reveal direction="up">
        
        {/* Loading State */}
        {status === 'loading' && (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-200/80 animate-pulse flex flex-col md:flex-row gap-8 items-center">
            <div className="w-full md:w-5/12 aspect-[3/4] max-h-80 bg-slate-200/70 rounded-2xl" />
            <div className="w-full md:w-7/12 space-y-4">
              <div className="h-8 bg-slate-200/80 rounded-full w-2/3" />
              <div className="h-4 bg-slate-200/60 rounded-full w-1/3" />
              <div className="grid grid-cols-2 gap-3 pt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-slate-200/50 rounded-2xl" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error / Not Found State */}
        {status === 'error' && (
          <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-2xl border border-rose-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-5 text-rose-500 shadow-inner">
              <XCircle size={40} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Certificate Not Found
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
              We couldn't locate a verified record matching that Certificate ID. Please verify the ID on your certificate or contact our verification team.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link 
                to="/#enquiry-form"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-600/20"
              >
                Contact Support
              </Link>
              <Link 
                to="/programs"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm transition-all"
              >
                Explore Programs
              </Link>
            </div>
          </div>
        )}

        {/* Revoked State */}
        {status === 'revoked' && (
          <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-2xl border border-amber-200 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5 text-amber-600 shadow-inner">
              <ShieldAlert size={40} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Certificate Revoked
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
              This certificate record was formally revoked by FutureCode AI and is no longer valid for official credential representation.
            </p>
          </div>
        )}

        {/* Success Verified State */}
        {status === 'success' && data && certPayload && (
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200/90 overflow-hidden relative transition-all">
            {/* Top Gold Gradient Bar */}
            <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

            <div className="p-5 sm:p-8 md:p-10 lg:p-12">
              {/* Verified Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-6 border-b border-slate-100">
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 font-extrabold text-xs sm:text-sm px-4 py-2 rounded-full border border-emerald-200/80 shadow-sm">
                  <CheckCircle size={17} className="text-emerald-600" />
                  <span>Officially Verified &amp; Authentic Credential</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                    title="Copy Verification Link"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-500" />}
                    <span>{copied ? 'Copied Link!' : 'Share Link'}</span>
                  </button>
                  <button
                    onClick={handleLinkedInShare}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                    title="Share on LinkedIn"
                  >
                    <Share2 size={14} />
                    <span className="hidden sm:inline">LinkedIn</span>
                  </button>
                </div>
              </div>

              {/* Main Content: Certificate Visual Preview + Verified Details */}
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-stretch">
                
                {/* Left Side: Interactive Certificate Visual Container */}
                <div className="w-full lg:w-5/12 flex flex-col items-center justify-center">
                  <div
                    onClick={() => setShowModal(true)}
                    className="group relative w-full max-w-[340px] sm:max-w-[380px] aspect-[1/1.414] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border-2 border-amber-300/60 bg-slate-900 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-amber-400"
                  >
                    {/* Background template preview */}
                    <img
                      src="/certificate-template.jpg"
                      alt="Certificate Preview"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Gradient Overlay with Live Text Details */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-between p-5 text-white">
                      <div className="flex justify-end">
                        <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                          Official Certificate
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-amber-300 tracking-wider uppercase block">
                          Awarded To
                        </span>
                        <h4 className="text-lg sm:text-xl font-extrabold text-white leading-tight drop-shadow">
                          {data.studentName}
                        </h4>
                        <p className="text-xs text-slate-300 font-medium line-clamp-1">
                          {data.domain || data.courseName}
                        </p>
                        <div className="pt-2 flex items-center justify-between border-t border-white/20 text-[11px]">
                          <span className="font-mono text-amber-300 font-bold">{data.certificateId}</span>
                          <span className="text-slate-300">{data.endDate || data.issueDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hover Click-to-View Icon Badge */}
                    <div className="absolute inset-0 bg-amber-950/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white/90 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-full shadow-xl flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        <Eye size={15} className="text-amber-600" />
                        <span>Click to View Fullscreen</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 font-medium text-center mt-3 flex items-center gap-1">
                    <Sparkles size={13} className="text-amber-500" />
                    Tap certificate to view full document &amp; download
                  </p>
                </div>

                {/* Right Side: Structured Details Grid */}
                <div className="w-full lg:w-7/12 flex flex-col justify-between space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1.5 tracking-tight">
                      Credential Details
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                      Issued under FutureCode AI Certification Authority &amp; Industry Standards.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6">
                      {/* Student Name */}
                      <DetailBox
                        icon={<User className="text-indigo-600" size={20} />}
                        label="Student Name"
                        value={data.studentName}
                        badge={data.gender}
                      />

                      {/* Program / Course */}
                      <DetailBox
                        icon={<BookOpen className="text-blue-600" size={20} />}
                        label="Course / Program"
                        value={data.courseName}
                      />

                      {/* Domain / Specialization */}
                      <DetailBox
                        icon={<Award className="text-amber-600" size={20} />}
                        label="Specialization"
                        value={data.domain || data.courseName}
                      />

                      {/* Completion & Issue Date */}
                      <DetailBox
                        icon={<Calendar className="text-emerald-600" size={20} />}
                        label="Completion &amp; Issue Date"
                        value={data.endDate || data.issueDate || 'Verified'}
                      />
                    </div>

                    {/* Performance / Grade & ID Callout */}
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Certificate ID
                        </span>
                        <span className="font-mono text-base sm:text-lg font-extrabold text-slate-900 tracking-wide">
                          {data.certificateId}
                        </span>
                      </div>

                      {data.grade && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Performance:</span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-xs border border-emerald-200">
                            Grade {data.grade} {data.marksPercentage ? `(${data.marksPercentage}%)` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* High-Contrast Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => setShowModal(true)}
                      className="flex-1 py-3.5 px-6 rounded-2xl font-extrabold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Download size={18} />
                      <span>Download PDF / High-Res PNG</span>
                    </button>

                    <button
                      onClick={() => setShowModal(true)}
                      className="py-3.5 px-5 rounded-2xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Eye size={17} />
                      <span>Full Preview</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </Reveal>

      {/* Official Certificate Modal (Fullscreen Responsive Preview & High-Res Export) */}
      <CertificateModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        certificate={certPayload}
      />
    </div>
  );
}

function DetailBox({ icon, label, value, badge }: { icon: React.ReactNode; label: string; value: string; badge?: string }) {
  return (
    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3.5 transition-all hover:bg-slate-50">
      <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200/60 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug truncate">{value}</p>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
