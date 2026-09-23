import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { 
  X, Search, Download, Eye, CheckCircle2, AlertCircle, Save, FileText, 
  ShieldAlert, ShieldCheck, AlertOctagon, Trash2, ChevronLeft, ChevronRight, 
  Play, Award, MessageSquare, FastForward, CheckSquare, Square,
  Keyboard, Sparkles, Filter, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportCSV } from '../../utils/csv';
import { generateTestResultPDF } from '../../utils/generateTestResultPDF';
import { sendNotification } from '../../utils/notificationService';

interface TestSubmissionsViewProps {
  isOpen: boolean;
  onClose: () => void;
  test: any;
}

const FEEDBACK_PRESETS = [
  '🌟 Excellent, optimal logic and clean structure!',
  '✓ Correct approach, all test cases handled.',
  '⚠️ Good logic, but missed minor edge cases.',
  '⚠️ Code has syntax/runtime issues or incomplete logic.',
  '❌ Output does not match expected format.',
  '💡 Good attempt, please review algorithmic efficiency.',
];

export default function TestSubmissionsView({ isOpen, onClose, test }: TestSubmissionsViewProps) {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [gradingChanges, setGradingChanges] = useState<Record<string, number>>({});
  const [feedbackChanges, setFeedbackChanges] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState<string>('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter tabs: 'all' | 'needs_review' | 'evaluated' | 'proctor_flagged' | 'passed' | 'failed'
  const [activeTab, setActiveTab] = useState<'all' | 'needs_review' | 'evaluated' | 'proctor_flagged' | 'passed' | 'failed'>('all');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Fast Navigation & Code Runner state
  const [onlyPendingNav, setOnlyPendingNav] = useState(false);
  const [notifyStudent, setNotifyStudent] = useState(true);
  const [runOutputs, setRunOutputs] = useState<Record<string, { output: string; isError: boolean; matchesExpected?: boolean }>>({});
  const [expandedReference, setExpandedReference] = useState<Record<string, boolean>>({});

  const fetchAttempts = useCallback(async () => {
    if (!test?.id) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'testAttempts'), where('testId', '==', test.id));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => {
        const aTime = a.submittedAt?.toDate?.() || a.startedAt?.toDate?.() || new Date(0);
        const bTime = b.submittedAt?.toDate?.() || b.startedAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      setAttempts(data);
    } catch (error) {
      console.error("Error fetching attempts:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [test?.id]);

  const fetchQuestions = useCallback(async () => {
    if (!test?.id) return;
    try {
      const snapshot = await getDocs(collection(db, 'tests', test.id, 'questions'));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setQuestions(data);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  }, [test?.id]);

  useEffect(() => {
    if (isOpen && test?.id) {
      fetchAttempts();
      fetchQuestions();
    }
  }, [isOpen, test?.id, fetchAttempts, fetchQuestions]);

  // Helper: check if an attempt has questions pending manual review
  const hasPendingReview = useCallback((a: any) => {
    if (a.evaluationStatus === 'pending') return true;
    if (!a.answers) return false;
    return Object.values(a.answers).some((ans: any) => ans?.reviewStatus === 'pending_review');
  }, []);

  const getPendingQuestionsCount = useCallback((a: any) => {
    if (!a.answers) return 0;
    return Object.values(a.answers).filter((ans: any) => ans?.reviewStatus === 'pending_review').length;
  }, []);

  // Sync selectedAttempt details into local editing state
  const selectAttempt = useCallback((att: any | null) => {
    setSelectedAttempt(att);
    setGradingChanges({});
    setRunOutputs({});
    if (att) {
      // Preload current feedback
      const initialFeedback: Record<string, string> = {};
      if (att.answers) {
        Object.entries(att.answers).forEach(([qId, ans]: [string, any]) => {
          if (ans?.feedback) initialFeedback[qId] = ans.feedback;
        });
      }
      setFeedbackChanges(initialFeedback);
      setOverallFeedback(att.adminFeedback || '');
    } else {
      setFeedbackChanges({});
      setOverallFeedback('');
    }
  }, []);

  // Compute KPIs
  const stats = useMemo(() => {
    const total = attempts.length;
    const needsReview = attempts.filter(hasPendingReview).length;
    const evaluated = attempts.filter(a => !hasPendingReview(a) && (a.status === 'completed' || a.status === 'timed_out' || a.status === 'violation_submitted')).length;
    const flagged = attempts.filter(a => (a.proctorWarnings || 0) > 0 || a.status === 'violation_submitted').length;
    const passed = attempts.filter(a => a.passed).length;
    const failed = attempts.filter(a => !a.passed && (a.status === 'completed' || a.status === 'timed_out' || a.status === 'violation_submitted')).length;
    const completedAttempts = attempts.filter(a => a.percentage != null);
    const avgScore = completedAttempts.length > 0 
      ? completedAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / completedAttempts.length 
      : 0;

    return { total, needsReview, evaluated, flagged, passed, failed, avgScore };
  }, [attempts, hasPendingReview]);

  // Tab Filtering & Search
  const filteredAttempts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return attempts.filter(a => {
      const matchesSearch = 
        (a.studentName || '').toLowerCase().includes(term) ||
        (a.studentEmail || '').toLowerCase().includes(term) ||
        (a.rollNo || '').toLowerCase().includes(term) ||
        (a.branch || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      switch (activeTab) {
        case 'needs_review':
          return hasPendingReview(a);
        case 'evaluated':
          return !hasPendingReview(a) && (a.status === 'completed' || a.status === 'timed_out' || a.status === 'violation_submitted');
        case 'proctor_flagged':
          return (a.proctorWarnings || 0) > 0 || a.status === 'violation_submitted';
        case 'passed':
          return a.passed;
        case 'failed':
          return !a.passed && (a.status === 'completed' || a.status === 'timed_out' || a.status === 'violation_submitted');
        default:
          return true;
      }
    });
  }, [attempts, searchTerm, activeTab, hasPendingReview]);

  // Candidates for navigation inside Detail View
  const navigationList = useMemo(() => {
    if (onlyPendingNav) {
      return attempts.filter(hasPendingReview);
    }
    return filteredAttempts.length > 0 ? filteredAttempts : attempts;
  }, [onlyPendingNav, attempts, filteredAttempts, hasPendingReview]);

  const currentNavIndex = useMemo(() => {
    if (!selectedAttempt) return -1;
    return navigationList.findIndex(a => a.id === selectedAttempt.id);
  }, [selectedAttempt, navigationList]);

  const handlePrevStudent = useCallback(() => {
    if (currentNavIndex > 0) {
      selectAttempt(navigationList[currentNavIndex - 1]);
    }
  }, [currentNavIndex, navigationList, selectAttempt]);

  const handleNextStudent = useCallback(() => {
    if (currentNavIndex < navigationList.length - 1) {
      selectAttempt(navigationList[currentNavIndex + 1]);
    }
  }, [currentNavIndex, navigationList, selectAttempt]);

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Quick Score helper
  const handleQuickScore = (questionId: string, marks: number) => {
    setGradingChanges(prev => ({ ...prev, [questionId]: marks }));
  };

  const handleAdjustScore = (questionId: string, delta: number, maxMarks: number) => {
    const current = gradingChanges[questionId] ?? selectedAttempt?.answers?.[questionId]?.marksAwarded ?? 0;
    const next = Math.max(0, Math.min(maxMarks, current + delta));
    setGradingChanges(prev => ({ ...prev, [questionId]: next }));
  };

  const handleSetFeedback = (questionId: string, text: string) => {
    setFeedbackChanges(prev => ({ ...prev, [questionId]: text }));
  };

  const handleAppendFeedbackPreset = (questionId: string, preset: string) => {
    setFeedbackChanges(prev => {
      const existing = prev[questionId] || selectedAttempt?.answers?.[questionId]?.feedback || '';
      const updated = existing ? `${existing} · ${preset}` : preset;
      return { ...prev, [questionId]: updated };
    });
  };

  // Safe client-side JavaScript code runner
  const handleTestRunCode = (question: any, code: string) => {
    if (!code || !code.trim()) {
      toast.error('No code submitted to test run');
      return;
    }

    try {
      const logs: string[] = [];
      const mockConsole = {
        log: (...args: any[]) => {
          logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        },
        info: (...args: any[]) => {
          logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        },
        error: (...args: any[]) => {
          logs.push('[Error] ' + args.map(a => String(a)).join(' '));
        },
        warn: (...args: any[]) => {
          logs.push('[Warn] ' + args.map(a => String(a)).join(' '));
        }
      };

      // Wrap code in a function with mock console and sample input if available
      const cleanInput = question.sampleInput || '';
      const runFn = new Function('console', 'input', `
        "use strict";
        try {
          ${code}
        } catch (err) {
          console.error(err.message || String(err));
        }
      `);

      runFn(mockConsole, cleanInput);
      const combinedOutput = logs.join('\n').trim();

      const expected = (question.expectedOutput || question.sampleOutput || '').trim();
      let matchesExpected: boolean | undefined = undefined;
      if (expected) {
        matchesExpected = combinedOutput.replace(/\r\n/g, '\n').trim() === expected.replace(/\r\n/g, '\n').trim();
      }

      setRunOutputs(prev => ({
        ...prev,
        [question.id]: {
          output: combinedOutput || '(Execution completed with no console output)',
          isError: logs.some(l => l.startsWith('[Error]')),
          matchesExpected
        }
      }));

      if (matchesExpected === true) {
        toast.success(`Q${questions.findIndex(q => q.id === question.id) + 1}: Output matches expected!`);
      } else if (matchesExpected === false) {
        toast('Output executed. Does not strictly match expected output.', { icon: 'ℹ️' });
      } else {
        toast.success('Code executed successfully');
      }
    } catch (err: any) {
      setRunOutputs(prev => ({
        ...prev,
        [question.id]: {
          output: `Execution Error: ${err.message || String(err)}`,
          isError: true,
          matchesExpected: false
        }
      }));
      toast.error('Code execution failed: ' + (err.message || 'Syntax error'));
    }
  };

  // Save Grades with optional advance to next candidate
  const handleSaveGrades = async (advanceNext = false) => {
    if (!selectedAttempt) return;
    setSavingGrade(true);
    try {
      const updatedAnswers = { ...(selectedAttempt.answers || {}) };
      let newCodingScore = selectedAttempt.codingScore || 0;

      // Update question marks & feedback
      for (const q of questions) {
        const qId = q.id;
        const currentAnswer = updatedAnswers[qId];
        if (!currentAnswer) continue;

        const hasMarksChange = gradingChanges[qId] !== undefined;
        const newMarks = hasMarksChange ? gradingChanges[qId] : (currentAnswer.marksAwarded ?? 0);
        const oldMarks = currentAnswer.marksAwarded ?? 0;

        if (hasMarksChange) {
          newCodingScore += (newMarks - oldMarks);
        }

        const newFeedback = feedbackChanges[qId] !== undefined 
          ? feedbackChanges[qId] 
          : (currentAnswer.feedback || '');

        const shouldMarkReviewed = hasMarksChange || newFeedback !== (currentAnswer.feedback || '') || currentAnswer.reviewStatus === 'pending_review';

        updatedAnswers[qId] = {
          ...currentAnswer,
          marksAwarded: newMarks,
          feedback: newFeedback,
          reviewStatus: shouldMarkReviewed ? 'reviewed' : currentAnswer.reviewStatus || 'reviewed',
        };
      }

      const stillPending = Object.values(updatedAnswers).some((a: any) => a.reviewStatus === 'pending_review');
      const newTotal = (selectedAttempt.mcqScore || 0) + newCodingScore;
      const maxScore = selectedAttempt.maxScore || test.totalMarks || 1;
      const newPercentage = maxScore > 0 ? (newTotal / maxScore) * 100 : 0;
      const passed = newPercentage >= (test.passPercentage || 0);

      const updatePayload: any = {
        answers: updatedAnswers,
        codingScore: newCodingScore,
        totalScore: newTotal,
        percentage: newPercentage,
        passed,
        evaluationStatus: stillPending ? 'pending' : 'completed',
        adminFeedback: overallFeedback.trim(),
        evaluatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'testAttempts', selectedAttempt.id), updatePayload);

      // Notification
      if (!stillPending && notifyStudent && selectedAttempt.studentEmail) {
        await sendNotification({
          userId: selectedAttempt.studentId || '',
          userEmail: selectedAttempt.studentEmail,
          title: 'Test Evaluation Complete',
          message: `Your test "${test.title}" has been fully evaluated. Final score: ${newTotal}/${maxScore} (${newPercentage.toFixed(1)}%).`,
          type: 'test',
          link: `/dashboard/student/tests/${test.id}/result/${selectedAttempt.id}`,
        });
      }

      // Update local attempt record
      const refreshedAttempt = {
        ...selectedAttempt,
        ...updatePayload,
      };

      // Update in main list
      setAttempts(prev => prev.map(a => a.id === selectedAttempt.id ? refreshedAttempt : a));
      setGradingChanges({});

      if (advanceNext) {
        toast.success(`Saved! Advanced to next candidate.`);
        // Find next student
        if (currentNavIndex < navigationList.length - 1) {
          selectAttempt(navigationList[currentNavIndex + 1]);
        } else {
          toast.success('All candidates in the current queue have been reviewed! 🎉');
          selectAttempt(null);
        }
      } else {
        toast.success(stillPending ? 'Grades saved (some questions still pending review).' : 'Evaluation completed and saved!');
        selectAttempt(refreshedAttempt);
      }
    } catch (error) {
      console.error("Error saving grades:", error);
      toast.error("Failed to save evaluation");
    } finally {
      setSavingGrade(false);
    }
  };

  // Keyboard shortcut listener for power grading
  useEffect(() => {
    if (!isOpen || !selectedAttempt) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a textarea or input unless using Ctrl/Alt
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSaveGrades(true);
      } else if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveGrades(false);
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextStudent();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStudent();
      } else if (e.key === 'Escape' && !isInput) {
        e.preventDefault();
        selectAttempt(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedAttempt, handleSaveGrades, handleNextStudent, handlePrevStudent, selectAttempt]);

  // Batch actions
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAttempts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAttempts.map(a => a.id)));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchAwardFullMarks = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Award full marks for all coding questions in ${selectedIds.size} selected submission(s)?`)) return;

    setBatchActionLoading(true);
    try {
      const batch = writeBatch(db);
      const codingQuestions = questions.filter(q => q.type === 'coding');

      for (const id of selectedIds) {
        const attempt = attempts.find(a => a.id === id);
        if (!attempt) continue;

        const updatedAnswers = { ...(attempt.answers || {}) };
        let newCodingScore = 0;

        codingQuestions.forEach(q => {
          const ans = updatedAnswers[q.id];
          if (ans) {
            updatedAnswers[q.id] = {
              ...ans,
              marksAwarded: q.marks,
              reviewStatus: 'reviewed',
              feedback: ans.feedback || 'Full marks awarded in batch evaluation.',
            };
            newCodingScore += q.marks;
          }
        });

        const newTotal = (attempt.mcqScore || 0) + newCodingScore;
        const maxScore = attempt.maxScore || test.totalMarks || 1;
        const newPercentage = maxScore > 0 ? (newTotal / maxScore) * 100 : 0;
        const passed = newPercentage >= (test.passPercentage || 0);

        const ref = doc(db, 'testAttempts', id);
        batch.update(ref, {
          answers: updatedAnswers,
          codingScore: newCodingScore,
          totalScore: newTotal,
          percentage: newPercentage,
          passed,
          evaluationStatus: 'completed',
          evaluatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      toast.success(`Evaluated & updated ${selectedIds.size} attempt(s) successfully!`);
      setSelectedIds(new Set());
      fetchAttempts();
    } catch (err) {
      console.error("Batch evaluation error:", err);
      toast.error('Failed to run batch evaluation');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const dataToExport = selectedIds.size > 0 
      ? attempts.filter(a => selectedIds.has(a.id))
      : filteredAttempts;

    const csvData = dataToExport.map((a: any) => ({
      'Student Name': a.studentName || '',
      'Roll / Reg No': a.rollNo || 'N/A',
      'Branch': a.branch || 'N/A',
      'Email': a.studentEmail || '',
      'Score': a.totalScore ?? 0,
      'Max Score': a.maxScore ?? 0,
      'Percentage': a.percentage != null ? `${a.percentage.toFixed(1)}%` : '—',
      'Evaluation Status': hasPendingReview(a) ? 'Pending Review' : 'Completed',
      'Pending Coding Qs': getPendingQuestionsCount(a),
      'Status': a.status || '',
      'Passed': a.passed ? 'Yes' : 'No',
      'Proctor Warnings': a.proctorWarnings ?? 0,
      'Admin Feedback': a.adminFeedback || '',
      'Submitted': formatDate(a.submittedAt),
    }));
    exportCSV(`${test.title}_submissions`, csvData);
  };

  const handleExportPDF = async () => {
    const dataToExport = selectedIds.size > 0 
      ? attempts.filter(a => selectedIds.has(a.id))
      : filteredAttempts;

    if (dataToExport.length === 0) { toast.error('No submissions to export'); return; }
    toast('Generating PDFs...', { icon: '📄' });
    for (const attempt of dataToExport) {
      try {
        generateTestResultPDF(test, attempt, questions);
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        console.error('Error generating PDF for', attempt.studentName, err);
      }
    }
    toast.success(`${dataToExport.length} PDF(s) generated!`);
  };

  const handleDeleteAttempt = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'testAttempts', deleteTarget.id));
      toast.success(`Attempt by "${deleteTarget.studentName || 'Unknown'}" deleted.`);
      if (selectedAttempt?.id === deleteTarget.id) {
        selectAttempt(null);
      }
      setDeleteTarget(null);
      fetchAttempts();
    } catch (error) {
      console.error('Error deleting attempt:', error);
      toast.error('Failed to delete attempt');
    } finally {
      setDeleting(false);
    }
  };

  // Launch Fast Review Queue (directly opens first candidate needing review)
  const handleLaunchFastReviewQueue = () => {
    const firstPending = attempts.find(hasPendingReview);
    if (firstPending) {
      setOnlyPendingNav(true);
      selectAttempt(firstPending);
      toast.success(`Loaded Fast Review Queue (${stats.needsReview} pending)`);
    } else {
      toast.success('All submissions have already been reviewed! 🎉');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 md:p-6 flex items-center justify-center overflow-y-auto z-[1100]">
      <div
        className="bg-white rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[94dvh] border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* ==================================================================== */}
        {/* HEADER                                                               */}
        {/* ==================================================================== */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  {selectedAttempt ? 'Fast Test Answer Evaluator' : `Submissions & Grading — ${test?.title || ''}`}
                </h2>
                {stats.needsReview > 0 && !selectedAttempt && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1">
                    <AlertCircle size={12} /> {stats.needsReview} Need Evaluation
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-medium text-xs mt-0.5">
                {selectedAttempt
                  ? `Grading: ${selectedAttempt.studentName} (${selectedAttempt.rollNo || selectedAttempt.studentEmail}) · Attempt #${selectedAttempt.attemptNumber || 1}`
                  : `${attempts.length} total candidate submissions · Instant grading & bulk review`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedAttempt ? (
              <div className="flex items-center gap-2">
                {/* Navigation Pills */}
                <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200">
                  <button
                    onClick={handlePrevStudent}
                    disabled={currentNavIndex <= 0}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    title="Previous Candidate (Alt+Left)"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-600 px-2 select-none">
                    {currentNavIndex + 1} of {navigationList.length}
                  </span>
                  <button
                    onClick={handleNextStudent}
                    disabled={currentNavIndex >= navigationList.length - 1}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    title="Next Candidate (Alt+Right)"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Candidate Dropdown Switcher */}
                <select
                  value={selectedAttempt.id}
                  onChange={(e) => {
                    const target = navigationList.find(a => a.id === e.target.value);
                    if (target) selectAttempt(target);
                  }}
                  className="hidden md:block max-w-[180px] text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 cursor-pointer outline-none truncate"
                  title="Switch candidate"
                >
                  {navigationList.map((a, idx) => (
                    <option key={a.id} value={a.id}>
                      {idx + 1}. {a.studentName || 'Unknown'} {hasPendingReview(a) ? '⏳' : '✓'}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => selectAttempt(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Back to List
                </button>
              </div>
            ) : (
              stats.needsReview > 0 && (
                <button
                  onClick={handleLaunchFastReviewQueue}
                  className="bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Sparkles size={14} />
                  <span>Start Fast Review ({stats.needsReview})</span>
                </button>
              )
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-90"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CANDIDATE DETAIL / FAST EVALUATION VIEW                             */}
        {/* ==================================================================== */}
        {selectedAttempt ? (
          <div className="overflow-y-auto flex-1 p-3 sm:p-5 md:p-6 space-y-4 bg-slate-50/50">
            {/* Top Navigation & Fast Shortcuts Bar */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              {/* Candidate Info */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-base shadow-inner">
                  {(selectedAttempt.studentName || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">{selectedAttempt.studentName || 'Unknown Student'}</h3>
                    {hasPendingReview(selectedAttempt) ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                        ⏳ Needs Review ({getPendingQuestionsCount(selectedAttempt)} coding Qs)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ✓ Evaluation Complete
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>{selectedAttempt.studentEmail || 'No email'}</span>
                    {selectedAttempt.rollNo && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-bold text-indigo-600">Roll: {selectedAttempt.rollNo}</span>
                      </>
                    )}
                    {selectedAttempt.branch && (
                      <>
                        <span>•</span>
                        <span>{selectedAttempt.branch}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation & Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Only Pending Toggle */}
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={onlyPendingNav}
                    onChange={(e) => setOnlyPendingNav(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Only Pending Queue</span>
                </label>

                {/* Prev / Next buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevStudent}
                    disabled={currentNavIndex <= 0}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    title="Previous Student (Alt+Left)"
                  >
                    <ChevronLeft size={14} /> <span>Prev</span>
                  </button>
                  <span className="text-xs font-mono font-extrabold text-slate-500 px-2">
                    {currentNavIndex + 1}/{navigationList.length}
                  </span>
                  <button
                    onClick={handleNextStudent}
                    disabled={currentNavIndex >= navigationList.length - 1}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    title="Next Student (Alt+Right)"
                  >
                    <span>Next</span> <ChevronRight size={14} />
                  </button>
                </div>

                <button
                  onClick={() => setDeleteTarget(selectedAttempt)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete this attempt to allow reattempt"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Score & Proctoring Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Score</p>
                <p className="text-lg font-black text-slate-900">
                  {(selectedAttempt.totalScore ?? 0) + (Object.values(gradingChanges).reduce((a, b) => a + b, 0) - Object.keys(gradingChanges).reduce((acc, qId) => acc + (selectedAttempt.answers?.[qId]?.marksAwarded ?? 0), 0))} / {selectedAttempt.maxScore || test.totalMarks || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MCQ Auto-Score</p>
                <p className="text-lg font-black text-indigo-600">{selectedAttempt.mcqScore ?? 0} pts</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coding Score</p>
                <p className="text-lg font-black text-teal-600">
                  {selectedAttempt.codingScore ?? 0}
                  {Object.keys(gradingChanges).length > 0 && <span className="text-xs text-amber-600 ml-1">→ modified</span>}
                </p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pass Status</p>
                <p className={`text-lg font-black ${selectedAttempt.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedAttempt.passed ? 'PASSED' : 'FAILED'}
                  <span className="text-xs text-slate-400 ml-1">({test.passPercentage || 40}% req)</span>
                </p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AutoProctor</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {(selectedAttempt.proctorWarnings || 0) > 0 || selectedAttempt.status === 'violation_submitted' ? (
                    <span className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-rose-200">
                      <ShieldAlert size={12} /> {selectedAttempt.proctorWarnings || 3} Strikes
                    </span>
                  ) : (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                      <ShieldCheck size={12} /> Clean Attempt
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Proctor Violation Log if any */}
            {(selectedAttempt.proctorViolations && selectedAttempt.proctorViolations.length > 0) && (
              <div className="bg-rose-50/70 border border-rose-300 rounded-2xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2 text-rose-900 font-extrabold text-xs uppercase tracking-wider">
                  <AlertOctagon size={14} className="text-rose-600" />
                  AutoProctor Recorded {selectedAttempt.proctorViolations.length} Tab/Screen Violation(s):
                </div>
                <div className="space-y-1 bg-white/90 rounded-xl p-2.5 border border-rose-200 text-xs">
                  {selectedAttempt.proctorViolations.map((v: any, vIdx: number) => (
                    <div key={vIdx} className="flex items-center justify-between text-slate-700 py-0.5 border-b border-rose-100 last:border-none">
                      <span className="font-semibold text-rose-800">#{v.warningNumber || vIdx + 1}: {v.detail || v.type}</span>
                      <span className="font-mono text-[11px] text-slate-400">{v.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Instructor Feedback Box */}
            <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Overall Candidate Evaluation Note</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Visible to student on their result report</span>
              </div>
              <textarea
                rows={2}
                value={overallFeedback}
                onChange={e => setOverallFeedback(e.target.value)}
                placeholder="e.g. Excellent grasp of algorithms! Solved edge cases cleanly. Keep up the high standard."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none font-medium"
              />
            </div>

            {/* Question-by-Question Grading Workspace */}
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const answer = selectedAttempt.answers?.[q.id];
                if (!answer) return null;

                const currentMarks = gradingChanges[q.id] !== undefined ? gradingChanges[q.id] : (answer.marksAwarded ?? 0);
                const isPending = answer.reviewStatus === 'pending_review';
                const runOutput = runOutputs[q.id];
                const showRef = expandedReference[q.id] ?? false;

                return (
                  <div 
                    key={q.id} 
                    className={`bg-white border-2 rounded-2xl p-4 sm:p-5 transition-all shadow-2xs ${
                      isPending ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 font-extrabold text-xs text-slate-700 flex items-center justify-center">
                          Q{idx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          q.type === 'mcq' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                        }`}>
                          {q.type}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {q.marks} max marks
                        </span>
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            ⏳ Needs Review
                          </span>
                        )}
                        {answer.reviewStatus === 'reviewed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            ✓ Reviewed
                          </span>
                        )}
                      </div>

                      {/* Current Question Score Pill */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Awarded:</span>
                        <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg border ${
                          currentMarks === q.marks ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                          currentMarks > 0 ? 'bg-amber-50 text-amber-700 border-amber-300' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {currentMarks} / {q.marks} marks
                        </span>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div className="text-sm font-semibold text-slate-800 mb-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      {q.type === 'mcq' ? q.questionText : q.problemStatement}
                    </div>

                    {/* MCQ Options Display */}
                    {q.type === 'mcq' && (
                      <div className="space-y-1.5 mb-3">
                        {(q.options as string[]).map((opt: string, i: number) => {
                          const isSelected = (answer.selectedOptions || []).includes(i);
                          const isCorrect = (q.correctAnswers || []).includes(i);
                          return (
                            <div 
                              key={i} 
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
                                isCorrect && isSelected 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' 
                                  : isCorrect 
                                    ? 'bg-emerald-50/50 text-emerald-700 border-dashed border-emerald-200' 
                                    : isSelected 
                                      ? 'bg-rose-50 text-rose-800 border-rose-300 font-bold' 
                                      : 'bg-white text-slate-600 border-slate-100'
                              }`}
                            >
                              <span className="font-extrabold w-5">{String.fromCharCode(65 + i)}.</span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                              {isSelected && !isCorrect && <AlertCircle size={14} className="text-rose-500 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Coding Workspace Evaluator */}
                    {q.type === 'coding' && (
                      <div className="space-y-3">
                        {/* Reference Toggle (Sample I/O & Expected Output) */}
                        <div className="flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => setExpandedReference(prev => ({ ...prev, [q.id]: !showRef }))}
                            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>{showRef ? '▲ Hide' : '▼ Show'} Question Reference (Expected Output & Samples)</span>
                          </button>
                          {q.language && (
                            <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Language: {answer.language || q.language}
                            </span>
                          )}
                        </div>

                        {showRef && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Sample Input</span>
                              <pre className="font-mono bg-white p-2 rounded border border-slate-200 text-slate-700 text-[11px] whitespace-pre-wrap">{q.sampleInput || '(None)'}</pre>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Sample Output</span>
                              <pre className="font-mono bg-white p-2 rounded border border-slate-200 text-slate-700 text-[11px] whitespace-pre-wrap">{q.sampleOutput || '(None)'}</pre>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-indigo-500 block mb-0.5">Expected Output (Target)</span>
                              <pre className="font-mono bg-indigo-50/60 p-2 rounded border border-indigo-200 text-indigo-900 text-[11px] whitespace-pre-wrap font-bold">{q.expectedOutput || '(Manual review)'}</pre>
                            </div>
                          </div>
                        )}

                        {/* Student Code Box */}
                        <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner">
                          <div className="bg-slate-800 text-slate-300 text-[11px] font-mono px-3 py-1.5 flex items-center justify-between border-b border-slate-700">
                            <span>Candidate Code ({answer.language || q.language || 'javascript'})</span>
                            <div className="flex items-center gap-2">
                              <span>{(answer.code || '').split('\n').length} lines</span>
                              <button
                                onClick={() => handleTestRunCode(q, answer.code || '')}
                                className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs active:scale-95"
                                title="Run and test JavaScript code in browser"
                              >
                                <Play size={10} /> Test Run
                              </button>
                            </div>
                          </div>
                          <pre className="text-xs text-emerald-400 font-mono p-3.5 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72">
                            {answer.code || '// No code was submitted by candidate.'}
                          </pre>
                        </div>

                        {/* Code Execution Results Bar if run */}
                        {runOutput && (
                          <div className={`rounded-xl p-3 border text-xs ${
                            runOutput.matchesExpected === true ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                            runOutput.isError ? 'bg-rose-50 border-rose-300 text-rose-900' :
                            'bg-slate-100 border-slate-300 text-slate-800'
                          }`}>
                            <div className="flex items-center justify-between font-bold mb-1">
                              <span className="flex items-center gap-1.5">
                                <Play size={12} /> Execution Output:
                              </span>
                              {runOutput.matchesExpected === true && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickScore(q.id, q.marks)}
                                  className="text-[10px] font-extrabold text-emerald-800 bg-emerald-200/80 hover:bg-emerald-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                >
                                  ✓ Matches Expected! Click to Award Full Marks ({q.marks})
                                </button>
                              )}
                            </div>
                            <pre className="font-mono text-[11px] bg-white/80 p-2 rounded border border-current/20 whitespace-pre-wrap">
                              {runOutput.output}
                            </pre>
                          </div>
                        )}

                        {/* FAST SCORING CONTROL ROW */}
                        <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200/80 flex flex-wrap items-center justify-between gap-3">
                          {/* One-Click Score Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-amber-900 mr-1">One-Click Score:</span>
                            <button
                              type="button"
                              onClick={() => handleQuickScore(q.id, 0)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                currentMarks === 0 ? 'bg-rose-600 text-white shadow-xs' : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              0 pts (0%)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickScore(q.id, Math.round(q.marks / 2))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                currentMarks === Math.round(q.marks / 2) && currentMarks !== 0 && currentMarks !== q.marks 
                                  ? 'bg-amber-600 text-white shadow-xs' 
                                  : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {Math.round(q.marks / 2)} pts (50%)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickScore(q.id, q.marks)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                currentMarks === q.marks ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {q.marks} pts (100% Full)
                            </button>

                            {/* Fine tuning +/- buttons */}
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                type="button"
                                onClick={() => handleAdjustScore(q.id, -1, q.marks)}
                                className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-extrabold text-xs flex items-center justify-center cursor-pointer"
                                title="Subtract 1 mark"
                              >
                                -1
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={q.marks}
                                value={currentMarks}
                                onChange={e => handleQuickScore(q.id, Math.max(0, Math.min(q.marks, Number(e.target.value))))}
                                className="w-14 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-black text-center outline-none focus:ring-2 focus:ring-amber-500/20"
                              />
                              <button
                                type="button"
                                onClick={() => handleAdjustScore(q.id, 1, q.marks)}
                                className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-extrabold text-xs flex items-center justify-center cursor-pointer"
                                title="Add 1 mark"
                              >
                                +1
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-900">Max: {q.marks} marks</span>
                          </div>
                        </div>

                        {/* Quick Feedback Presets */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-500 block">Feedback Snippets:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {FEEDBACK_PRESETS.map((preset, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => handleAppendFeedbackPreset(q.id, preset)}
                                className="text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer text-left"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={feedbackChanges[q.id] !== undefined ? feedbackChanges[q.id] : (answer.feedback || '')}
                            onChange={e => handleSetFeedback(q.id, e.target.value)}
                            placeholder="Enter specific feedback or remarks for this coding solution..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* STICKY BOTTOM SAVE & NEXT ACTION BAR */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 z-20">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Keyboard size={15} className="text-slate-400" />
                <span className="hidden sm:inline">Shortcuts:</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-700">Ctrl + Enter</span> = Save & Next
                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-700">Alt + S</span> = Save
                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-700">Esc</span> = Back
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <label className="hidden md:flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyStudent}
                    onChange={e => setNotifyStudent(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Notify Student on Complete</span>
                </label>

                {/* Save Current Attempt Button */}
                <button
                  type="button"
                  onClick={() => handleSaveGrades(false)}
                  disabled={savingGrade}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  title="Save without advancing (Alt+S)"
                >
                  <Save size={15} />
                  <span>Save Only</span>
                </button>

                {/* Save & Advance to Next Candidate Button */}
                <button
                  type="button"
                  onClick={() => handleSaveGrades(true)}
                  disabled={savingGrade}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-95"
                  title="Save and advance directly to the next student (Ctrl+Enter)"
                >
                  {savingGrade ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FastForward size={16} />
                      <span>Save & Next Candidate (Ctrl+Enter)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ==================================================================== */
          /* SUBMISSIONS LIST VIEW (WITH KPI TABS & BULK EVALUATION)              */
          /* ==================================================================== */
          <>
            {/* KPI METRIC CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 sm:px-6 sm:pt-4 border-b border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeTab === 'all' ? 'bg-white border-indigo-400 shadow-sm ring-2 ring-indigo-500/10' : 'bg-white/80 border-slate-200 hover:bg-white'
                }`}
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Submissions</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('needs_review')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeTab === 'needs_review' 
                    ? 'bg-amber-50 border-amber-400 shadow-sm ring-2 ring-amber-500/20' 
                    : stats.needsReview > 0 
                      ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50' 
                      : 'bg-white/80 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Needs Evaluation</p>
                  {stats.needsReview > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                </div>
                <p className="text-xl font-black text-amber-700 mt-0.5">{stats.needsReview}</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('evaluated')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeTab === 'evaluated' ? 'bg-white border-emerald-400 shadow-sm ring-2 ring-emerald-500/10' : 'bg-white/80 border-slate-200 hover:bg-white'
                }`}
              >
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Fully Evaluated</p>
                <p className="text-xl font-black text-emerald-700 mt-0.5">{stats.evaluated}</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('proctor_flagged')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeTab === 'proctor_flagged' ? 'bg-rose-50 border-rose-400 shadow-sm ring-2 ring-rose-500/20' : 'bg-white/80 border-slate-200 hover:bg-white'
                }`}
              >
                <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Proctor Flagged</p>
                <p className="text-xl font-black text-rose-700 mt-0.5">{stats.flagged}</p>
              </button>

              <div className="p-3 rounded-2xl border border-slate-200 bg-white/80 text-left col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Score / Pass Rate</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black text-slate-900">{stats.avgScore.toFixed(0)}%</span>
                  <span className="text-xs font-bold text-slate-500">({stats.passed}/{stats.total} passed)</span>
                </div>
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="p-3 sm:px-6 border-b border-slate-200 bg-white flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  placeholder="Search student, roll no, branch, email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons & Batch Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                    <span className="text-xs font-black text-indigo-700">{selectedIds.size} selected</span>
                    <button
                      onClick={handleBatchAwardFullMarks}
                      disabled={batchActionLoading}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title="Award full marks for coding questions across all selected"
                    >
                      <Award size={12} /> Auto-Full Marks
                    </button>
                  </div>
                )}

                <button
                  onClick={handleExportCSV}
                  disabled={filteredAttempts.length === 0}
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Export to CSV"
                >
                  <Download size={13} /> Export CSV
                </button>

                <button
                  onClick={handleExportPDF}
                  disabled={filteredAttempts.length === 0}
                  className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Export results to branded PDF"
                >
                  <FileText size={13} /> Export PDFs
                </button>

                <button
                  onClick={fetchAttempts}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                  title="Refresh submissions"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* FILTER TABS */}
            <div className="px-4 sm:px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-1 overflow-x-auto scrollbar-none py-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={12} /> Filter:
              </span>
              {[
                { key: 'all', label: 'All Submissions', count: stats.total },
                { key: 'needs_review', label: 'Needs Evaluation ⏳', count: stats.needsReview, highlight: stats.needsReview > 0 },
                { key: 'evaluated', label: 'Evaluated ✅', count: stats.evaluated },
                { key: 'proctor_flagged', label: 'Proctor Violations 🛑', count: stats.flagged },
                { key: 'passed', label: 'Passed', count: stats.passed },
                { key: 'failed', label: 'Failed', count: stats.failed },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab.key
                      ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-200'
                      : tab.highlight
                        ? 'bg-amber-100/70 text-amber-800 hover:bg-amber-100'
                        : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* SUBMISSIONS LIST */}
            <div className="overflow-y-auto flex-1 scrollbar-none">
              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
                  <span className="text-xs font-bold text-slate-400">Loading submissions...</span>
                </div>
              ) : filteredAttempts.length === 0 ? (
                <div className="py-24 text-center">
                  <Eye size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-lg font-bold text-slate-700">No submissions found</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {activeTab !== 'all' ? 'Try switching filter tabs or adjusting search query.' : 'Student attempts will appear here once submitted.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {/* Select All Row */}
                  <div className="p-2 sm:px-6 bg-slate-50/50 flex items-center justify-between text-xs font-bold text-slate-500">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 cursor-pointer"
                    >
                      {selectedIds.size === filteredAttempts.length && filteredAttempts.length > 0 ? (
                        <CheckSquare size={16} className="text-indigo-600" />
                      ) : (
                        <Square size={16} className="text-slate-400" />
                      )}
                      <span>Select All ({filteredAttempts.length})</span>
                    </button>
                    <span>Showing {filteredAttempts.length} candidate attempts</span>
                  </div>

                  {filteredAttempts.map(attempt => {
                    const isPending = hasPendingReview(attempt);
                    const pendingCount = getPendingQuestionsCount(attempt);
                    const isSelected = selectedIds.has(attempt.id);

                    return (
                      <div
                        key={attempt.id}
                        className={`p-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isPending ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/60'
                        } ${isSelected ? 'bg-indigo-50/40' : ''}`}
                        onClick={() => selectAttempt(attempt)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectId(attempt.id);
                            }}
                            className="text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
                          >
                            {isSelected ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                          </button>

                          {/* Candidate details */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-extrabold text-slate-900 truncate">
                                {attempt.studentName || 'Unknown Student'}
                              </p>
                              {attempt.rollNo && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {attempt.rollNo}
                                </span>
                              )}
                              {isPending ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                  <AlertCircle size={10} /> Needs Review ({pendingCount} Qs)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ Evaluated
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium truncate mt-0.5">
                              <span className="truncate">{attempt.studentEmail || ''}</span>
                              {attempt.branch && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-700 font-semibold">{attempt.branch}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Stats & Quick Actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-left sm:text-right">
                            <p className="text-sm font-black text-slate-900">
                              {attempt.totalScore ?? 0} / {attempt.maxScore ?? 0}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {attempt.percentage != null ? `${attempt.percentage.toFixed(1)}%` : '—'}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              attempt.status === 'violation_submitted'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : attempt.status === 'completed' || attempt.status === 'timed_out'
                                  ? attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                  : attempt.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {attempt.status === 'violation_submitted'
                                ? 'Terminated'
                                : attempt.status === 'completed' || attempt.status === 'timed_out'
                                  ? (attempt.passed ? 'Passed' : 'Failed')
                                  : 'In Progress'}
                            </span>
                            {(attempt.proctorWarnings || 0) > 0 && (
                              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                                <ShieldAlert size={10} /> {attempt.proctorWarnings} strikes
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-400 font-medium shrink-0 hidden lg:block w-28 text-right">
                            {formatDate(attempt.submittedAt)}
                          </div>

                          {/* Quick Fast Grade Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAttempt(attempt);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                              isPending
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700'
                            }`}
                          >
                            <span>{isPending ? 'Fast Grade' : 'View'}</span>
                            <ChevronRight size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(attempt); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="Delete attempt"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-xs">
              <span className="font-bold text-slate-500">
                {stats.needsReview > 0 ? (
                  <span className="text-amber-700 font-extrabold flex items-center gap-1">
                    <AlertCircle size={13} /> {stats.needsReview} submission(s) awaiting grading
                  </span>
                ) : (
                  'All submissions evaluated ✅'
                )}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        )}

        {/* ==================================================================== */}
        {/* DELETE ATTEMPT CONFIRMATION MODAL                                    */}
        {/* ==================================================================== */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center z-[1200]">
            <div
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 p-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">Delete Attempt?</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-2">
                This will permanently delete the test attempt by:
              </p>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4 text-left">
                <p className="text-sm font-bold text-slate-800">{deleteTarget.studentName || 'Unknown Student'}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  {deleteTarget.rollNo && <span className="font-mono font-bold text-indigo-600">{deleteTarget.rollNo}</span>}
                  {deleteTarget.branch && <><span>•</span><span>{deleteTarget.branch}</span></>}
                  {deleteTarget.studentEmail && <><span>•</span><span className="truncate">{deleteTarget.studentEmail}</span></>}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span className="font-bold text-slate-700">Score: {deleteTarget.totalScore ?? 0}/{deleteTarget.maxScore ?? 0}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    deleteTarget.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {deleteTarget.passed ? 'Passed' : 'Failed'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200 mb-5 font-semibold">
                ⚠️ The student will be able to reattempt this test after deletion.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAttempt}
                  disabled={deleting}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
                >
                  {deleting ? 'Deleting...' : 'Delete Attempt'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
