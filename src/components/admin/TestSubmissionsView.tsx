import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { X, Search, Download, Eye, CheckCircle2, AlertCircle, Save, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportCSV } from '../../utils/csv';
import { generateTestResultPDF } from '../../utils/generateTestResultPDF';

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
           (a.studentEmail || '').toLowerCase().includes(term);
  });

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleExportCSV = () => {
    const csvData = filteredAttempts.map((a: any) => ({
      'Student Name': a.studentName || '',
      'Email': a.studentEmail || '',
      'Score': a.totalScore ?? 0,
      'Max Score': a.maxScore ?? 0,
      'Percentage': a.percentage != null ? `${a.percentage.toFixed(1)}%` : '—',
      'Status': a.status || '',
      'Passed': a.passed ? 'Yes' : 'No',
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
      });

      toast.success('Grades saved successfully!');
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

            {/* Question-by-Question */}
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const answer = selectedAttempt.answers?.[q.id];
                if (!answer) return null;
                return (
                  <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-extrabold text-slate-500">Q{idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        q.type === 'mcq' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'
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
                            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                              isCorrect && isSelected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
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
                        <div className="flex items-center gap-3 bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                          <label className="text-xs font-bold text-amber-900 whitespace-nowrap">Award Marks:</label>
                          <input
                            type="number"
                            min={0}
                            max={q.marks}
                            value={gradingChanges[q.id] ?? answer.marksAwarded ?? 0}
                            onChange={e => handleGradeChange(q.id, Number(e.target.value))}
                            className="w-20 bg-white border border-amber-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                          <span className="text-xs text-amber-700 font-medium">/ {q.marks}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            answer.reviewStatus === 'reviewed' ? 'bg-emerald-100 text-emerald-700' :
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
                  className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 disabled:opacity-70 cursor-pointer active:scale-95"
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
                  placeholder="Search by student name or email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  disabled={filteredAttempts.length === 0}
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={filteredAttempts.length === 0}
                  className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FileText size={14} /> Export PDFs
                </button>
                <div className="text-xs font-bold text-slate-500 px-2.5 py-1.5 bg-slate-200/60 rounded-lg">
                  {filteredAttempts.length} submissions
                </div>
              </div>
            </div>

            {/* Submissions Table */}
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
                      className="p-4 sm:px-6 flex items-center gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedAttempt(attempt)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{attempt.studentName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500 font-medium truncate">{attempt.studentEmail || ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-slate-900">
                          {attempt.totalScore ?? 0} / {attempt.maxScore ?? 0}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {attempt.percentage?.toFixed(1) ?? 0}%
                        </p>
                      </div>
                      <div className="shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          attempt.status === 'completed' 
                            ? attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            : attempt.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {attempt.status === 'completed' ? (attempt.passed ? 'Passed' : 'Failed') : 
                           attempt.status === 'in_progress' ? 'In Progress' : attempt.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-medium shrink-0 hidden sm:block w-20 text-right">
                        Attempt #{attempt.attemptNumber || 1}
                      </div>
                      <div className="text-xs text-slate-400 font-medium shrink-0 hidden md:block w-28 text-right">
                        {formatDate(attempt.submittedAt)}
                      </div>
                      <Eye size={16} className="text-slate-300 shrink-0" />
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
              className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-xs sm:text-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
