import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Eye, Share2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import CertificateModal from '../certificate/CertificateModal';
import type { CertificateData } from '../certificate/CourseCertificate';
import TranscriptModal from './TranscriptModal';
import { useStudentTranscript } from '../../hooks/useStudentTranscript';

interface Certificate {
  id: string;
  studentName: string;
  studentEmail?: string;
  courseName: string;
  domain?: string;
  gender?: string;
  issueDate: string;
  startDate?: string;
  endDate?: string;
  certificateId: string;
  grade?: string;
  marksPercentage?: string;
  revoked?: boolean;
}

import { matchesUser } from '../../utils/matchesUser';
import { DashboardSkeleton, DashboardError } from '../layout/DashboardState';

export default function MyCertificates() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewCert, setPreviewCert] = useState<CertificateData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const { transcriptData, loading: transcriptLoading, fetchTranscript } = useStudentTranscript();

  const handleOpenTranscript = async () => {
    const data = await fetchTranscript();
    if (data) {
      setShowTranscript(true);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const userEmailClean = (user.email || '').toLowerCase().trim();

    const unsubCertificates = onSnapshot(
      query(collection(db, 'certificates'), where('studentEmail', '==', userEmailClean)),
      (snapshot) => {
        const certs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Certificate & { studentId?: string }))
          .filter(cert => !cert.revoked && matchesUser(user, cert.studentEmail, cert.studentName, cert.studentId));

        certs.sort((a, b) => {
          const d1 = new Date(b.issueDate || b.endDate || 0).getTime();
          const d2 = new Date(a.issueDate || a.endDate || 0).getTime();
          return d1 - d2;
        });

        setCertificates(certs);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to certificates:", err);
        setError("Failed to retrieve your certificates from the verified database.");
        setLoading(false);
      }
    );

    return () => {
      unsubCertificates();
    };
  }, [user]);

  const handlePreview = (cert: Certificate) => {
    const effectiveCompletionDate = cert.endDate || cert.issueDate;
    setPreviewCert({
      id: cert.id,
      certificateId: cert.certificateId || cert.id,
      studentName: cert.studentName || user?.displayName || 'Student',
      studentEmail: cert.studentEmail || user?.email || '',
      gender: cert.gender || 'Male',
      courseName: cert.courseName || 'Course Certificate',
      domain: cert.domain || cert.courseName,
      startDate: cert.startDate,
      endDate: effectiveCompletionDate,
      issueDate: effectiveCompletionDate,
      grade: cert.grade,
      marksPercentage: cert.marksPercentage,
    });
    setShowPreview(true);
  };

  const handleLinkedInShare = (cert: Certificate) => {
    const certId = cert.certificateId || cert.id;
    const url = `${window.location.origin}/verify?id=${certId}`;
    const text = `I am proud to share that I have earned my official "${cert.courseName}" Certificate from FutureCode AI! 🎓\n\nVerified Certificate ID: ${certId}\n\n#FutureCodeAI #Certificate #Achievement #TechSkills`;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded-xl w-56 animate-pulse mb-6" />
        <DashboardSkeleton type="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <DashboardError
        title="Unable to load certificates"
        message={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
        }}
      />
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 bg-amber-50 border border-amber-200/60 rounded-3xl flex items-center justify-center mb-5 text-amber-600 shadow-inner">
          <Award size={36} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">No Certificates Issued Yet</h2>
        <p className="text-slate-500 font-medium max-w-md mx-auto mb-6 text-sm">
          Certificates are automatically issued upon completing your enrolled course duration and assessments.
        </p>
        <Link 
          to="/dashboard/student" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md shadow-indigo-600/20 text-sm flex items-center gap-2"
        >
          View Enrolled Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 font-bold shrink-0">
            <Award size={26} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              My Verified Certificates
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 font-bold border border-amber-500/30">
                {certificates.length} {certificates.length === 1 ? 'Certificate' : 'Certificates'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
              Officially issued and verifiable by FutureCode AI &amp; Government Recognized Partners.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenTranscript}
          disabled={transcriptLoading}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#152a4f] to-[#24a4b5] hover:from-[#1d3a6d] hover:to-[#2bc0d4] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#24a4b5]/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
        >
          <FileText size={16} />
          <span>{transcriptLoading ? 'Compiling Transcript...' : 'Download Official Transcript'}</span>
        </button>
      </div>

      {/* Certificates Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {certificates.map((cert, idx) => {
          const certId = cert.certificateId || cert.id;
          const displayDate = cert.endDate || cert.issueDate;

          return (
            <motion.div 
              key={cert.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
            >
              {/* Certificate Template Visual Preview */}
              <div
                className="h-48 sm:h-52 bg-slate-900 relative border-b border-slate-100 flex items-center justify-center cursor-pointer overflow-hidden group/preview"
                onClick={() => handlePreview(cert)}
              >
                <img
                  src="/certificate-template.jpg"
                  alt={cert.courseName}
                  className="h-full w-full object-cover opacity-85 group-hover/preview:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-transparent flex flex-col justify-end p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
                        Verified Certificate
                      </span>
                      <h3 className="text-white font-extrabold text-base sm:text-lg drop-shadow-md leading-tight line-clamp-1">
                        {cert.courseName}
                      </h3>
                      <span className="font-mono text-xs text-amber-200/90 font-bold">
                        ID: {certId}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover/preview:scale-110 transition-transform">
                      <Eye size={18} />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Card Meta & Action Buttons */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Course / Domain</span>
                    <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">
                      {cert.domain || cert.courseName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Completion &amp; Issue Date</span>
                    <span className="font-bold text-slate-800">{displayDate || 'Verified'}</span>
                  </div>

                  {cert.grade && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Grade &amp; Performance</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 font-mono text-[11px]">
                        Grade {cert.grade} {cert.marksPercentage ? `(${cert.marksPercentage}%)` : ''}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    onClick={() => handlePreview(cert)}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md shadow-amber-500/20 text-xs sm:text-sm active:scale-95 cursor-pointer"
                  >
                    <Eye size={15} />
                    <span>View &amp; Download</span>
                  </button>
                  <button 
                    onClick={() => handleLinkedInShare(cert)}
                    className="flex items-center justify-center gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white py-2.5 rounded-xl font-bold transition-all shadow-sm text-xs sm:text-sm active:scale-95 cursor-pointer"
                  >
                    <Share2 size={15} />
                    <span>Share on LinkedIn</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Certificate Preview Modal */}
      <CertificateModal
        isOpen={showPreview}
        onClose={() => { setShowPreview(false); setPreviewCert(null); }}
        certificate={previewCert}
      />

      {/* Official Transcript Modal */}
      {showTranscript && transcriptData && (
        <TranscriptModal
          isOpen={showTranscript}
          onClose={() => setShowTranscript(false)}
          data={transcriptData}
        />
      )}
    </div>
  );
}
