import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, Target, ListChecks, ArrowRight, RotateCcw, Trophy, Search, AlertCircle, RefreshCw, Calendar } from 'lucide-react';

export default function MyTests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allTests, setAllTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [studentCourses, setStudentCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'my_courses'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTestsData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch all active tests
      const testsSnap = await getDocs(
        query(collection(db, 'tests'), where('isActive', '==', true))
      );
      const testsData = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllTests(testsData);

      // 2. Gather student enrolled courses
      const courseSet = new Set<string>();
      if (user.enrolledCourse) courseSet.add(user.enrolledCourse.trim());
      if (Array.isArray((user as any).enrolledCourses)) {
        (user as any).enrolledCourses.forEach((c: string) => {
          if (c) courseSet.add(c.trim());
        });
      }

      // Check student enrollments collection
      try {
        const enrollSnap = await getDocs(
          query(collection(db, 'enrollments'), where('studentId', '==', user.uid))
        );
        enrollSnap.docs.forEach(d => {
          const cName = d.data().courseName;
          if (cName) courseSet.add(cName.trim());
        });
      } catch (err) {
        console.warn('Enrollment fetch skipped:', err);
      }

      setStudentCourses(Array.from(courseSet));

      // 3. Fetch this student's attempts
      try {
        const attemptsSnap = await getDocs(
          query(collection(db, 'testAttempts'), where('studentId', '==', user.uid))
        );
        setAttempts(attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn('Attempts fetch error:', err);
      }
    } catch (error: any) {
      console.error("Error fetching tests:", error);
      setErrorMsg(
        error?.code === 'permission-denied'
          ? "Permission denied loading tests. Please make sure the Firestore security rules for tests are published in your Firebase Console."
          : (error?.message || "Failed to load tests.")
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTestsData();
  }, [fetchTestsData]);

  // Check if a test matches student's enrolled courses or batch
  const isEnrolledTest = useCallback((t: any) => {
    // If test is unassigned or assigned to all, it matches everyone
    if (!t.courseId && !t.courseName) return true;

    // Check course match
    const lowerCourses = studentCourses.map(c => c.toLowerCase());
    if (t.courseName && lowerCourses.includes(t.courseName.toLowerCase())) return true;

    // Check batch match (e.g. "ECE A")
    const studentBatch = ((user as any)?.batch || '').trim().toLowerCase();
    if (studentBatch && t.title && t.title.toLowerCase().includes(studentBatch)) return true;

    return false;
  }, [studentCourses, user]);

  // Filter tests based on tab and search query
  const displayedTests = useMemo(() => {
    return allTests.filter(t => {
      // Tab filter
      if (filterTab === 'my_courses' && !isEnrolledTest(t)) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = t.title?.toLowerCase().includes(q);
        const matchesCourse = t.courseName?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCourse && !matchesDesc) return false;
      }

      return true;
    });
  }, [allTests, filterTab, isEnrolledTest, searchTerm]);

  const getTestStatus = (testId: string) => {
    const testAttempts = attempts.filter(a => a.testId === testId);
    if (testAttempts.length === 0) return { status: 'not_started', lastAttempt: null, count: 0 };
    
    const inProgress = testAttempts.find(a => a.status === 'in_progress');
    if (inProgress) return { status: 'in_progress', lastAttempt: inProgress, count: testAttempts.length };

    const completed = testAttempts.filter(a => a.status === 'completed' || a.status === 'timed_out' || a.status === 'violation_submitted');
    if (completed.length > 0) {
      const latest = completed[0];
      const isPending = latest.evaluationStatus === 'pending' || 
        (latest.answers && Object.values(latest.answers).some((ans: any) => ans?.reviewStatus === 'pending_review'));

      if (isPending) {
        return { status: 'under_evaluation', lastAttempt: latest, count: testAttempts.length };
      }

      const best = completed.reduce((best: any, curr: any) => 
        (curr.totalScore || 0) > (best.totalScore || 0) ? curr : best
      , completed[0]);

      return { status: 'completed', lastAttempt: best, count: testAttempts.length };
    }
    return { status: 'not_started', lastAttempt: null, count: testAttempts.length };
  };

  const canRetake = (test: any, attemptCount: number) => {
    if (test.maxAttempts === 0) return true; // Unlimited
    return attemptCount < (test.maxAttempts || 1);
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Tests</h1>
            <p className="text-sm text-slate-500 font-medium">Take assigned and open tests, test your skills, and view results.</p>
          </div>
        </div>

        <button 
          onClick={fetchTestsData}
          className="self-start sm:self-auto px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Error alert if rules or fetch failed */}
      {errorMsg && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs sm:text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold mb-0.5">Could not load tests</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-2 min-h-[38px] whitespace-nowrap rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Available Tests ({allTests.length})
          </button>
          <button
            onClick={() => setFilterTab('my_courses')}
            className={`px-3.5 py-2 min-h-[38px] whitespace-nowrap rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'my_courses'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assigned to My Course ({allTests.filter(isEnrolledTest).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search tests by title or course..."
            className="w-full pl-9 pr-3.5 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-xl text-base sm:text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Test Cards List */}
      {displayedTests.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <ClipboardCheck size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-700">No tests found</p>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {filterTab === 'my_courses' 
              ? "No tests specifically assigned to your enrolled courses yet. Try switching to 'All Available Tests'."
              : "No active tests match your criteria."}
          </p>
          {filterTab === 'my_courses' && allTests.length > 0 && (
            <button
              onClick={() => setFilterTab('all')}
              className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              View All Available Tests ({allTests.length})
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedTests.map(test => {
            const { status, lastAttempt, count } = getTestStatus(test.id);
            const retakeAllowed = canRetake(test, count);

            // Check availability window
            const isUpcoming = test.startDate && new Date(test.startDate) > now;
            const isExpired = test.endDate && new Date(test.endDate) < now;

            return (
              <div
                key={test.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 flex flex-col relative"
              >
                {/* Type + Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      test.type === 'mcq' ? 'bg-indigo-50 text-indigo-700' :
                      test.type === 'coding' ? 'bg-teal-50 text-teal-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {test.type === 'mcq' ? 'MCQ' : test.type === 'coding' ? 'Coding' : 'Mixed'}
                    </span>
                    {test.courseName ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 truncate max-w-[140px]">
                        📘 {test.courseName}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        🌐 Open to All
                      </span>
                    )}
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    isUpcoming ? 'bg-sky-50 text-sky-700' :
                    isExpired ? 'bg-slate-100 text-slate-500' :
                    status === 'under_evaluation' ? 'bg-amber-100 text-amber-800' :
                    status === 'completed' ? (lastAttempt?.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700') :
                    status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {isUpcoming ? 'Upcoming' :
                     isExpired ? 'Expired' :
                     status === 'under_evaluation' ? '⏳ Under Evaluation' :
                     status === 'completed' ? (lastAttempt?.passed ? '✓ Passed' : '✗ Failed') :
                     status === 'in_progress' ? 'In Progress' :
                     'Not Started'}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-slate-900 mb-1 leading-snug line-clamp-2">{test.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                  {test.description || 'No description provided.'}
                </p>

                {/* Window Banner if restricted */}
                {(test.startDate || test.endDate) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-purple-700 bg-purple-50/70 px-2.5 py-1.5 rounded-lg mb-3 border border-purple-100">
                    <Calendar size={12} className="shrink-0" />
                    <span className="truncate">
                      {test.startDate ? `From: ${new Date(test.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                      {test.startDate && test.endDate ? ' • ' : ''}
                      {test.endDate ? `Until: ${new Date(test.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    <span className="font-bold text-slate-800">{test.durationMinutes || 30} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ListChecks size={12} className="text-slate-400" />
                    <span className="font-bold text-slate-800">{test.questionsCount || 0} Q ({test.totalMarks || 0}m)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target size={12} className="text-slate-400" />
                    <span className="font-bold text-slate-800">{test.passPercentage || 40}%</span>
                  </div>
                </div>

                {/* Score if completed & evaluated */}
                {status === 'completed' && lastAttempt && (
                  <div className={`p-3 rounded-xl mb-4 border ${lastAttempt.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy size={16} className={lastAttempt.passed ? 'text-emerald-600' : 'text-rose-600'} />
                        <span className="text-sm font-extrabold text-slate-900">
                          {lastAttempt.totalScore}/{lastAttempt.maxScore}
                        </span>
                      </div>
                      <span className={`text-sm font-extrabold ${lastAttempt.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {lastAttempt.percentage?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Pending Evaluation notice on card */}
                {status === 'under_evaluation' && (
                  <div className="p-3 rounded-xl mb-4 bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                      <Clock size={15} className="text-amber-600 animate-pulse" />
                      <span>Pending Evaluation</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Under Review
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2">
                  {isUpcoming ? (
                    <button
                      disabled
                      className="flex-1 bg-slate-100 text-slate-400 px-4 py-2.5 min-h-[44px] rounded-xl font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      Upcoming Test
                    </button>
                  ) : isExpired ? (
                    <button
                      disabled
                      className="flex-1 bg-slate-100 text-slate-400 px-4 py-2.5 min-h-[44px] rounded-xl font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      Test Window Closed
                    </button>
                  ) : status === 'not_started' ? (
                    <button
                      onClick={() => navigate(`/dashboard/student/tests/${test.id}`)}
                      className="flex-1 bg-primary text-white px-4 py-2.5 min-h-[44px] rounded-xl font-bold text-xs hover:bg-indigo-600 transition-colors shadow-glow-primary flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      Take Test <ArrowRight size={14} />
                    </button>
                  ) : status === 'in_progress' ? (
                    <button
                      onClick={() => navigate(`/dashboard/student/tests/${test.id}`)}
                      className="flex-1 bg-amber-500 text-white px-4 py-2.5 min-h-[44px] rounded-xl font-bold text-xs hover:bg-amber-600 transition-colors shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      Continue Test <ArrowRight size={14} />
                    </button>
                  ) : status === 'under_evaluation' ? (
                    <button
                      onClick={() => navigate(`/dashboard/student/tests/${test.id}/result/${lastAttempt.id}`)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 min-h-[44px] rounded-xl font-bold text-xs transition-colors shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      View Submission Status <ArrowRight size={14} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate(`/dashboard/student/tests/${test.id}/result/${lastAttempt.id}`)}
                        className="flex-1 bg-slate-100 text-slate-700 px-4 py-2.5 min-h-[44px] rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        View Result
                      </button>
                      {retakeAllowed && (
                        <button
                          onClick={() => navigate(`/dashboard/student/tests/${test.id}`)}
                          className="bg-indigo-50 text-indigo-700 px-3.5 py-2.5 min-h-[44px] rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <RotateCcw size={13} /> Retake
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Attempt count */}
                {count > 0 && (
                  <p className="text-[10px] text-slate-400 font-bold mt-2 text-center">
                    {count} attempt{count !== 1 ? 's' : ''} 
                    {test.maxAttempts > 0 ? ` / ${test.maxAttempts} allowed` : ' (unlimited)'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
