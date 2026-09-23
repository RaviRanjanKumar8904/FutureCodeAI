import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { 
  Trophy, ChevronLeft, Download, RotateCcw, CheckCircle2, XCircle, 
  Clock, AlertCircle, Code2, ListChecks 
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

  useEffect(() => {
    if (!testId || !attemptId) return;
    const fetchData = async () => {
      setLoading(true);
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
      }
    };
    fetchData();
  }, [testId, attemptId, user, navigate]);

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

  const hasPendingReview = questions.some(q => 
    attempt.answers?.[q.id]?.reviewStatus === 'pending_review'
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard/student/tests')}
        className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer"
      >
        <ChevronLeft size={16} /> Back to Tests
      </button>

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

        {hasPendingReview && (
          <div className="bg-amber-100 border border-amber-200 rounded-xl px-4 py-2 text-xs font-bold text-amber-800 inline-flex items-center gap-1.5">
            <Clock size={14} /> Some coding answers are pending manual review. Score may change.
          </div>
        )}

        {/* Status */}
        {attempt.status === 'timed_out' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs font-bold text-amber-700 inline-flex items-center gap-1.5 mt-2">
            <Clock size={14} /> Test was auto-submitted due to timeout
          </div>
        )}
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

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleDownloadPDF}
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-600 transition-colors shadow-glow-primary flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Download size={16} /> Download Result (PDF)
        </button>
        <button
          onClick={() => navigate(`/dashboard/student/tests/${testId}`)}
          className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
