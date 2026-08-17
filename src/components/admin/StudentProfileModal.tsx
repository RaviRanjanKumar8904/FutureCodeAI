import { X, Mail, Calendar, IdCard, Phone, MapPin, BookOpen, ExternalLink, Building2, Hash, School } from 'lucide-react';

interface Student {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  createdAt: any;
  phone?: string;
  gender?: string;
  school?: string;
  collegeName?: string;
  rollNo?: string;
  city?: string;
  degree?: string;
  yearOfStudy?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  enrolledCourse?: string;
  assignedCenter?: string;
  batch?: string;
}

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export default function StudentProfileModal({ isOpen, onClose, student }: StudentProfileModalProps) {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto" style={{ zIndex: 1000 }}>
      <div 
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative my-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/90 backdrop-blur-md">
          <h2 className="text-xl font-extrabold text-slate-900">Student Profile</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-4xl mb-4 border-4 border-white shadow-lg">
            {student.photoURL ? (
              <img src={student.photoURL} alt={student.displayName} className="w-full h-full rounded-full object-cover" />
            ) : (
              student.displayName ? student.displayName.charAt(0).toUpperCase() : 'S'
            )}
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{student.displayName || 'Unnamed Student'}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              Active Account
            </span>
            {student.gender && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {student.gender}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 pt-0 space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <IdCard size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Student ID</p>
                <p className="text-sm font-bold text-slate-700 font-mono">{student.id}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email Address</p>
                <p className="text-sm font-bold text-slate-700">{student.email}</p>
              </div>
            </div>

            {student.phone && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phone Number</p>
                  <p className="text-sm font-bold text-slate-700">{student.phone}</p>
                </div>
              </div>
            )}

            {(student.collegeName || student.school) && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-teal-600 shrink-0">
                  <School size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">College / Institute</p>
                  <p className="text-sm font-bold text-teal-800">{student.collegeName || student.school}</p>
                </div>
              </div>
            )}

            {student.rollNo && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-600 shrink-0">
                  <Hash size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reg / Roll Number</p>
                  <p className="text-sm font-bold text-amber-800 font-mono">{student.rollNo}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Registration Date</p>
                <p className="text-sm font-bold text-slate-700">
                  {student.createdAt?.toDate ? student.createdAt.toDate().toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Recent'}
                </p>
              </div>
            </div>

            {student.enrolledCourse && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Enrolled Course</p>
                  <p className="text-sm font-bold text-slate-700">{student.enrolledCourse}</p>
                </div>
              </div>
            )}

            {student.assignedCenter && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Coaching Center</p>
                  <p className="text-sm font-bold text-slate-700">{student.assignedCenter}</p>
                </div>
              </div>
            )}

            {student.batch && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Batch</p>
                  <p className="text-sm font-bold text-indigo-700">{student.batch}</p>
                </div>
              </div>
            )}

            {student.city && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location</p>
                  <p className="text-sm font-bold text-slate-700">{student.city}</p>
                </div>
              </div>
            )}

            {(student.githubUrl || student.linkedinUrl) && (
              <div className="pt-4 mt-2 border-t border-slate-200 flex gap-4">
                {student.githubUrl && (
                  <a href={student.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">
                    <ExternalLink size={16} /> GitHub
                  </a>
                )}
                {student.linkedinUrl && (
                  <a href={student.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-sm transition-colors">
                    <ExternalLink size={16} /> LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-slate-50 flex items-center justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
