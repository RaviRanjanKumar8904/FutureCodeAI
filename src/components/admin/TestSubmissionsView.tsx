import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { X, Search, Download, Eye, CheckCircle2, AlertCircle, Save, FileText, ShieldAlert, ShieldCheck, AlertOctagon } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportCSV } from '../../utils/csv';
import { generateTestResultPDF } from '../../utils/generateTestResultPDF';
import { sendNotification } from '../../utils/notificationService';

interface TestSubmissionsViewProps {
  isOpen: boolean;
  onClose: () => void;
  test: any;
}

export default function TestSubmissionsView({ isOpen, onClose, test }: TestSubmissionsViewProps) {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [gradingChanges, setGradingChanges] = useState<Record<string, number>>({});
  const [savingGrade, setSavingGrade] = useState(false);

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

  const filteredAttempts = attempts.filter(a => {
    const term = searchTerm.toLowerCase();
    return (a.studentName || '').toLowerCase().includes(term) ||
      (a.studentEmail || '').toLowerCase().includes(term) ||
      (a.rollNo || '').toLowerCase().includes(term) ||
      (a.branch || '').toLowerCase().includes(term);
  });

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleExportCSV = () => {
    const csvData = filteredAttempts.map((a: any) => ({
      'Student Name': a.studentName || '',
      'Roll / Reg No': a.rollNo || 'N/A',
      'Branch': a.branch || 'N/A',
      'Email': a.studentEmail || '',
      'Score': a.totalScore ?? 0,
      'Max Score': a.maxScore ?? 0,
      'Percentage': a.percentage != null ? `${a.percentage.toFixed(1)}%` : '—',
      'Status': a.status || '',
      'Passed': a.passed ? 'Yes' : 'No',
      'Proctor Warnings': a.proctorWarnings ?? 0,
      'Proctor Status': a.status === 'violation_submitted' ? 'Terminated (3 Strikes)' : ((a.proctorWarnings || 0) > 0 ? `${a.proctorWarnings} Warning(s)` : 'Clean'),
      'Attempt #': a.attemptNumber || 1,
      'Submitted': formatDate(a.submittedAt),
    }));
    exportCSV(`${test.title}_submissions`, csvData);
  };

  const handleExportPDF = async () => {
    if (filteredAttempts.length === 0) { toast.error('No submissions to export'); return; }
    toast('Generating PDFs...', { icon: '📄' });
    for (const attempt of filteredAttempts) {
      try {
        generateTestResultPDF(test, attempt, questions);
        // Small delay between downloads to avoid browser blocking
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error('Error generating PDF for', attempt.studentName, err);
      }
    }
    toast.success(`${filteredAttempts.length} PDF(s) generated!`);
  };

  const handleGradeChange = (questionId: string, newMarks: number) => {
    setGradingChanges(prev => ({ ...prev, [questionId]: newMarks }));
  };

  const handleSaveGrades = async () => {
    if (!selectedAttempt || Object.keys(gradingChanges).length === 0) return;
    setSavingGrade(true);
    try {
      const updatedAnswers = { ...selectedAttempt.answers };
      let newCodingScore = selectedAttempt.codingScore || 0;

      for (const [qId, newMarks] of Object.entries(gradingChanges)) {
        const oldMarks = updatedAnswers[qId]?.marksAwarded || 0;
        newCodingScore += newMarks - oldMarks;
        updatedAnswers[qId] = {
          ...updatedAnswers[qId],
          marksAwarded: newMarks,
          reviewStatus: 'reviewed',
        };
      }

      const stillPending = Object.values(updatedAnswers).some((a: any) => a.reviewStatus === 'pending_review');
      const newTotal = (selectedAttempt.mcqScore || 0) + newCodingScore;
      const maxScore = selectedAttempt.maxScore || 1;
      const newPercentage = (newTotal / maxScore) * 100;
      const passed = newPercentage >= (test.passPercentage || 0);

      await updateDoc(doc(db, 'testAttempts', selectedAttempt.id), {
        answers: updatedAnswers,
        codingScore: newCodingScore,
        totalScore: newTotal,
        percentage: newPercentage,
        passed,
        evaluationStatus: stillPending ? 'pending' : 'completed',
        evaluatedAt: serverTimestamp(),
      });

      if (!stillPending) {
        toast.success('All questions evaluated! The final result is now visible to the student.');
        if (selectedAttempt.studentEmail) {
          await sendNotification({
            userId: selectedAttempt.studentId || '',
            userEmail: selectedAttempt.studentEmail,
            title: 'Test Evaluation Complete',
            message: `Your test "${test.title}" has been evaluated. Your final score is ${newTotal}/${maxScore} (${newPercentage.toFixed(1)}%).`,
            type: 'test',
            link: `/dashboard/student/tests/${test.id}/result/${selectedAttempt.id}`,
          });
        }
      } else {
        toast.success('Grades saved. Some questions are still pending review.');
      }
      setGradingChanges({});

      // Refresh
      setSelectedAttempt({
        ...selectedAttempt,
        answers: updatedAnswers,
        codingScore: newCodingScore,
        totalScore: newTotal,
        percentage: newPercentage,
        passed,
      });
      fetchAttempts();
    } catch (error) {
      console.error("Error saving grades:", error);
      toast.error("Failed to save grades");
    } finally {
      setSavingGrade(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center overflow-y-auto z-[1100]">
      <div
        className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[92dvh] border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {selectedAttempt ? 'Attempt Detail' : `Submissions — ${test?.title}`}
            </h2>
            <p className="text-slate-500 font-medium text-xs">
              {selectedAttempt
                ? `${selectedAttempt.studentName} · Attempt #${selectedAttempt.attemptNumber || 1}`
                : `${attempts.length} total submission${attempts.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedAttempt && (
              <button
                onClick={() => { setSelectedAttempt(null); setGradingChanges({}); }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ← Back
              </button>
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

        {selectedAttempt ? (
          /* Detail View */
          <div className="overflow-y-auto flex-1 scrollbar-none p-4 sm:p-6 space-y-4">
            {/* Candidate Info Bar */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  {(selectedAttempt.studentName || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{selectedAttempt.studentName || 'Unknown'}</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedAttempt.studentEmail || ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Roll / Reg No</span>
                  <span className="font-mono font-extrabold text-indigo-600">{selectedAttempt.rollNo || 'N/A'}</span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Branch / Stream</span>
                  <span className="font-bold text-slate-800">{selectedAttempt.branch || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Score</p>
                <p className="text-lg font-extrabold text-slate-900">{selectedAttempt.totalScore ?? 0} / {selectedAttempt.maxScore ?? 0}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Percentage</p>
                <p className="text-lg font-extrabold text-slate-900">{selectedAttempt.percentage?.toFixed(1) ?? 0}%</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                <p className={`text-lg font-extrabold ${selectedAttempt.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedAttempt.passed ? 'PASSED' : 'FAILED'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted</p>
                <p className="text-sm font-bold text-slate-700">{formatDate(selectedAttempt.submittedAt)}</p>
              </div>
            </div>

            {/* AutoProctor Audit Log Card */}
            <div className={`rounded-2xl p-4 sm:p-5 border-2 ${
              selectedAttempt.status === 'violation_submitted'
                ? 'bg-rose-50/70 border-rose-300'
                : (selectedAttempt.proctorWarnings || 0) > 0
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-emerald-50/50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    selectedAttempt.status === 'violation_submitted'
                      ? 'bg-rose-100 text-rose-700'
                      : (selectedAttempt.proctorWarnings || 0) > 0
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {selectedAttempt.status === 'violation_submitted' ? (
                      <AlertOctagon size={16} />
                    ) : (selectedAttempt.proctorWarnings || 0) > 0 ? (
                      <ShieldAlert size={16} />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">AutoProctor Audit Log</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Anti-cheating monitoring & full-screen violation tracking</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    selectedAttempt.status === 'violation_submitted'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : (selectedAttempt.proctorWarnings || 0) > 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {selectedAttempt.status === 'violation_submitted'
                      ? '🛑 Terminated (3 Strikes)'
                      : `Warnings: ${selectedAttempt.proctorWarnings || 0} / 3`
                    }
                  </span>
                </div>
              </div>

              {selectedAttempt.proctorViolations && selectedAttempt.proctorViolations.length > 0 ? (
                <div className="space-y-1.5 mt-2 bg-white/80 rounded-xl p-3 border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Violation Log:</p>
                  {selectedAttempt.proctorViolations.map((v: any, vIdx: number) => (
                    <div key={vIdx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-none">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center">
                          {v.warningNumber || vIdx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{v.detail || v.type}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">{v.timestamp}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-medium text-emerald-800 bg-white/70 rounded-xl p-2.5 border border-emerald-200">
                  ✅ No tab-switching, minimization, or full-screen violations recorded during this test attempt.
                </p>
              )}
            </div>

            {/* Question-by-Question */}
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const answer = selectedAttempt.answers?.[q.id];
                if (!answer) return null;
                return (
                  <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-extrabold text-slate-500">Q{idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${q.type === 'mcq' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'
                        }`}>{q.type}</span>
                      <span className="text-[10px] font-bold text-slate-400">{q.marks} marks</span>
                      {answer.reviewStatus === 'pending_review' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700">Pending Review</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mb-2">
                      {q.type === 'mcq' ? q.questionText : q.problemStatement}
                    </p>

                    {q.type === 'mcq' ? (
                      <div className="space-y-1">
                        {(q.options as string[]).map((opt: string, i: number) => {
                          const isSelected = (answer.selectedOptions || []).includes(i);
                          const isCorrect = (q.correctAnswers || []).includes(i);
                          return (
                            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${isCorrect && isSelected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                isCorrect ? 'bg-emerald-50/50 text-emerald-600 border border-emerald-100' :
                                  isSelected ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                    'bg-slate-50 text-slate-500 border border-slate-100'
                              }`}>
                              <span className="font-extrabold">{String.fromCharCode(65 + i)}.</span>
                              <span>{opt}</span>
                              {isCorrect && <CheckCircle2 size={12} className="ml-auto text-emerald-500" />}
                              {isSelected && !isCorrect && <AlertCircle size={12} className="ml-auto text-rose-500" />}
                            </div>
                          );
                        })}
                        <p className={`text-xs font-bold mt-1 ${answer.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {answer.isCorrect ? '✓ Correct' : '✗ Incorrect'} — {answer.marksAwarded}/{q.marks} marks
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-slate-900 rounded-xl p-3 overflow-x-auto">
                          <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">{answer.code || '(No code submitted)'}</pre>
                        </div>
                        {answer.language && (
                          <p className="text-[10px] font-bold text-slate-400">Language: {answer.language}</p>
                        )}
                        {/* Manual Grading Input */}
                        <div className="flex items-center gap-3 bg-amber-50/70 p-3 rounded-xl border border-amber-100 flex-wrap">
                          <label className="text-xs font-bold text-amber-900 whitespace-nowrap">Award Marks:</label>
                          <input
                            type="number"
                            min={0}
                            max={q.marks}
                            value={gradingChanges[q.id] ?? answer.marksAwarded ?? 0}
                            onChange={e => handleGradeChange(q.id, Number(e.target.value))}
                            className="w-20 bg-white border border-amber-200 rounded-lg px-2 py-1.5 text-base sm:text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                          <span className="text-xs text-amber-700 font-medium">/ {q.marks}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${answer.reviewStatus === 'reviewed' ? 'bg-emerald-100 text-emerald-700' :
                              answer.reviewStatus === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-500'
                            }`}>
                            {answer.reviewStatus === 'reviewed' ? 'Reviewed' : answer.reviewStatus === 'pending_review' ? 'Pending' : 'Auto'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save Grade Button */}
            {Object.keys(gradingChanges).length > 0 && (
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md py-3 flex justify-end">
                <button
                  onClick={handleSaveGrades}
                  disabled={savingGrade}
                  className="bg-amber-500 text-white px-6 min-h-[44px] rounded-xl font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer active:scale-95 text-xs sm:text-sm"
                >
                  {savingGrade ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Save size={16} /> Save Grades</>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Submissions List View */
          <>
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, roll no, branch, email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportCSV}
                  disabled={filteredAttempts.length === 0}
                  className="px-3 min-h-[44px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={filteredAttempts.length === 0}
                  className="px-3 min-h-[44px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FileText size={14} /> Export PDFs
                </button>
                <div className="text-xs font-bold text-slate-500 px-2.5 py-1.5 bg-slate-200/60 rounded-lg">
                  {filteredAttempts.length} submissions
                </div>
              </div>
            </div>

            {/* Submissions Table / Cards */}
            <div className="overflow-y-auto flex-1 scrollbar-none">
              {loading ? (
                <div className="py-24 flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
                </div>
              ) : filteredAttempts.length === 0 ? (
                <div className="py-24 text-center">
                  <Eye size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-lg font-bold text-slate-700">No submissions yet</p>
                  <p className="text-sm text-slate-400 mt-1">Student attempts will appear here once they start the test.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAttempts.map(attempt => (
                    <div
                      key={attempt.id}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedAttempt(attempt)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 truncate">{attempt.studentName || 'Unknown'}</p>
                          {attempt.rollNo && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {attempt.rollNo}
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

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-extrabold text-slate-900">
                            {attempt.totalScore ?? 0} / {attempt.maxScore ?? 0}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {attempt.percentage?.toFixed(1) ?? 0}%
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            attempt.status === 'violation_submitted'
                              ? 'bg-rose-600 text-white'
                              : attempt.status === 'completed'
                                ? attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                : attempt.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {attempt.status === 'violation_submitted'
                              ? 'Auto-Submitted'
                              : attempt.status === 'completed'
                                ? (attempt.passed ? 'Passed' : 'Failed')
                                : attempt.status === 'in_progress' ? 'In Progress' : attempt.status || 'Unknown'}
                          </span>
                          {(attempt.proctorWarnings || 0) > 0 && (
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <ShieldAlert size={10} /> {attempt.proctorWarnings}/3 warnings
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-medium shrink-0 hidden md:block w-28 text-right">
                          {formatDate(attempt.submittedAt)}
                        </div>
                        <Eye size={18} className="text-slate-400 hover:text-indigo-600 shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        {!selectedAttempt && (
          <div className="p-3 sm:p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-xs sm:text-sm cursor-pointer flex items-center justify-center"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
