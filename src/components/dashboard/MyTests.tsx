import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, Target, ListChecks, ArrowRight, RotateCcw, Trophy } from 'lucide-react';

export default function MyTests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all active tests
        const testsSnap = await getDocs(
          query(collection(db, 'tests'), where('isActive', '==', true))
        );
        const allTests = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filter tests assigned to student's enrolled course
        const studentCourse = user.enrolledCourse || '';
        const relevantTests = allTests.filter((t: any) => {
          // Show test if courseId matches or courseName matches student's enrolled course
          if (!t.courseId && !t.courseName) return true; // Unassigned = open to all
          if (t.courseName && studentCourse && t.courseName.toLowerCase() === studentCourse.toLowerCase()) return true;
          return false;
        });

        // Also check by availability window
        const now = new Date();
        const availableTests = relevantTests.filter((t: any) => {
          if (t.startDate) {
            const start = new Date(t.startDate);
            if (now < start) return false;
          }
          if (t.endDate) {
            const end = new Date(t.endDate);
            if (now > end) return false;
          }
          return true;
        });

        // Fetch this student's attempts
        const attemptsSnap = await getDocs(
          query(collection(db, 'testAttempts'), where('studentId', '==', user.uid))
        );
        const allAttempts = attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setTests(availableTests);
        setAttempts(allAttempts);
      } catch (error) {
        console.error("Error fetching tests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const getTestStatus = (testId: string) => {
    const testAttempts = attempts.filter(a => a.testId === testId);
    if (testAttempts.length === 0) return { status: 'not_started', lastAttempt: null, count: 0 };
    
    const completed = testAttempts.filter(a => a.status === 'completed' || a.status === 'timed_out');
    const inProgress = testAttempts.find(a => a.status === 'in_progress');
    
    if (inProgress) return { status: 'in_progress', lastAttempt: inProgress, count: testAttempts.length };
    if (completed.length > 0) {
      // Get the best attempt
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
          <ClipboardCheck size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Tests</h1>
          <p className="text-sm text-slate-500 font-medium">Take assigned tests and view your results.</p>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <ClipboardCheck size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-700">No tests available</p>
          <p className="text-sm text-slate-400 mt-1">Tests assigned to your course will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map(test => {
            const { status, lastAttempt, count } = getTestStatus(test.id);
            const retakeAllowed = canRetake(test, count);

            return (
              <div
                key={test.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 flex flex-col"
              >
                {/* Type + Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    test.type === 'mcq' ? 'bg-indigo-50 text-indigo-700' :
                    test.type === 'coding' ? 'bg-teal-50 text-teal-700' :
                    'bg-purple-50 text-purple-700'
                  }`}>
                    {test.type === 'mcq' ? 'MCQ' : test.type === 'coding' ? 'Coding' : 'Mixed'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    status === 'completed' ? (lastAttempt?.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700') :
                    status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {status === 'completed' ? (lastAttempt?.passed ? '✓ Passed' : '✗ Failed') :
                     status === 'in_progress' ? 'In Progress' :
                     'Not Started'}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2">{test.title}</h3>
                {test.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{test.description}</p>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    <span className="font-bold text-slate-800">{test.durationMinutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ListChecks size={12} className="text-slate-400" />
                    <span className="font-bold text-slate-800">{test.questionsCount || 0} Q</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target size={12} className="text-slate-400" />
                    <span className="font-bold text-slate-800">{test.passPercentage || 0}%</span>
                  </div>
                </div>

                {/* Score if completed */}
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

                {/* Action Buttons */}
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2">
                  {status === 'not_started' && (
                    <button
                      onClick={() => navigate(`/dashboard/student/tests/${test.id}`)}
                      className="flex-1 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-600 transition-colors shadow-glow-primary flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      Take Test <ArrowRight size={14} />
                    </button>
                  )}
                  {status === 'in_progress' && (
                    <button
                      onClick={() => navigate(`/dashboard/student/tests/${test.id}`)}
                      className="flex-1 bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-amber-600 transition-colors shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      Continue Test <ArrowRight size={14} />
                    </button>
                  )}
                  {status === 'completed' && (
                    <>
                      <button
                        onClick={() => navigate(`/dashboard/student/tests/${test.id}/result/${lastAttempt.id}`)}
                        className="flex-1 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        View Result
                      </button>
                      {retakeAllowed && (
                        <button
                          onClick={() => navigate(`/dashboard/student/tests/${test.id}`)}
                          className="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
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
