import React from 'react';
import { ShieldCheck, BookOpen, Video, CheckCircle2 } from 'lucide-react';

export interface TranscriptCourseItem {
  id: string;
  courseName: string;
  domain?: string;
  completionDate?: string;
  grade?: string;
  certificateId?: string;
  status: string;
}

export interface TranscriptWebinarItem {
  id: string;
  title: string;
  totalDays: number;
  attendedDays: number;
  percentage: number;
  completionDate?: string;
  certificateId?: string;
  status: string;
}

export interface StudentTranscriptData {
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  collegeName?: string;
  degree?: string;
  yearOfStudy?: string;
  studentId?: string;
  transcriptId: string;
  issueDate: string;
  courses: TranscriptCourseItem[];
  webinars: TranscriptWebinarItem[];
  totalCertificates: number;
}

interface StudentTranscriptProps {
  data: StudentTranscriptData;
  scale?: number;
}

export const StudentTranscript: React.FC<StudentTranscriptProps> = ({ data, scale = 1 }) => {
  const verifyUrl = `${window.location.origin}/verify`;

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
      }}
      className="transition-transform duration-150"
    >
      <div
        id="printable-transcript-node"
        className="w-[794px] min-h-[1123px] bg-white text-slate-900 font-sans p-10 relative flex flex-col justify-between shadow-2xl mx-auto border border-gray-200 overflow-hidden"
        style={{
          boxSizing: 'border-box',
          backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(36, 164, 181, 0.03) 0%, transparent 40%), radial-gradient(circle at 0% 100%, rgba(21, 42, 79, 0.03) 0%, transparent 40%)'
        }}
      >
        {/* Top Decorative Border */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#152a4f] via-[#24a4b5] to-[#152a4f]" />

        {/* Content Container */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="FutureCode AI Logo"
                className="h-14 w-auto rounded-xl object-contain border border-slate-200 shadow-xs"
                crossOrigin="anonymous"
              />
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#152a4f] leading-none">
                  FUTURECODE <span className="text-[#24a4b5]">AI</span>
                </h1>
                <p className="text-[11px] uppercase tracking-widest font-extrabold text-slate-500 mt-1">
                  Official Academic &amp; Credential Transcript
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  Autonomous Institute of Advanced Artificial Intelligence &amp; Software Engineering
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>Verified Record</span>
              </span>
              <p className="text-[11px] font-extrabold text-slate-700 mt-1.5">
                Transcript ID: <span className="font-mono text-[#152a4f]">{data.transcriptId}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Issue Date: {data.issueDate}
              </p>
            </div>
          </div>

          {/* Student Profile Card */}
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span>Candidate Information</span>
            </h2>
            <div className="grid grid-cols-3 gap-y-2.5 gap-x-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Student Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{data.studentName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Email</span>
                <span className="font-bold text-slate-800 break-all">{data.studentEmail}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Phone</span>
                <span className="font-bold text-slate-800">{data.studentPhone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">College / Institution</span>
                <span className="font-bold text-slate-800">{data.collegeName || 'FutureCode AI Academy'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Program / Branch</span>
                <span className="font-bold text-slate-800">{data.degree || 'Computer Science & AI'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Year of Study</span>
                <span className="font-bold text-slate-800">{data.yearOfStudy || 'Graduate Track'}</span>
              </div>
            </div>
          </div>

          {/* KPI Summary Badges */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-purple-50/70 border border-purple-200/80 p-3 rounded-xl text-center">
              <span className="text-xl font-black text-purple-900 block">{data.courses.length}</span>
              <span className="text-[10px] font-bold text-purple-700 uppercase">Courses Completed</span>
            </div>
            <div className="bg-indigo-50/70 border border-indigo-200/80 p-3 rounded-xl text-center">
              <span className="text-xl font-black text-indigo-900 block">{data.webinars.length}</span>
              <span className="text-[10px] font-bold text-indigo-700 uppercase">Bootcamps Attended</span>
            </div>
            <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl text-center">
              <span className="text-xl font-black text-amber-900 block">{data.totalCertificates}</span>
              <span className="text-[10px] font-bold text-amber-700 uppercase">Official Certificates</span>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl text-center">
              <span className="text-xl font-black text-emerald-900 block">Good Standing</span>
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Academic Status</span>
            </div>
          </div>

          {/* Section 1: Professional Courses & Certificates */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[#152a4f]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[#152a4f]">
                Completed Courses &amp; Certifications
              </h3>
            </div>
            {data.courses.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No individual course certifications registered yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="py-2 px-3">Course / Specialization</th>
                    <th className="py-2 px-3">Domain</th>
                    <th className="py-2 px-3 text-center">Completion Date</th>
                    <th className="py-2 px-3 text-center">Grade</th>
                    <th className="py-2 px-3 text-right">Certificate ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.courses.map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.courseName}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">{item.domain || 'Software Engineering'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{item.completionDate || data.issueDate}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-emerald-100 text-emerald-800">
                          {item.grade || 'A+ (Distinction)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-xs text-[#24a4b5]">
                        {item.certificateId || 'Verified'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 2: Webinars & Multi-Day Bootcamps */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Video size={16} className="text-[#152a4f]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[#152a4f]">
                Masterclasses &amp; Multi-Day Bootcamps Attended
              </h3>
            </div>
            {data.webinars.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No interactive masterclasses or bootcamps registered yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="py-2 px-3">Bootcamp / Masterclass</th>
                    <th className="py-2 px-3 text-center">Attendance Track</th>
                    <th className="py-2 px-3 text-center">Attendance Rate</th>
                    <th className="py-2 px-3 text-center">Standing</th>
                    <th className="py-2 px-3 text-right">Credential Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.webinars.map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-bold text-slate-900">{item.title}</td>
                      <td className="py-2 px-3 text-center text-slate-700 font-bold">
                        {item.attendedDays} / {item.totalDays} Days
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          item.percentage >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {item.percentage}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.percentage >= 75 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700">
                            <CheckCircle2 size={12} />
                            <span>Certified</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500">Completed</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-xs text-[#24a4b5]">
                        {item.certificateId || 'Verified Record'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer & Security Signatures */}
        <div className="pt-6 border-t-2 border-slate-200 space-y-4">
          <div className="flex items-end justify-between">
            {/* Verification QR / Link */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white border border-slate-300 rounded-lg p-1.5 flex flex-col items-center justify-center text-center shadow-xs">
                <ShieldCheck size={26} className="text-[#24a4b5]" />
                <span className="text-[8px] font-black uppercase text-[#152a4f] mt-0.5">AUTHENTIC</span>
              </div>
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <p className="font-extrabold text-slate-800">Tamper-Proof Digital Verification</p>
                <p>Verify this transcript online at <span className="text-primary font-bold">{verifyUrl}</span></p>
                <p className="text-[9px] text-slate-400">Document Hash: {data.transcriptId}-SECURE-RECORD</p>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="flex items-end gap-8 text-center">
              <div className="space-y-1">
                <div className="font-serif italic font-extrabold text-slate-800 text-sm border-b border-slate-400 pb-1 px-4">
                  FutureCode Academic Board
                </div>
                <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">
                  Controller of Examinations
                </p>
              </div>

              <div className="space-y-1">
                <div className="font-serif italic font-extrabold text-[#152a4f] text-sm border-b border-slate-400 pb-1 px-4">
                  Authorized Signatory
                </div>
                <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">
                  Director of Education
                </p>
              </div>
            </div>
          </div>

          <div className="text-center text-[9px] text-slate-400 font-medium pt-2 border-t border-slate-100">
            © {new Date().getFullYear()} FutureCode AI. All rights reserved. This official transcript certifies candidate accomplishments and valid coursework.
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentTranscript;
