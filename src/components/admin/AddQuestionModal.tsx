import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { X, ListChecks, Code2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  testId: string;
  testTotalMarks: number;
  testQuestionsCount: number;
  questionType: 'mcq' | 'coding';
  initialData?: any;
  nextOrder: number;
}

export default function AddQuestionModal({
  isOpen, onClose, onSuccess, testId, testTotalMarks, testQuestionsCount,
  questionType, initialData, nextOrder
}: AddQuestionModalProps) {
  const [loading, setLoading] = useState(false);

  // MCQ state
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([]);
  const [marks, setMarks] = useState(1);

  // Coding state
  const [problemStatement, setProblemStatement] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [language, setLanguage] = useState('javascript');

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setMarks(initialData.marks || 1);
      if (initialData.type === 'mcq') {
        setQuestionText(initialData.questionText || '');
        setOptions(initialData.options || ['', '', '', '']);
        setCorrectAnswers(initialData.correctAnswers || []);
      } else {
        setProblemStatement(initialData.problemStatement || '');
        setSampleInput(initialData.sampleInput || '');
        setSampleOutput(initialData.sampleOutput || '');
        setExpectedOutput(initialData.expectedOutput || '');
        setLanguage(initialData.language || 'javascript');
      }
    } else {
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectAnswers([]);
      setMarks(1);
      setProblemStatement('');
      setSampleInput('');
      setSampleOutput('');
      setExpectedOutput('');
      setLanguage('javascript');
    }
  }, [isOpen, initialData]);

  const addOption = () => setOptions([...options, '']);
  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== idx);
    const newCorrect = correctAnswers
      .filter(a => a !== idx)
      .map(a => a > idx ? a - 1 : a);
    setOptions(newOptions);
    setCorrectAnswers(newCorrect);
  };

  const toggleCorrect = (idx: number) => {
    setCorrectAnswers(prev => 
      prev.includes(idx) 
        ? prev.filter(a => a !== idx) 
        : [...prev, idx]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (questionType === 'mcq') {
      if (!questionText.trim()) { toast.error('Question text is required'); return; }
      if (options.some(o => !o.trim())) { toast.error('All options must be filled'); return; }
      if (correctAnswers.length === 0) { toast.error('Select at least one correct answer'); return; }
    } else {
      if (!problemStatement.trim()) { toast.error('Problem statement is required'); return; }
    }

    setLoading(true);
    try {
      const questionData: any = {
        type: questionType,
        marks: Number(marks),
        order: initialData?.order ?? nextOrder,
      };

      if (questionType === 'mcq') {
        questionData.questionText = questionText.trim();
        questionData.options = options.map(o => o.trim());
        questionData.correctAnswers = correctAnswers;
      } else {
        questionData.problemStatement = problemStatement.trim();
        questionData.sampleInput = sampleInput;
        questionData.sampleOutput = sampleOutput;
        questionData.expectedOutput = expectedOutput;
        questionData.language = language;
      }

      if (initialData?.id) {
        await updateDoc(doc(db, 'tests', testId, 'questions', initialData.id), questionData);
        // Recalculate test totals (marks diff)
        const marksDiff = Number(marks) - (initialData.marks || 0);
        if (marksDiff !== 0) {
          await updateDoc(doc(db, 'tests', testId), {
            totalMarks: testTotalMarks + marksDiff,
            updatedAt: serverTimestamp(),
          });
        }
        toast.success('Question updated!');
      } else {
        await addDoc(collection(db, 'tests', testId, 'questions'), questionData);
        await updateDoc(doc(db, 'tests', testId), {
          totalMarks: testTotalMarks + Number(marks),
          questionsCount: testQuestionsCount + 1,
          updatedAt: serverTimestamp(),
        });
        toast.success('Question added!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error('Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center overflow-y-auto z-[1200]">
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[92dvh] border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              questionType === 'mcq' ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-600'
            }`}>
              {questionType === 'mcq' ? <ListChecks size={18} /> : <Code2 size={18} />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {initialData ? 'Edit' : 'Add'} {questionType === 'mcq' ? 'MCQ' : 'Coding'} Question
              </h2>
              <p className="text-slate-500 font-medium text-xs">
                {questionType === 'mcq' ? 'Multiple choice question with options' : 'Programming problem with test cases'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-90"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-none text-xs sm:text-sm">
          <form id="questionForm" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Marks */}
            <div className="w-32">
              <label className="block font-bold text-slate-700 mb-1">Marks <span className="text-rose-500">*</span></label>
              <input 
                type="number" 
                required min={1}
                value={marks}
                onChange={e => setMarks(Number(e.target.value))}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base"
              />
            </div>

            {questionType === 'mcq' ? (
              <>
                {/* Question Text */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Question Text <span className="text-rose-500">*</span></label>
                  <textarea 
                    required rows={3}
                    value={questionText}
                    onChange={e => setQuestionText(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium resize-none text-xs sm:text-base"
                    placeholder="Enter the question..."
                  />
                </div>

                {/* Options */}
                <div>
                  <label className="block font-bold text-slate-700 mb-2">Options <span className="text-rose-500">*</span></label>
                  <div className="space-y-2">
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCorrect(idx)}
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer text-xs font-extrabold ${
                            correctAnswers.includes(idx)
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 text-slate-400 hover:border-emerald-400'
                          }`}
                          title={correctAnswers.includes(idx) ? 'Marked as correct' : 'Mark as correct answer'}
                        >
                          {String.fromCharCode(65 + idx)}
                        </button>
                        <input 
                          type="text"
                          value={opt}
                          onChange={e => {
                            const newOpts = [...options];
                            newOpts[idx] = e.target.value;
                            setOptions(newOpts);
                          }}
                          className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base"
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        />
                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add Option
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                    Click the letter button to mark correct answer(s). Green = correct.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Problem Statement */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Problem Statement <span className="text-rose-500">*</span></label>
                  <textarea 
                    required rows={5}
                    value={problemStatement}
                    onChange={e => setProblemStatement(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium resize-none text-xs sm:text-base"
                    placeholder="Describe the programming problem..."
                  />
                </div>

                {/* Language */}
                <div className="w-48">
                  <label className="block font-bold text-slate-700 mb-1">Suggested Language</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base bg-white"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="c">C</option>
                    <option value="typescript">TypeScript</option>
                    <option value="any">Any Language</option>
                  </select>
                </div>

                {/* Sample I/O */}
                <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-100 space-y-3">
                  <h3 className="text-teal-900 font-bold text-xs sm:text-sm">Sample Input / Output</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-teal-900/70 mb-1">Sample Input</label>
                      <textarea
                        rows={3}
                        value={sampleInput}
                        onChange={e => setSampleInput(e.target.value)}
                        className="w-full bg-white border border-teal-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono text-xs resize-none"
                        placeholder="e.g. [1, 2, 3]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-teal-900/70 mb-1">Sample Output</label>
                      <textarea
                        rows={3}
                        value={sampleOutput}
                        onChange={e => setSampleOutput(e.target.value)}
                        className="w-full bg-white border border-teal-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono text-xs resize-none"
                        placeholder="e.g. 6"
                      />
                    </div>
                  </div>
                </div>

                {/* Expected Output for Auto-Check */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Output (Auto-Check)</label>
                  <textarea
                    rows={2}
                    value={expectedOutput}
                    onChange={e => setExpectedOutput(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-xs resize-none"
                    placeholder="Leave empty for manual review by admin"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    If set, student code output will be auto-checked against this string. Leave empty for manual grading.
                  </p>
                </div>
              </>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-xs sm:text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button 
            form="questionForm"
            type="submit"
            disabled={loading}
            className={`text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-70 text-xs sm:text-sm cursor-pointer active:scale-95 ${
              questionType === 'mcq' 
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' 
                : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              initialData ? 'Save Changes' : 'Add Question'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export { AddQuestionModal };
