import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config';
import { collection, doc, updateDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { X, Plus, Trash2, Edit2, Code2, ListChecks, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import AddQuestionModal from './AddQuestionModal.tsx';

interface ManageQuestionsProps {
  isOpen: boolean;
  onClose: () => void;
  test: any;
  onQuestionsUpdated: () => void;
}

export default function ManageQuestions({ isOpen, onClose, test, onQuestionsUpdated }: ManageQuestionsProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [questionType, setQuestionType] = useState<'mcq' | 'coding'>('mcq');

  const fetchQuestions = useCallback(async () => {
    if (!test?.id) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'tests', test.id, 'questions'), orderBy('order'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setQuestions(data);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [test?.id]);

  useEffect(() => {
    if (isOpen && test?.id) {
      fetchQuestions();
    }
  }, [isOpen, test?.id, fetchQuestions]);

  const handleDelete = async (questionId: string) => {
    if (!test?.id) return;
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await deleteDoc(doc(db, 'tests', test.id, 'questions', questionId));
      
      // Update test totalMarks and questionsCount
      const deletedQ = questions.find(q => q.id === questionId);
      const newTotal = (test.totalMarks || 0) - (deletedQ?.marks || 0);
      const newCount = (test.questionsCount || 0) - 1;
      await updateDoc(doc(db, 'tests', test.id), {
        totalMarks: Math.max(0, newTotal),
        questionsCount: Math.max(0, newCount),
        updatedAt: serverTimestamp(),
      });

      toast.success('Question deleted');
      fetchQuestions();
      onQuestionsUpdated?.();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    if (!test?.id) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= questions.length) return;

    try {
      const batch = writeBatch(db);
      const q1 = questions[index];
      const q2 = questions[swapIndex];
      
      batch.update(doc(db, 'tests', test.id, 'questions', q1.id), { order: q2.order ?? swapIndex });
      batch.update(doc(db, 'tests', test.id, 'questions', q2.id), { order: q1.order ?? index });
      await batch.commit();
      
      fetchQuestions();
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Failed to reorder questions");
    }
  };

  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center overflow-y-auto z-[1100]">
        <div 
          className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[92dvh] border border-gray-100"
          role="dialog"
          aria-modal="true"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Questions — {test?.title || 'Test'}
              </h2>
              <p className="text-slate-500 font-medium text-xs">
                {questions.length} questions {" · "} {totalMarks} total marks
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-90"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Add Question Buttons */}
          <div className="p-4 sm:px-6 border-b border-gray-100 bg-slate-50/70 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingQuestion(null);
                setQuestionType('mcq');
                setQuestionModalOpen(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <ListChecks size={14} />
              Add MCQ
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingQuestion(null);
                setQuestionType('coding');
                setQuestionModalOpen(true);
              }}
              className="bg-teal-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <Code2 size={14} />
              Add Coding
            </button>
          </div>

          {/* Questions List */}
          <div className="overflow-y-auto flex-1 scrollbar-none">
            {loading ? (
              <div className="py-24 flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
              </div>
            ) : questions.length === 0 ? (
              <div className="py-24 text-center">
                <ListChecks size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-lg font-bold text-slate-700">No questions yet</p>
                <p className="text-sm text-slate-400 mt-1">Add MCQ or coding questions to this test.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 sm:px-6 flex items-start gap-3 hover:bg-slate-50/50 transition-colors group">
                    {/* Order Controls */}
                    <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReorder(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <span className="text-[10px] font-extrabold text-slate-400 w-5 text-center">{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleReorder(idx, 'down')}
                        disabled={idx === questions.length - 1}
                        className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    {/* Question Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          q.type === 'mcq' 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : 'bg-teal-50 text-teal-700'
                        }`}>
                          {q.type === 'mcq' ? 'MCQ' : 'Coding'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                        {q.type === 'mcq' ? q.questionText : q.problemStatement}
                      </p>
                      {q.type === 'mcq' && q.options && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {(q.options as string[]).map((opt: string, i: number) => (
                            <span 
                              key={i}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                                (q.correctAnswers || []).includes(i)
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}
                            >
                              {String.fromCharCode(65 + i)}. {opt.length > 30 ? opt.slice(0, 30) + '...' : opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestion(q);
                          setQuestionType(q.type);
                          setQuestionModalOpen(true);
                        }}
                        className="p-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title="Edit Question"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(q.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="text-xs font-bold text-slate-500">
              {questions.length} question{questions.length !== 1 ? 's' : ''} {" · "} {totalMarks} marks total
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-xs sm:text-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Question Modal */}
      <AddQuestionModal
        isOpen={questionModalOpen}
        onClose={() => {
          setQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
        onSuccess={() => {
          fetchQuestions();
          onQuestionsUpdated?.();
        }}
        testId={test?.id || ''}
        testTotalMarks={totalMarks}
        testQuestionsCount={questions.length}
        questionType={questionType}
        initialData={editingQuestion}
        nextOrder={questions.length + 1}
      />
    </>
  );
}
