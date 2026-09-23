import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { 
  Trophy, ChevronLeft, Download, RotateCcw, CheckCircle2, XCircle, 
  Clock, AlertCircle, Code2, ListChecks, User, RefreshCw,
  AlertOctagon, MessageSquare, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TestResult() {
  const { testId, attemptId } = useParams<{ testId: string; attemptId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!testId || !attemptId) return;
    try {
      const [testDoc, attemptDoc, qSnap] = await Promise.all([
        getDoc(doc(db, 'tests', testId)),
        getDoc(doc(db, 'testAttempts', attemptId)),
        getDocs(collection(db, 'tests', testId, 'questions')),
      ]);

      if (!testDoc.exists() || !attemptDoc.exists()) {
        toast.error('Result not found');
        navigate('/dashboard/student/tests');
        return;
      }

      const attemptData = attemptDoc.data();
      if (user && attemptData?.studentId && attemptData.studentId !== user.uid) {
        toast.error('Unauthorized access to this test result');
        navigate('/dashboard/student/tests');
        return;
      }

      setTest({ id: testDoc.id, ...testDoc.data() });
      setAttempt({ id: attemptDoc.id, ...attemptData });
      
      const qData = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      qData.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setQuestions(qData);
    } catch (error) {
      console.error("Error fetching result:", error);
      toast.error("Failed to load result");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [testId, attemptId, user, navigate]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDownloadPDF = async () => {
    try {
      const { generateTestResultPDF } = await import('../../utils/generateTestResultPDF');
      generateTestResultPDF(test, attempt, questions);
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. The PDF module will be available shortly.");
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!test || !attempt) {
    return (
      <div className="py-24 text-center">
        <AlertCircle size={40} className="text-slate-300 mx-auto mb-3" />
        <p className="text-lg font-bold text-slate-700">Result not found</p>
        <button
          onClick={() => navigate('/dashboard/student/tests')}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm cursor-pointer"
        >
          Back to Tests
        </button>
      </div>
    );
  }

  // Count pending review questions
  const pendingCount = questions.filter(q => 
    attempt.answers?.[q.id]?.reviewStatus === 'pending_review'
  ).length;

  const autoCount = questions.filter(q => 
    attempt.answers?.[q.id]?.reviewStatus === 'auto' || attempt.answers?.[q.id]?.reviewStatus === 'reviewed'
  ).length;

  const hasPendingReview = attempt.evaluationStatus === 'pending' || pendingCount > 0;

  // --------------------------------------------------------------------------
  // PENDING EVALUATION SCREEN (Shown until instructor finishes grading)
  // --------------------------------------------------------------------------
  if (hasPendingReview) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation / Action bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard/student/tests')}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} /> Back to My Tests
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        {/* Proctoring Violation Notice */}
        {attempt.status === 'violation_submitted' && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-xs font-bold text-rose-900 flex items-start gap-3 shadow-xs">
            <AlertOctagon size={20} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-sm text-rose-950">AutoProctor Strike Limit Reached (Test Auto-Submitted)</p>
              <p className="font-medium text-rose-800 mt-1 leading-relaxed">
                This test was automatically terminated and submitted because 3 proctoring warnings were triggered (switching browser tabs, minimizing the window, or exiting full screen). Your completed answers have been retained.
              </p>
            </div>
          </div>
        )}

        {/* Hero Card */}
        <div className="rounded-3xl border-2 border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-indigo-50/40 p-6 sm:p-10 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-amber-400 opacity-20" />
            <div className="w-20 h-20 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700 shadow-inner">
              <Clock size={36} className="animate-pulse" />
            </div>
          </div>

          <div className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300/60 mb-3">
            ⏳ Under Evaluation
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">Evaluation in Progress</h1>
          
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-4">
            📘 {test.title} {test.courseName ? `• ${test.courseName}` : ''}
          </div>

          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed mb-6 font-medium">
            Your test has been successfully submitted! Coding and subjective questions are currently awaiting manual grading by your instructor.
          </p>

          {/* Status Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto mb-6 text-left">
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submission</span>
              <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={12} /> Received
              </span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Questions</span>
              <span className="text-xs font-extrabold text-slate-800 mt-0.5 block">
                {questions.length} Total
              </span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auto-Evaluated</span>
              <span className="text-xs font-extrabold text-indigo-600 mt-0.5 block">
                {autoCount} Checked
              </span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-200 shadow-2xs bg-amber-50/50">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Manual Review</span>
              <span className="text-xs font-extrabold text-amber-700 mt-0.5 block flex items-center gap-1">
                <Clock size={11} /> {pendingCount} Pending
              </span>
            </div>
          </div>

          {/* Informational callout */}
          <div className="bg-amber-100/70 border border-amber-300/80 rounded-2xl p-4 text-xs font-bold text-amber-900 max-w-xl mx-auto leading-relaxed text-left flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold mb-0.5 text-amber-950">Result Notice</p>
              <p className="font-medium text-amber-800">
                Your total score, percentage, answer solutions, and certificate report will be revealed right here once all pending evaluations are completed by your faculty.
              </p>
            </div>
          </div>
        </div>

        {/* Candidate Information Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-primary" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Candidate Information</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Candidate Name</span>
              <p className="text-sm font-extrabold text-slate-900 truncate mt-0.5">{attempt.studentName || user?.displayName || 'Student'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Roll / Reg No</span>
              <p className="text-sm font-mono font-extrabold text-indigo-600 truncate mt-0.5">{attempt.rollNo || (user as any)?.rollNo || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch / Batch</span>
              <p className="text-sm font-extrabold text-slate-800 truncate mt-0.5">{attempt.branch || (user as any)?.batch || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submitted At</span>
              <p className="text-sm font-medium text-slate-700 truncate mt-0.5">
                {attempt.submittedAt?.toDate 
                  ? attempt.submittedAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'Submitted'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard/student/tests')}
            className="w-full sm:w-auto bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-600 transition-colors shadow-glow-primary cursor-pointer active:scale-95 min-h-[44px] flex items-center justify-center"
          >
            Back to My Tests
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // FULL EVALUATED RESULT SCREEN (Revealed after all evaluations are completed)
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard/student/tests')}
        className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer"
      >
        <ChevronLeft size={16} /> Back to Tests
      </button>

      {/* Proctoring Violation Notice */}
      {attempt.status === 'violation_submitted' && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-xs font-bold text-rose-900 flex items-start gap-3 shadow-xs">
          <AlertOctagon size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-sm text-rose-950">AutoProctor Strike Limit Reached (Test Auto-Submitted)</p>
            <p className="font-medium text-rose-800 mt-1 leading-relaxed">
              This test was automatically terminated and submitted because 3 proctoring warnings were triggered (switching browser tabs, minimizing the window, or exiting full screen).
            </p>
          </div>
        </div>
      )}

      {/* Score Card */}
      <div className={`rounded-2xl border-2 p-6 sm:p-8 text-center ${
        attempt.passed 
          ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' 
          : 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-200'
      }`}>
        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
          attempt.passed ? 'bg-emerald-100' : 'bg-rose-100'
        }`}>
          {attempt.passed 
            ? <Trophy size={36} className="text-emerald-600" />
            : <XCircle size={36} className="text-rose-600" />
          }
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{test.title}</h1>
        <p className={`text-lg font-extrabold mb-4 ${attempt.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
          {attempt.passed ? 'Congratulations! You Passed! 🎉' : 'You Did Not Pass This Time'}
        </p>

        <div className="flex items-center justify-center gap-6 flex-wrap mb-4">
          <div>
            <p className="text-3xl font-extrabold text-slate-900">{attempt.totalScore ?? 0} <span className="text-lg text-slate-400">/ {attempt.maxScore ?? 0}</span></p>
            <p className="text-xs font-bold text-slate-500">Score</p>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div>
            <p className={`text-3xl font-extrabold ${attempt.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
              {attempt.percentage?.toFixed(1) ?? 0}%
            </p>
            <p className="text-xs font-bold text-slate-500">Percentage</p>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div>
            <p className="text-3xl font-extrabold text-slate-900">{test.passPercentage || 0}%</p>
            <p className="text-xs font-bold text-slate-500">Required</p>
          </div>
        </div>

        {/* Status */}
        {attempt.status === 'timed_out' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs font-bold text-amber-700 inline-flex items-center gap-1.5 mt-2">
            <Clock size={14} /> Test was auto-submitted due to timeout
          </div>
        )}
      </div>

      {/* Candidate Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-primary" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Candidate Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Candidate Name</span>
            <p className="text-sm font-extrabold text-slate-900 truncate mt-0.5">{attempt.studentName || 'Student'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Roll / Reg No</span>
            <p className="text-sm font-mono font-extrabold text-indigo-600 truncate mt-0.5">{attempt.rollNo || '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch / Stream</span>
            <p className="text-sm font-extrabold text-slate-800 truncate mt-0.5">{attempt.branch || '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email ID</span>
            <p className="text-sm font-medium text-slate-700 truncate mt-0.5">{attempt.studentEmail || '—'}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">MCQ Score</p>
          <p className="text-lg font-extrabold text-indigo-600">{attempt.mcqScore ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Coding Score</p>
          <p className="text-lg font-extrabold text-teal-600">{attempt.codingScore ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Attempt #</p>
          <p className="text-lg font-extrabold text-slate-700">{attempt.attemptNumber || 1}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Submitted</p>
          <p className="text-sm font-bold text-slate-700">
            {attempt.submittedAt?.toDate 
              ? attempt.submittedAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : '—'
            }
          </p>
        </div>
      </div>

      {/* Instructor Overall Feedback Card */}
      {attempt.adminFeedback && (
        <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-indigo-50/90 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-1.5 text-indigo-900 font-extrabold text-xs uppercase tracking-wider">
            <Sparkles size={15} className="text-indigo-600" />
            Instructor Evaluation Feedback
          </div>
          <p className="text-sm font-semibold text-slate-800 leading-relaxed italic">
            "{attempt.adminFeedback}"
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
        <button
          onClick={handleDownloadPDF}
          className="w-full sm:w-auto bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-600 transition-colors shadow-glow-primary flex items-center justify-center gap-2 cursor-pointer active:scale-95 min-h-[44px]"
        >
          <Download size={16} /> Download Result (PDF)
        </button>
        <button
          onClick={() => navigate(`/dashboard/student/tests/${testId}`)}
          className="w-full sm:w-auto bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95 min-h-[44px]"
        >
          <RotateCcw size={16} /> Retake Test
        </button>
      </div>

      {/* Question-by-Question Breakdown */}
      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">Question Breakdown</h2>
        
        {questions.map((q, idx) => {
          const answer = attempt.answers?.[q.id];
          if (!answer) return null;

          return (
            <div key={q.id} className={`bg-white rounded-2xl border p-4 ${
              answer.isCorrect ? 'border-emerald-200' : 
              answer.reviewStatus === 'pending_review' ? 'border-amber-200' : 
              'border-rose-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-extrabold text-slate-500">Q{idx + 1}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  q.type === 'mcq' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'
                }`}>
                  {q.type === 'mcq' ? <ListChecks size={10} className="inline mr-1" /> : <Code2 size={10} className="inline mr-1" />}
                  {q.type}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  answer.isCorrect ? 'bg-emerald-100 text-emerald-700' :
                  answer.reviewStatus === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                  answer.reviewStatus === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {answer.isCorrect ? '✓ Correct' :
                   answer.reviewStatus === 'pending_review' ? '⏳ Pending Review' :
                   answer.reviewStatus === 'reviewed' ? '📝 Reviewed' :
                   '✗ Incorrect'}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-auto">
                  {answer.marksAwarded ?? 0}/{q.marks}
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-800 mb-2">
                {q.type === 'mcq' ? q.questionText : q.problemStatement}
              </p>

              {q.type === 'mcq' && (
                <div className="space-y-1">
                  {(q.options as string[]).map((opt: string, i: number) => {
                    const isSelected = (answer.selectedOptions || []).includes(i);
                    const isCorrect = (q.correctAnswers || []).includes(i);
                    return (
                      <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                        isCorrect && isSelected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        isCorrect ? 'bg-emerald-50/50 text-emerald-600 border border-dashed border-emerald-200' :
                        isSelected ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}>
                        <span className="font-extrabold w-5">{String.fromCharCode(65 + i)}.</span>
                        <span className="flex-1">{opt}</span>
                        {isCorrect && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                        {isSelected && !isCorrect && <XCircle size={12} className="text-rose-500 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'coding' && (
                <div className="space-y-2">
                  {answer.language && (
                    <p className="text-[10px] font-bold text-slate-400">Language: {answer.language}</p>
                  )}
                  <div className="bg-slate-900 rounded-xl p-3 overflow-x-auto">
                    <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">
                      {answer.code || '(No code submitted)'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Instructor Question Feedback */}
              {answer.feedback && (
                <div className="mt-2.5 bg-indigo-50/70 border border-indigo-200/70 rounded-xl p-2.5 text-xs text-indigo-950 flex items-start gap-2">
                  <MessageSquare size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-indigo-700 block mb-0.5">Instructor Feedback:</span>
                    <span className="font-medium text-slate-800">{answer.feedback}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
