import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Users, 
  Video, 
  Award, 
  MessageSquare, 
  ChevronRight,
  Filter,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';

export type SearchCategory = 'all' | 'students' | 'webinars' | 'certificates' | 'enquiries';

export interface SearchResultItem {
  id: string;
  category: 'student' | 'webinar' | 'certificate' | 'enquiry';
  title: string;
  subtitle: string;
  badge: string;
  link: string;
  meta?: string;
  createdAt?: any;
}

export default function AdminGlobalSearch() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rawResults, setRawResults] = useState<{
    students: any[];
    webinars: any[];
    certificates: any[];
    enquiries: any[];
  }>({
    students: [],
    webinars: [],
    certificates: [],
    enquiries: [],
  });

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Ctrl+K / Cmd+K or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search across collections
  useEffect(() => {
    if (!searchTerm.trim()) {
      setRawResults({ students: [], webinars: [], certificates: [], enquiries: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      const term = searchTerm.toLowerCase().trim();

      try {
        const [usersSnap, enrollSnap, webinarsSnap, certsSnap, enqSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100))),
          getDocs(query(collection(db, 'enrollments'), orderBy('createdAt', 'desc'), limit(100))),
          getDocs(query(collection(db, 'webinars'), orderBy('createdAt', 'desc'), limit(50))),
          getDocs(query(collection(db, 'certificates'), orderBy('createdAt', 'desc'), limit(100))),
          getDocs(query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'), limit(100))),
        ]);

        // 1. Filter Students
        const studentMap = new Map<string, any>();
        usersSnap.docs.forEach(d => {
          const data = d.data();
          if (data.role === 'student' || !data.role) {
            studentMap.set(d.id, { id: d.id, ...data });
          }
        });
        enrollSnap.docs.forEach(d => {
          const data = d.data();
          if (!studentMap.has(d.id)) {
            studentMap.set(d.id, { id: d.id, ...data });
          }
        });

        const matchedStudents = Array.from(studentMap.values()).filter(s => {
          const name = (s.displayName || s.studentName || s.name || '').toLowerCase();
          const email = (s.email || s.studentEmail || '').toLowerCase();
          const college = (s.collegeName || s.school || s.assignedCenter || '').toLowerCase();
          const course = (s.enrolledCourse || s.courseName || '').toLowerCase();
          const roll = (s.rollNo || '').toLowerCase();
          return name.includes(term) || email.includes(term) || college.includes(term) || course.includes(term) || roll.includes(term);
        });

        // 2. Filter Webinars
        const matchedWebinars = webinarsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((w: any) => {
          const title = (w.title || '').toLowerCase();
          const topic = (w.topic || '').toLowerCase();
          const speaker = (w.speaker || '').toLowerCase();
          const staff = (w.assignedStaff || '').toLowerCase();
          return title.includes(term) || topic.includes(term) || speaker.includes(term) || staff.includes(term);
        });

        // 3. Filter Certificates
        const matchedCerts = certsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => {
          const certNum = (c.certificateNumber || c.certId || c.certificateId || '').toLowerCase();
          const sName = (c.studentName || c.name || '').toLowerCase();
          const sEmail = (c.studentEmail || c.email || '').toLowerCase();
          const cName = (c.courseName || c.course || '').toLowerCase();
          return certNum.includes(term) || sName.includes(term) || sEmail.includes(term) || cName.includes(term);
        });

        // 4. Filter Enquiries
        const matchedEnquiries = enqSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((e: any) => {
          const name = (e.name || e.studentName || '').toLowerCase();
          const email = (e.email || '').toLowerCase();
          const phone = (e.phone || '').toLowerCase();
          const course = (e.course || e.courseName || e.subject || '').toLowerCase();
          const message = (e.message || '').toLowerCase();
          return name.includes(term) || email.includes(term) || phone.includes(term) || course.includes(term) || message.includes(term);
        });

        setRawResults({
          students: matchedStudents.slice(0, 8),
          webinars: matchedWebinars.slice(0, 6),
          certificates: matchedCerts.slice(0, 6),
          enquiries: matchedEnquiries.slice(0, 6),
        });
      } catch (err) {
        console.error('Error during global search:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // Aggregate formatted results based on active category
  const formattedResults = useMemo(() => {
    const list: SearchResultItem[] = [];

    if (category === 'all' || category === 'students') {
      rawResults.students.forEach(s => {
        list.push({
          id: s.id,
          category: 'student',
          title: s.displayName || s.studentName || s.name || 'Student Candidate',
          subtitle: s.email || s.studentEmail || 'No email registered',
          badge: s.enrolledCourse || s.courseName || 'Enrolled Student',
          link: `/admin/students?search=${encodeURIComponent(s.email || s.studentEmail || s.displayName || '')}`,
          meta: s.collegeName || s.school || s.assignedCenter,
        });
      });
    }

    if (category === 'all' || category === 'webinars') {
      rawResults.webinars.forEach(w => {
        list.push({
          id: w.id,
          category: 'webinar',
          title: w.title || 'Masterclass Webinar',
          subtitle: w.speaker ? `Speaker: ${w.speaker}` : (w.topic || 'Bootcamp session'),
          badge: `${w.totalDays || 15}-Day (${w.status || 'Live'})`,
          link: `/admin/webinars`,
          meta: w.time || w.startDate,
        });
      });
    }

    if (category === 'all' || category === 'certificates') {
      rawResults.certificates.forEach(c => {
        list.push({
          id: c.id,
          category: 'certificate',
          title: c.certificateNumber || c.certId || 'Credential Certificate',
          subtitle: `${c.studentName || 'Student'} • ${c.courseName || 'Certification Track'}`,
          badge: c.revoked ? 'Revoked' : 'Verified',
          link: `/admin/certificates?search=${encodeURIComponent(c.certificateNumber || c.studentEmail || '')}`,
          meta: c.issueDate || 'Issued Certificate',
        });
      });
    }

    if (category === 'all' || category === 'enquiries') {
      rawResults.enquiries.forEach(e => {
        list.push({
          id: e.id,
          category: 'enquiry',
          title: e.name || 'Prospective Student Enquiry',
          subtitle: `${e.email || 'No email'} • ${e.phone || 'No phone'}`,
          badge: e.status || 'New',
          link: `/admin/enquiries?search=${encodeURIComponent(e.email || e.name || '')}`,
          meta: e.course || e.subject || 'Student Inquiry',
        });
      });
    }

    return list;
  }, [rawResults, category]);

  const totalCount = rawResults.students.length + rawResults.webinars.length + rawResults.certificates.length + rawResults.enquiries.length;

  const handleSelectResult = (item: SearchResultItem) => {
    setIsOpen(false);
    navigate(item.link);
  };

  const getCategoryIcon = (cat: SearchResultItem['category']) => {
    switch (cat) {
      case 'student': return <Users size={16} className="text-blue-600" />;
      case 'webinar': return <Video size={16} className="text-purple-600" />;
      case 'certificate': return <Award size={16} className="text-emerald-600" />;
      case 'enquiry': return <MessageSquare size={16} className="text-amber-600" />;
    }
  };

  const getCategoryColor = (cat: SearchResultItem['category']) => {
    switch (cat) {
      case 'student': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'webinar': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'certificate': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'enquiry': return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div ref={searchContainerRef} className="relative w-full z-30">
      {/* Search Input Bar */}
      <div 
        onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
        className={`bg-white rounded-3xl border transition-all flex items-center px-4 py-3 sm:py-3.5 shadow-sm cursor-text ${
          isOpen
            ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-lg'
            : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
        }`}
      >
        <Search size={20} className="text-indigo-600 shrink-0 mr-3" />
        
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Global Search students, webinars, certificates, inquiries... (Press Ctrl + K)"
          className="w-full bg-transparent text-sm sm:text-base font-bold text-slate-800 placeholder-slate-400 outline-none"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors mr-2 cursor-pointer"
          >
            <X size={16} />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-extrabold text-slate-500 shrink-0 select-none">
          <span>Ctrl</span>
          <span>+</span>
          <span>K</span>
        </div>
      </div>

      {/* Dropdown Results Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 flex flex-col max-h-[75vh]"
          >
            {/* Filter Category Chips */}
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 pl-2 pr-1 flex items-center gap-1">
                <Filter size={12} />
                <span>Filter:</span>
              </span>

              {[
                { id: 'all', label: `All Results (${totalCount})` },
                { id: 'students', label: `Students (${rawResults.students.length})` },
                { id: 'webinars', label: `Webinars (${rawResults.webinars.length})` },
                { id: 'certificates', label: `Certificates (${rawResults.certificates.length})` },
                { id: 'enquiries', label: `Enquiries (${rawResults.enquiries.length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id as SearchCategory)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    category === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content List */}
            <div className="overflow-y-auto p-3 divide-y divide-slate-100 flex-1">
              {loading ? (
                <div className="p-8 text-center text-slate-500 font-medium space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                  <p className="text-xs">Searching database across students, webinars, certificates &amp; leads…</p>
                </div>
              ) : !searchTerm.trim() ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-1">
                    <Sparkles size={22} />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800">Unified Admin Global Search</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Type a candidate name, email address, certificate number, webinar topic, or phone number to instantly query all records.
                  </p>
                </div>
              ) : formattedResults.length === 0 ? (
                <div className="p-8 text-center space-y-1">
                  <p className="text-sm font-bold text-slate-800">No records found for &ldquo;{searchTerm}&rdquo;</p>
                  <p className="text-xs text-slate-400">Try searching with a partial name, phone, or different category filter.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {formattedResults.map((item) => (
                    <div
                      key={`${item.category}-${item.id}`}
                      onClick={() => handleSelectResult(item)}
                      className="p-3 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${getCategoryColor(item.category)}`}>
                          {getCategoryIcon(item.category)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 truncate">
                              {item.title}
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${getCategoryColor(item.category)}`}>
                              {item.badge}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 font-medium truncate flex items-center gap-2 mt-0.5">
                            <span>{item.subtitle}</span>
                            {item.meta && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400 truncate">{item.meta}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform opacity-80 group-hover:opacity-100">
                        <span className="hidden sm:inline">Go to Page</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            {searchTerm.trim() && formattedResults.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
                <span>Showing {formattedResults.length} matched result(s)</span>
                <span className="text-[11px] text-slate-400">Click any result to navigate directly</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
