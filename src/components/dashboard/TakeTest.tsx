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
  ListChecks, Flag, CheckCircle2, ClipboardCheck, Target,
  User, GraduationCap, Hash, Shield, ShieldAlert, Maximize2, AlertOctagon
} from 'lucide-react';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// AutoProctor & Fullscreen Utility Functions
// ---------------------------------------------------------------------------

// Detect if the device supports the Fullscreen API at all.
// iOS Safari does NOT support it; many mobile browsers have partial/no support.
const isFullscreenSupported = (): boolean => {
  const elem = document.documentElement as any;
  return !!(
    elem.requestFullscreen ||
    elem.webkitRequestFullscreen ||
    elem.mozRequestFullScreen ||
    elem.msRequestFullscreen
  );
};

// Detect mobile devices via user-agent + touch heuristics
const isMobileDevice = (): boolean => {
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 1;
  const isSmallScreen = window.innerWidth <= 1024;
  return isMobileUA || (hasTouch && isSmallScreen);
};

const isFullscreenActive = () => {
  // On mobile devices where fullscreen API is not supported,
  // treat the device as always "fullscreen" (the phone screen IS full screen).
  if (!isFullscreenSupported() && isMobileDevice()) {
    return true;
  }
  const doc = document as any;
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
};

const requestFullscreen = async () => {
  // If fullscreen API is not supported (e.g. iOS Safari), skip gracefully.
  // The test will still start — we just can't enforce native fullscreen.
  if (!isFullscreenSupported()) {
    console.info('Fullscreen API not supported on this device — skipping fullscreen request.');
    return true; // Return true so the caller doesn't treat this as a failure
  }
  const elem = document.documentElement as any;
  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      await elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen();
    }
    return true;
  } catch (err) {
    console.warn("Fullscreen request error:", err);
    return false;
  }
};

const exitFullscreen = async () => {
  if (!isFullscreenSupported()) return; // Nothing to exit on unsupported devices
  const doc = document as any;
  try {
    if (isFullscreenActive()) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    }
  } catch {
    // Non-critical
  }
};

const playWarningBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio might be blocked if browser policy prevents it, non-critical
  }
};

export default function TakeTest() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Candidate details
  const [candidateName, setCandidateName] = useState(() =>
    localStorage.getItem('fc_candidate_name') || ''
  );
  const [candidateBranch, setCandidateBranch] = useState(() =>
    localStorage.getItem('fc_candidate_branch') || ''
  );
  const [candidateRollNo, setCandidateRollNo] = useState(() =>
    localStorage.getItem('fc_candidate_rollNo') || ''
  );
  const [detailsErrors, setDetailsErrors] = useState<{ name?: string; branch?: string; rollNo?: string }>({});

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

  // AutoProctor state
  // On mobile devices without fullscreen API support, start as "true"
  // so the blocking overlay never appears on those devices.
  const [isFullscreen, setIsFullscreen] = useState(() => !isFullscreenSupported() && isMobileDevice());
  const [proctorWarnings, setProctorWarnings] = useState(0);
  const [, setProctorViolations] = useState<any[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningModalData, setWarningModalData] = useState<{
    title: string;
    message: string;
    count: number;
    isTerminated: boolean;
  }>({
    title: '',
    message: '',
    count: 0,
    isTerminated: false,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleSubmitRef = useRef<(isAutoSubmit?: boolean, reason?: 'manual' | 'time_expired' | 'proctor_violation') => Promise<void>>(async () => { });
  const proctorWarningsRef = useRef(0);
  const proctorViolationsRef = useRef<any[]>([]);
  const lastViolationTimeRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const recordViolationRef = useRef<(type: 'tab_switch' | 'window_blur' | 'fullscreen_exit', detail: string) => void>(() => { });

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
      const hasPendingReview = Object.values(gradedAnswers).some((a: any) => a.reviewStatus === 'pending_review');

      await updateDoc(doc(db, 'testAttempts', aId), {
        answers: gradedAnswers,
        mcqScore, codingScore, totalScore, maxScore, percentage, passed,
        status: 'timed_out',
        submissionReason: 'time_expired',
        evaluationStatus: hasPendingReview ? 'pending' : 'completed',
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

        // Check existing attempts & prefill candidate details
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const uData = userDoc.data();
              setCandidateName(prev => prev || uData.displayName || uData.name || user.displayName || '');
              setCandidateBranch(prev => prev || uData.degree || uData.branch || uData.educationDetails || '');
              setCandidateRollNo(prev => prev || uData.rollNo || uData.rollNumber || uData.studentId || '');
            } else if (user.displayName) {
              setCandidateName(prev => prev || user.displayName || '');
            }
          } catch {
            if (user.displayName) {
              setCandidateName(prev => prev || user.displayName || '');
            }
          }

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
            if (inProgress.studentName) setCandidateName(inProgress.studentName);
            if (inProgress.branch) setCandidateBranch(inProgress.branch);
            if (inProgress.rollNo) setCandidateRollNo(inProgress.rollNo);

            // Restore previous proctor warnings if resuming
            if (inProgress.proctorWarnings) {
              setProctorWarnings(inProgress.proctorWarnings);
              proctorWarningsRef.current = inProgress.proctorWarnings;
            }
            if (inProgress.proctorViolations) {
              setProctorViolations(inProgress.proctorViolations);
              proctorViolationsRef.current = inProgress.proctorViolations;
            }

            // Calculate remaining time
            const startedAt = inProgress.startedAt?.toDate?.() || new Date();
            const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
            const remaining = Math.max(0, (testData as any).durationMinutes * 60 - elapsed);
            setTimeLeft(remaining);

            if (remaining <= 0) {
              // Time expired while away — auto-submit
              await handleAutoSubmit(inProgress.id, inProgress.answers || {}, qData, testData);
            }
            // Do NOT automatically call setStarted(true) here; wait for student to click "Resume Test in Full Screen"
            // so that full screen request is triggered cleanly from user gesture.
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
          handleSubmitRef.current(true, 'time_expired');
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

  // ---------------------------------------------------------------------------
  // AutoProctor: Anti-Cheat Violation Recorder
  // ---------------------------------------------------------------------------
  const recordViolation = (type: 'tab_switch' | 'window_blur' | 'fullscreen_exit', detail: string) => {
    if (!started || submitted || isSubmittingRef.current) return;

    const now = Date.now();
    // 2000ms cooldown to deduplicate simultaneous blur + visibilitychange + fullscreen events
    if (now - lastViolationTimeRef.current < 2000) {
      return;
    }
    lastViolationTimeRef.current = now;

    const newCount = proctorWarningsRef.current + 1;
    proctorWarningsRef.current = newCount;
    setProctorWarnings(newCount);

    playWarningBeep();

    const violationEntry = {
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      detail,
      warningNumber: newCount,
    };
    const updatedViolations = [...proctorViolationsRef.current, violationEntry];
    proctorViolationsRef.current = updatedViolations;
    setProctorViolations(updatedViolations);

    // Persist proctor warning to Firestore immediately
    if (attemptId) {
      updateDoc(doc(db, 'testAttempts', attemptId), {
        proctorWarnings: newCount,
        proctorViolations: updatedViolations,
      }).catch(err => console.warn('Failed to sync proctor warnings:', err));
    }

    if (newCount >= 3) {
      // 3rd strike! Automatic submission & test termination
      setWarningModalData({
        title: '🚨 Test Terminated: 3 Proctoring Warnings Exceeded',
        message: 'You have switched tabs, minimized, or exited full screen 3 times. According to the anti-cheating policy, your test is now being automatically submitted.',
        count: 3,
        isTerminated: true,
      });
      setShowWarningModal(true);
      handleSubmitRef.current(true, 'proctor_violation');
    } else {
      setWarningModalData({
        title: newCount === 2 ? '⚠️ FINAL WARNING (2 of 3)' : '⚠️ Proctoring Warning (1 of 3)',
        message: newCount === 2
          ? 'You have switched tabs, minimized, or exited full screen for the 2nd time! Any further violation will IMMEDIATELY terminate and auto-submit your test.'
          : `${detail}. Please remain in full screen and do not navigate away from this test window.`,
        count: newCount,
        isTerminated: false,
      });
      setShowWarningModal(true);
    }
  };

  recordViolationRef.current = recordViolation;

  // ---------------------------------------------------------------------------
  // AutoProctor: Event Listeners (Tab Switch, Minimize, Blur, Fullscreen, Keys)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!started || submitted) return;

    const fullscreenApiAvailable = isFullscreenSupported();

    // Fullscreen change listener — only attach if API is actually supported
    const handleFullscreenChange = () => {
      const active = isFullscreenActive();
      setIsFullscreen(active);
      if (!active && !isSubmittingRef.current) {
        recordViolationRef.current('fullscreen_exit', 'Exited full screen mode');
      }
    };

    // Tab switch & browser minimize listener
    const handleVisibilityChange = () => {
      if ((document.hidden || document.visibilityState === 'hidden') && !isSubmittingRef.current) {
        recordViolationRef.current('tab_switch', 'Switched browser tab or minimized window');
      }
    };

    // Window blur listener (switching applications, clicking secondary screen)
    const handleWindowBlur = () => {
      if (!isSubmittingRef.current) {
        recordViolationRef.current('window_blur', 'Window lost focus (switched application or clicked outside)');
      }
    };

    // Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast('Right-click context menu is disabled during the test.', { icon: '🛡️', id: 'no-context' });
    };

    // Block developer tools & copy-paste shortcuts on questions
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }
      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        return;
      }
      // Block Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && ['u', 'U'].includes(e.key)) {
        e.preventDefault();
        return;
      }
      // Block Copying question text outside of code editor
      if ((e.ctrlKey || e.metaKey) && ['c', 'C'].includes(e.key)) {
        const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (targetTag !== 'textarea' && targetTag !== 'input') {
          e.preventDefault();
          toast('Copying question text is disabled.', { icon: '🛡️', id: 'no-copy' });
        }
      }
    };

    // Only listen for fullscreen changes if the API is supported;
    // on mobile without support, we skip fullscreen enforcement entirely.
    if (fullscreenApiAvailable) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (fullscreenApiAvailable) {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [started, submitted]);

  // Handle re-entering fullscreen after warning modal
  const handleDismissWarning = async () => {
    if (warningModalData.isTerminated) return;
    await requestFullscreen();
    setIsFullscreen(isFullscreenActive());
    setShowWarningModal(false);
  };

  const handleStartTest = async () => {
    if (!user || !test) return;

    // Check attempt limits
    if (test.maxAttempts > 0 && attemptCount >= test.maxAttempts && !existingAttempt) {
      toast.error(`Maximum ${test.maxAttempts} attempts allowed. You've used all attempts.`);
      return;
    }

    // Validate candidate details
    const errors: { name?: string; branch?: string; rollNo?: string } = {};
    if (!candidateName.trim()) errors.name = 'Full name is required';
    if (!candidateBranch.trim()) errors.branch = 'Branch / Stream is required';
    if (!candidateRollNo.trim()) errors.rollNo = 'Roll / Reg No is required';

    if (Object.keys(errors).length > 0) {
      setDetailsErrors(errors);
      toast.error('Please enter your Name, Branch, and Roll/Reg No before starting.');
      return;
    }
    setDetailsErrors({});

    // Save to localStorage so student doesn't have to retype next time
    localStorage.setItem('fc_candidate_name', candidateName.trim());
    localStorage.setItem('fc_candidate_branch', candidateBranch.trim());
    localStorage.setItem('fc_candidate_rollNo', candidateRollNo.trim());

    // Enter Full Screen (gracefully skipped on mobile devices without API support)
    await requestFullscreen();
    setIsFullscreen(isFullscreenActive());

    if (existingAttempt) {
      setStarted(true);
      toast.success('Test resumed in Full Screen!');
      return;
    }

    try {
      const attemptData = {
        testId: test.id,
        testTitle: test.title,
        studentId: user.uid,
        studentName: candidateName.trim(),
        studentEmail: user.email,
        branch: candidateBranch.trim(),
        rollNo: candidateRollNo.trim(),
        courseId: test.courseId || '',
        status: 'in_progress',
        proctored: true,
        proctorWarnings: 0,
        proctorViolations: [],
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
      toast.success('Test started in Full Screen! AutoProctor is active.');
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

  const handleSubmit = async (
    isAutoSubmit = false,
    reason: 'manual' | 'time_expired' | 'proctor_violation' = isAutoSubmit ? 'time_expired' : 'manual'
  ) => {
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
    isSubmittingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    exitFullscreen();

    try {
      const { mcqScore, codingScore, totalScore, gradedAnswers } = gradeAnswers(answers, questions);
      const maxScore = test.totalMarks || 0;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passed = percentage >= (test.passPercentage || 0);
      const hasPendingReview = Object.values(gradedAnswers).some((a: any) => a.reviewStatus === 'pending_review');

      const attemptStatus = reason === 'proctor_violation' ? 'violation_submitted' : isAutoSubmit ? 'timed_out' : 'completed';

      await updateDoc(doc(db, 'testAttempts', attemptId), {
        answers: gradedAnswers,
        mcqScore, codingScore, totalScore, maxScore, percentage, passed,
        status: attemptStatus,
        submissionReason: reason,
        proctorWarnings: proctorWarningsRef.current,
        proctorViolations: proctorViolationsRef.current,
        evaluationStatus: hasPendingReview ? 'pending' : 'completed',
        submittedAt: serverTimestamp(),
      });

      setSubmitted(true);
      if (reason === 'proctor_violation') {
        toast.error('Test auto-submitted due to 3 proctoring violations.', { duration: 5000 });
      } else if (isAutoSubmit) {
        toast('Time expired! Test auto-submitted.', { icon: '⏰' });
      } else if (hasPendingReview) {
        toast('Test submitted! Your answers are submitted for manual evaluation.', { icon: '⏳' });
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
      setSubmitting(false);
      isSubmittingRef.current = false;
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

  // ---------------------------------------------------------------------------
  // Not started yet — show test overview, Candidate details & AutoProctor rules
  // ---------------------------------------------------------------------------
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/dashboard/student/tests')}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-primary transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Tests
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4 shadow-sm">
              <ClipboardCheck size={32} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">{test.title}</h1>
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

          {/* Candidate Details Form */}
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 mb-6">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Candidate Information</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Enter your details before starting. These are permanently recorded on your submission and result report.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={candidateName}
                    onChange={e => {
                      setCandidateName(e.target.value);
                      if (detailsErrors.name) setDetailsErrors(p => ({ ...p, name: undefined }));
                    }}
                    placeholder="e.g. Alex Johnson"
                    className={`w-full pl-8 pr-3 py-2.5 sm:py-2 bg-white border rounded-xl text-base sm:text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${detailsErrors.name ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                      }`}
                  />
                </div>
                {detailsErrors.name && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1">{detailsErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Branch / Stream <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={candidateBranch}
                    onChange={e => {
                      setCandidateBranch(e.target.value);
                      if (detailsErrors.branch) setDetailsErrors(p => ({ ...p, branch: undefined }));
                    }}
                    placeholder="e.g. CSE / IT / BCA"
                    className={`w-full pl-8 pr-3 py-2.5 sm:py-2 bg-white border rounded-xl text-base sm:text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${detailsErrors.branch ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                      }`}
                  />
                </div>
                {detailsErrors.branch && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1">{detailsErrors.branch}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Roll / Reg No <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={candidateRollNo}
                    onChange={e => {
                      setCandidateRollNo(e.target.value);
                      if (detailsErrors.rollNo) setDetailsErrors(p => ({ ...p, rollNo: undefined }));
                    }}
                    placeholder="e.g. 21BCSE104"
                    className={`w-full pl-8 pr-3 py-2.5 sm:py-2 bg-white border rounded-xl text-base sm:text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${detailsErrors.rollNo ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                      }`}
                  />
                </div>
                {detailsErrors.rollNo && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1">{detailsErrors.rollNo}</p>
                )}
              </div>
            </div>
          </div>

          {/* AutoProctor Anti-Cheating Rules Card */}
          <div className="rounded-2xl p-5 border-2 border-rose-200 bg-gradient-to-br from-rose-50/70 via-amber-50/50 to-indigo-50/50 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert size={18} />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  🛡️ AutoProctor Anti-Cheating Active
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                    {isFullscreenSupported() ? 'Compulsory Full Screen' : 'Immersive Mode'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium">Strict anti-cheat monitoring is enforced during this assessment.</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 space-y-2 font-medium">
              <div className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">1.</span>
                <p><strong>{isFullscreenSupported() ? 'Mandatory Full Screen:' : 'Immersive Mode:'}</strong> {isFullscreenSupported() ? 'This test must be completed in full screen. Exiting full screen mode triggers a proctoring violation warning.' : 'On mobile devices, the test runs in immersive mode. Tab switching and leaving the app will still be detected and trigger violations.'}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">2.</span>
                <p><strong>Tab Switch & Minimize Detection:</strong> Switching browser tabs, minimizing the window, or clicking outside will trigger an immediate strike.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-rose-600 font-bold">3.</span>
                <p><strong>3-Strike Rule (Strict Auto-Submit):</strong> You will receive a maximum of <strong>2 warnings</strong>. On the <strong>3rd violation</strong>, your test will be <strong>terminated and automatically submitted</strong> immediately.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">4.</span>
                <p><strong>Anti-Tamper Protections:</strong> Right-clicking, developer tools shortcuts, and question text copying are strictly disabled.</p>
              </div>
            </div>
          </div>

          {/* Test Rules */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-xs text-slate-800 uppercase tracking-wider">General Guidelines</p>
            <p>• Timer starts immediately upon entering full screen and cannot be paused.</p>
            <p>• Answers are continuously auto-saved every 30 seconds.</p>
            <p>• Coding questions are automatically recorded for instructor evaluation.</p>
            {test.maxAttempts > 0 && (
              <p>• Maximum attempts allowed: <strong>{test.maxAttempts}</strong> (Used: {attemptCount})</p>
            )}
          </div>

          {test.maxAttempts > 0 && attemptCount >= test.maxAttempts && !existingAttempt ? (
            <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100 text-sm text-red-600 font-bold">
              You have used all {test.maxAttempts} attempts for this test.
            </div>
          ) : (
            <button
              onClick={handleStartTest}
              className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2.5 text-base cursor-pointer active:scale-98"
            >
              {existingAttempt ? (
                <>
                  <Maximize2 size={20} /> Resume Test in Full Screen
                </>
              ) : (
                <>
                  <Play size={20} fill="currentColor" /> {isFullscreenSupported() ? 'Start Test in Full Screen' : 'Start Test'}
                </>
              )}
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
      {/* -------------------------------------------------------------------- */}
      {/* AutoProctor Warning & Full Screen Enforcer Blocking Modal Overlay     */}
      {/* -------------------------------------------------------------------- */}
      {started && !submitted && (showWarningModal || !isFullscreen) && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-4 border-rose-500 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Warning Icon Badge */}
            <div className={`w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center ${
              warningModalData.isTerminated || proctorWarnings >= 3
                ? 'bg-rose-100 text-rose-600 animate-bounce'
                : proctorWarnings === 2
                  ? 'bg-amber-100 text-amber-600 animate-pulse'
                  : 'bg-indigo-100 text-indigo-600'
            }`}>
              {warningModalData.isTerminated || proctorWarnings >= 3 ? (
                <AlertOctagon size={42} />
              ) : (
                <ShieldAlert size={42} />
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              {warningModalData.title || (!isFullscreen ? '⚠️ Full Screen Required' : '⚠️ Proctoring Warning')}
            </h2>

            {/* 3-Strike Visual Indicator */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3].map((num) => {
                const isFired = num <= proctorWarnings;
                return (
                  <div
                    key={num}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      isFired
                        ? num === 3
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-rose-100 text-rose-700 border border-rose-300'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    Strike {num} {isFired ? '⚠️' : '○'}
                  </div>
                );
              })}
            </div>

            {/* Explanation Message */}
            <p className="text-sm font-semibold text-slate-600 mb-6 leading-relaxed">
              {warningModalData.message || 'You must keep this test in full screen mode and refrain from switching tabs or minimizing.'}
            </p>

            {/* Action Buttons */}
            {warningModalData.isTerminated || proctorWarnings >= 3 ? (
              <div className="space-y-3">
                <div className="py-2.5 px-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                  Auto-submitting test due to 3 proctoring violations... Please wait.
                </div>
                <button
                  onClick={() => handleSubmit(true, 'proctor_violation')}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-lg transition-colors text-sm cursor-pointer"
                >
                  View Test Results
                </button>
              </div>
            ) : (
              <button
                onClick={handleDismissWarning}
                className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl shadow-lg shadow-primary/25 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Maximize2 size={16} /> Re-enter Full Screen & Continue Test
              </button>
            )}

            {/* Footer Rule Note */}
            <p className="text-[11px] font-bold text-slate-400 mt-4">
              ⚠️ Maximum 3 warnings allowed. 3rd violation results in instant test auto-submission.
            </p>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Sticky Header: Timer, AutoProctor HUD, Candidate details & Submit    */}
      {/* -------------------------------------------------------------------- */}
      <div className={`sticky top-0 z-20 bg-white/95 backdrop-blur-md rounded-2xl border shadow-sm p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 ${
        isTimeLow ? 'border-rose-200 bg-rose-50/95' : 'border-slate-200'
      }`}>
        {/* Tier 1 on mobile: Question Progress + Clock + Submit */}
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xs font-bold text-slate-500 shrink-0">
              Q {currentQ + 1}/{questions.length}
            </span>
            <div className="w-16 sm:w-28 h-1.5 bg-slate-200 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono font-extrabold text-xs sm:text-sm min-h-[36px] ${
              isTimeLow ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-700'
            }`}>
              <Clock size={14} />
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-3 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px] active:scale-95"
            >
              <Send size={13} />
              <span>{submitting ? '...' : 'Submit'}</span>
            </button>
          </div>
        </div>

        {/* Tier 2 on mobile: Badges & Full Screen Toggle */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 pt-1 sm:pt-0 border-t border-slate-100 sm:border-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* AutoProctor HUD Badge */}
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shadow-2xs shrink-0">
              <Shield size={13} className="text-emerald-600 animate-pulse" />
              <span>AutoProctor</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>

            {/* Warnings Counter Badge */}
            <div className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] font-extrabold shrink-0 ${
              proctorWarnings === 0
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : proctorWarnings === 1
                  ? 'bg-amber-50 border-amber-300 text-amber-700 animate-pulse'
                  : 'bg-rose-50 border-rose-300 text-rose-700 animate-bounce'
            }`}>
              <ShieldAlert size={12} className={proctorWarnings > 0 ? 'text-rose-600' : 'text-slate-400'} />
              <span><span className="hidden sm:inline">Warnings: </span><span className="font-mono">{proctorWarnings}/3</span></span>
            </div>
          </div>

          {/* Candidate badge (desktop only) */}
          {(candidateName || candidateRollNo) && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-semibold text-indigo-700 truncate max-w-[180px]">
              <User size={12} className="shrink-0 text-indigo-500" />
              <span className="truncate">{candidateName}</span>
              {candidateRollNo && <span className="text-indigo-400 font-mono text-[10px]">({candidateRollNo})</span>}
            </div>
          )}

          {/* Fullscreen recovery button if accidentally lost */}
          {!isFullscreen && (
            <button
              onClick={async () => {
                await requestFullscreen();
                setIsFullscreen(isFullscreenActive());
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-extrabold shadow-sm animate-pulse cursor-pointer shrink-0"
              title="Click to enter Full Screen mode"
            >
              <Maximize2 size={12} /> Full Screen
            </button>
          )}
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

        {/* Question Content (select-none prevents text copying) */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden select-none">
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
                <p className="text-sm sm:text-base font-semibold text-slate-800 mb-4 leading-relaxed whitespace-pre-wrap select-none">
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
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer select-none ${
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
                <div className="text-sm font-semibold text-slate-800 mb-4 leading-relaxed whitespace-pre-wrap select-none">
                  {q.problemStatement}
                </div>

                {/* Sample I/O */}
                {(q.sampleInput || q.sampleOutput) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 select-none">
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
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex items-center justify-between gap-2.5">
            <button
              onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
              className="flex items-center justify-center gap-1 px-3.5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-40 cursor-pointer min-h-[44px]"
            >
              <ChevronLeft size={15} /> <span>Previous</span>
            </button>

            {/* Mobile question pills */}
            <div className="flex md:hidden gap-1.5 overflow-x-auto scrollbar-none py-1">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQ(idx)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold shrink-0 flex items-center justify-center cursor-pointer transition-all ${
                    idx === currentQ ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30' :
                      answers[questions[idx].id] ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentQ < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center justify-center gap-1 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors cursor-pointer min-h-[44px] active:scale-95"
              >
                <span>Next</span> <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 disabled:opacity-70 min-h-[44px]"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Send size={14} /> <span>Submit</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
