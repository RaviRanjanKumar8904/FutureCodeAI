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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center overflow-y-auto z-[1100]">
      <div 
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[92dvh] border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white/95 backdrop-blur-md shrink-0">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Student Profile</h2>
          <button 
            onClick={onClose}
            className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-90"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-none space-y-4">
          <div className="flex flex-col items-center text-center pb-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-extrabold text-2xl mb-2.5 border-2 border-white shadow-md">
              {student.photoURL ? (
                <img src={student.photoURL} alt={student.displayName} className="w-full h-full rounded-full object-cover" />
              ) : (
                student.displayName ? student.displayName.charAt(0).toUpperCase() : 'S'
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">{student.displayName || 'Unnamed Student'}</h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap justify-center">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                Active Student
              </span>
              {student.gender && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                  {student.gender}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-100 space-y-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <IdCard size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Student ID</p>
                <p className="font-bold text-slate-800 font-mono truncate">{student.id}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <Mail size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email Address</p>
                <p className="font-bold text-slate-800 truncate">{student.email}</p>
              </div>
            </div>

            {student.phone && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Phone size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phone Number</p>
                  <p className="font-bold text-slate-800">{student.phone}</p>
                </div>
              </div>
            )}

            {(student.collegeName || student.school) && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-teal-600 shrink-0">
                  <School size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">College / Institute</p>
                  <p className="font-bold text-teal-900 truncate">{student.collegeName || student.school}</p>
                </div>
              </div>
            )}

            {student.rollNo && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-600 shrink-0">
                  <Hash size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reg / Roll Number</p>
                  <p className="font-bold text-amber-900 font-mono">{student.rollNo}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <Calendar size={15} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Registration Date</p>
                <p className="font-bold text-slate-800">
                  {student.createdAt?.toDate ? student.createdAt.toDate().toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'Recent'}
                </p>
              </div>
            </div>

            {student.enrolledCourse && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
                  <BookOpen size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Enrolled Course</p>
                  <p className="font-bold text-slate-800 truncate">{student.enrolledCourse}</p>
                </div>
              </div>
            )}

            {student.assignedCenter && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Building2 size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Coaching Center</p>
                  <p className="font-bold text-slate-800 truncate">{student.assignedCenter}</p>
                </div>
              </div>
            )}

            {student.batch && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Calendar size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Batch</p>
                  <p className="font-bold text-indigo-700">{student.batch}</p>
                </div>
              </div>
            )}

            {student.city && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location</p>
                  <p className="font-bold text-slate-800">{student.city}</p>
                </div>
              </div>
            )}

            {(student.githubUrl || student.linkedinUrl) && (
              <div className="pt-3 mt-1 border-t border-slate-200 flex gap-2.5">
                {student.githubUrl && (
                  <a href={student.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">
                    <ExternalLink size={13} /> GitHub
                  </a>
                )}
                {student.linkedinUrl && (
                  <a href={student.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors">
                    <ExternalLink size={13} /> LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 font-bold text-slate-700 bg-white border border-gray-200 hover:bg-slate-100 rounded-xl transition-colors text-xs sm:text-sm cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
