import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import {
  doc, getDoc, collection, getDocs, addDoc, updateDoc, query, where,
  serverTimestamp
} from 'firebase/firestore';
import {
  Clock, AlertTriangle, ChevronLeft, ChevronRight, Send, Play,
  ListChecks, Flag, CheckCircle2, ClipboardCheck, Target
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TakeTest() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Test state
  const [started, setStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingAttempt, setExistingAttempt] = useState<any>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleSubmitRef = useRef<(isAutoSubmit?: boolean) => Promise<void>>(async () => {});

  const gradeAnswers = (ans: Record<string, any>, qs: any[]) => {
    let mcqScore = 0;
    let codingScore = 0;
    const gradedAnswers: Record<string, any> = {};

    for (const q of qs) {
      const answer = ans[q.id] || {};

      if (q.type === 'mcq') {
        const selected = answer.selectedOptions || [];
        const correct = q.correctAnswers || [];
        const isCorrect = selected.length === correct.length &&
          selected.every((s: number) => correct.includes(s)) &&
          correct.every((c: number) => selected.includes(c));
        
        const marksAwarded = isCorrect ? (q.marks || 0) : 0;
        mcqScore += marksAwarded;

        gradedAnswers[q.id] = {
          type: 'mcq',
          selectedOptions: selected,
          isCorrect,
          marksAwarded,
          reviewStatus: 'auto',
        };
      } else {
        // Coding
        const code = answer.code || '';
        const lang = answer.language || q.language || 'javascript';
        let marksAwarded = 0;
        const reviewStatus = 'pending_review';

        codingScore += marksAwarded;

        gradedAnswers[q.id] = {
          type: 'coding',
          code,
          language: lang,
          isCorrect: false,
          marksAwarded,
          reviewStatus,
        };
      }
    }

    const totalScore = mcqScore + codingScore;
    return { mcqScore, codingScore, totalScore, gradedAnswers };
  };

  const handleAutoSubmit = async (aId: string, ans: Record<string, any>, qs: any[], t: any) => {
    try {
      const { mcqScore, codingScore, totalScore, gradedAnswers } = gradeAnswers(ans, qs);
      const maxScore = (t as any).totalMarks || 0;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passed = percentage >= ((t as any).passPercentage || 0);

      await updateDoc(doc(db, 'testAttempts', aId), {
        answers: gradedAnswers,
        mcqScore, codingScore, totalScore, maxScore, percentage, passed,
        status: 'timed_out',
        submittedAt: serverTimestamp(),
      });
      setSubmitted(true);
      toast('Time expired! Test auto-submitted.', { icon: '⏰' });
    } catch (error) {
      console.error("Auto-submit error:", error);
    }
  };

  // Fetch test + questions
  useEffect(() => {
    if (!testId) return;
    const fetchTest = async () => {
      setLoading(true);
      try {
        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (!testDoc.exists()) {
          toast.error('Test not found');
          navigate('/dashboard/student/tests');
          return;
        }
        const testData = { id: testDoc.id, ...testDoc.data() };
        setTest(testData);
        setTimeLeft((testData as any).durationMinutes * 60);

        // Fetch questions
        const qSnap = await getDocs(collection(db, 'tests', testId, 'questions'));
        const qData = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        qData.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setQuestions(qData);

        // Check existing attempts
        if (user) {
          const attSnap = await getDocs(
            query(collection(db, 'testAttempts'),
              where('testId', '==', testId),
              where('studentId', '==', user.uid)
            )
          );
          const existing: any[] = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setAttemptCount(existing.length);

          // Check for in-progress attempt
          const inProgress = existing.find((a: any) => a.status === 'in_progress');
          if (inProgress) {
            setExistingAttempt(inProgress);
            setAnswers(inProgress.answers || {});
            setAttemptId(inProgress.id);

            // Calculate remaining time
            const startedAt = inProgress.startedAt?.toDate?.() || new Date();
            const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
            const remaining = Math.max(0, (testData as any).durationMinutes * 60 - elapsed);
            setTimeLeft(remaining);
            
            if (remaining > 0) {
              setStarted(true);
            } else {
              // Time expired while away — auto-submit
              await handleAutoSubmit(inProgress.id, inProgress.answers || {}, qData, testData);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching test:", error);
        toast.error("Failed to load test");
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId, user, navigate]);

  // Timer
  useEffect(() => {
    if (!started || submitted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit using latest callback ref
          handleSubmitRef.current(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, submitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTest = async () => {
    if (!user || !test) return;

    // Check attempt limits
    if (test.maxAttempts > 0 && attemptCount >= test.maxAttempts) {
      toast.error(`Maximum ${test.maxAttempts} attempts allowed. You've used all attempts.`);
      return;
    }

    try {
      const attemptData = {
        testId: test.id,
        testTitle: test.title,
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        studentEmail: user.email,
        courseId: test.courseId || '',
        status: 'in_progress',
        startedAt: serverTimestamp(),
        submittedAt: null,
        answers: {},
        mcqScore: 0,
        codingScore: 0,
        totalScore: 0,
        maxScore: test.totalMarks || 0,
        percentage: 0,
        passed: false,
      };

      const docRef = await addDoc(collection(db, 'testAttempts'), attemptData);
      setAttemptId(docRef.id);
      setStarted(true);
      setTimeLeft(test.durationMinutes * 60);
      toast.success('Test started! Good luck!');
    } catch (error) {
      console.error("Error starting test:", error);
      toast.error('Failed to start test');
    }
  };

  const handleAnswerMCQ = (questionId: string, optionIdx: number, isMultiple: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId]?.selectedOptions || [];
      let newSelected: number[];
      
      if (isMultiple) {
        newSelected = current.includes(optionIdx)
          ? current.filter((i: number) => i !== optionIdx)
          : [...current, optionIdx];
      } else {
        newSelected = [optionIdx];
      }

      return {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          type: 'mcq',
          selectedOptions: newSelected,
        }
      };
    });
  };

  const handleAnswerCoding = (questionId: string, field: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        type: 'coding',
        [field]: value,
      }
    }));
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!attemptId || submitting) return;

    if (!isAutoSubmit) {
      const unanswered = questions.filter(q => !answers[q.id] || 
        (q.type === 'mcq' && (!answers[q.id].selectedOptions || answers[q.id].selectedOptions.length === 0)) ||
        (q.type === 'coding' && !answers[q.id]?.code)
      );

      if (unanswered.length > 0) {
        const proceed = window.confirm(
          `You have ${unanswered.length} unanswered question${unanswered.length > 1 ? 's' : ''}. Submit anyway?`
        );
        if (!proceed) return;
      } else {
        if (!window.confirm('Are you sure you want to submit this test?')) return;
      }
    }

    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const { mcqScore, codingScore, totalScore, gradedAnswers } = gradeAnswers(answers, questions);
      const maxScore = test.totalMarks || 0;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passed = percentage >= (test.passPercentage || 0);

      await updateDoc(doc(db, 'testAttempts', attemptId), {
        answers: gradedAnswers,
        mcqScore, codingScore, totalScore, maxScore, percentage, passed,
        status: isAutoSubmit ? 'timed_out' : 'completed',
        submittedAt: serverTimestamp(),
      });

      setSubmitted(true);
      if (isAutoSubmit) {
        toast('Time expired! Test auto-submitted.', { icon: '⏰' });
      } else {
        toast.success('Test submitted successfully!');
      }

      // Navigate to result
      setTimeout(() => {
        navigate(`/dashboard/student/tests/${testId}/result/${attemptId}`);
      }, 1500);
    } catch (error) {
      console.error("Error submitting test:", error);
      toast.error("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  handleSubmitRef.current = handleSubmit;

  // Save answers periodically
  useEffect(() => {
    if (!started || !attemptId || submitted) return;
    const saveInterval = setInterval(async () => {
      try {
        await updateDoc(doc(db, 'testAttempts', attemptId), { answers });
      } catch {
        // Silent save
      }
    }, 30000); // Save every 30 seconds
    return () => clearInterval(saveInterval);
  }, [started, attemptId, answers, submitted]);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!test || !questions.length) {
    return (
      <div className="py-24 text-center">
        <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
        <p className="text-lg font-bold text-slate-700">Test not available</p>
        <p className="text-sm text-slate-400 mt-1">This test might be empty or inactive.</p>
        <button
          onClick={() => navigate('/dashboard/student/tests')}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
        >
          Back to Tests
        </button>
      </div>
    );
  }

  // Not started yet — show test overview / instructions
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/dashboard/student/tests')}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Tests
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
              <ClipboardCheck size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">{test.title}</h1>
            {test.description && (
              <p className="text-sm text-slate-500">{test.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <Clock size={18} className="text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">Duration</p>
              <p className="text-sm font-extrabold text-slate-900">{test.durationMinutes} min</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <ListChecks size={18} className="text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">Questions</p>
              <p className="text-sm font-extrabold text-slate-900">{questions.length}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <Target size={18} className="text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Marks</p>
              <p className="text-sm font-extrabold text-slate-900">{test.totalMarks || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <CheckCircle2 size={18} className="text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pass %</p>
              <p className="text-sm font-extrabold text-slate-900">{test.passPercentage || 0}%</p>
            </div>
          </div>

          {/* Rules */}
          <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-100 mb-6 text-xs text-amber-900 space-y-1.5">
            <p className="font-bold text-sm">📋 Test Rules</p>
            <p>• The timer starts as soon as you click "Start Test" and cannot be paused.</p>
            <p>• The test will auto-submit when time runs out.</p>
            <p>• Your answers are saved automatically every 30 seconds.</p>
            <p>• MCQ questions are auto-graded instantly.</p>
            <p>• Coding questions may require manual review by the instructor.</p>
            {test.maxAttempts > 0 && (
              <p>• Maximum attempts allowed: <strong>{test.maxAttempts}</strong> (Used: {attemptCount})</p>
            )}
          </div>

          {test.maxAttempts > 0 && attemptCount >= test.maxAttempts ? (
            <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100 text-sm text-red-600 font-bold">
              You have used all {test.maxAttempts} attempts for this test.
            </div>
          ) : (
            <button
              onClick={handleStartTest}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              <Play size={18} fill="currentColor" /> {existingAttempt ? 'Resume Test' : 'Start Test Now'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  const isAnswered = (idx: number) => {
    const qItem = questions[idx];
    if (!qItem) return false;
    const a = answers[qItem.id];
    if (!a) return false;
    if (qItem.type === 'mcq') return (a.selectedOptions || []).length > 0;
    if (qItem.type === 'coding') return !!a.code?.trim();
    return false;
  };

  const isMultipleCorrect = q?.type === 'mcq' && (q.correctAnswers || []).length > 1;
  const isTimeLow = timeLeft < 60;
  const currentAnswer = answers[q?.id] || {};

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Timer & Progress Bar */}
      <div className={`sticky top-0 z-20 bg-white/95 backdrop-blur-md rounded-2xl border shadow-sm p-3 flex items-center justify-between ${
        isTimeLow ? 'border-rose-200 bg-rose-50/95' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500">
            Q {currentQ + 1} / {questions.length}
          </span>
          <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-extrabold text-sm ${
            isTimeLow ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-700'
          }`}>
            <Clock size={14} />
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send size={13} />
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Question Navigation Sidebar */}
        <div className="hidden md:flex flex-col gap-1.5 w-14 shrink-0">
          {questions.map((qItem, idx) => {
            const answered = isAnswered(idx);
            const isFlagged = flagged.has(qItem.id);
            return (
              <button
                key={qItem.id}
                onClick={() => setCurrentQ(idx)}
                className={`w-10 h-10 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer relative ${
                  idx === currentQ ? 'bg-primary text-white shadow-md' :
                  answered ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                  'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {idx + 1}
                {isFlagged && (
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Question Content */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  q.type === 'mcq' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'
                }`}>
                  {q.type === 'mcq' ? 'MCQ' : 'Coding'}
                </span>
                <span className="text-xs font-bold text-slate-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                {isMultipleCorrect && (
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">Multiple Answers</span>
                )}
              </div>
              <button
                onClick={() => {
                  setFlagged(prev => {
                    const next = new Set(prev);
                    if (next.has(q.id)) {
                      next.delete(q.id);
                    } else {
                      next.add(q.id);
                    }
                    return next;
                  });
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  flagged.has(q.id) ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                }`}
                title="Flag for review"
              >
                <Flag size={14} />
              </button>
            </div>

            {q.type === 'mcq' ? (
              <>
                <p className="text-sm sm:text-base font-semibold text-slate-800 mb-4 leading-relaxed whitespace-pre-wrap">
                  {q.questionText}
                </p>

                <div className="space-y-2">
                  {(q.options as string[]).map((opt: string, idx: number) => {
                    const isSelected = (currentAnswer.selectedOptions || []).includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAnswerMCQ(q.id, idx, isMultipleCorrect)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-indigo-50 text-primary'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-extrabold shrink-0 ${
                          isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-slate-800 mb-4 leading-relaxed whitespace-pre-wrap">
                  {q.problemStatement}
                </div>

                {/* Sample I/O */}
                {(q.sampleInput || q.sampleOutput) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {q.sampleInput && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sample Input</p>
                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">{q.sampleInput}</pre>
                      </div>
                    )}
                    {q.sampleOutput && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sample Output</p>
                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">{q.sampleOutput}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Language Selector */}
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-xs font-bold text-slate-600">Language:</label>
                  <select
                    value={currentAnswer.language || q.language || 'javascript'}
                    onChange={e => handleAnswerCoding(q.id, 'language', e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="c">C</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                </div>

                {/* Code Editor (textarea) */}
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <div className="bg-slate-800 text-slate-400 text-[10px] font-mono px-3 py-1.5 flex items-center justify-between">
                    <span>{currentAnswer.language || q.language || 'javascript'}</span>
                    <span>{(currentAnswer.code || '').split('\n').length} lines</span>
                  </div>
                  <textarea
                    value={currentAnswer.code || ''}
                    onChange={e => handleAnswerCoding(q.id, 'code', e.target.value)}
                    className="w-full bg-slate-900 text-emerald-400 font-mono text-sm p-4 outline-none resize-none min-h-[200px] leading-relaxed"
                    placeholder="// Write your code here..."
                    spellCheck={false}
                    rows={12}
                  />
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
              className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            {/* Mobile question pills */}
            <div className="flex md:hidden gap-1 overflow-x-auto scrollbar-none">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQ(idx)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer ${
                    idx === currentQ ? 'bg-primary text-white' :
                    answers[questions[idx].id] ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-500'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentQ < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors cursor-pointer"
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 disabled:opacity-70"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Send size={14} /> Submit Test</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
