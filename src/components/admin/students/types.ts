import type { CertificateData } from '../../certificate/CourseCertificate';

export interface Student {
  id: string;
  docIds?: string[];
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  createdAt: any;
  phone?: string;
  gender?: string;
  school?: string;
  collegeName?: string;
  rollNo?: string;
  enrolledCourse?: string;
  assignedCenter?: string;
  batch?: string;
  // Enrollment metadata for timeline calculation
  enrolledAtDate?: string; // YYYY-MM-DD
  courseDuration?: string; // e.g. "3 Months"
  completionDate?: string; // YYYY-MM-DD
  isDurationCompleted?: boolean;
  daysRemaining?: number;
  // Certificate info if already issued
  certificateId?: string;
  certificateData?: CertificateData;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentEmail: string;
  courseName: string;
  institute: string;
  batch: string;
  status: string;
  gender?: string;
  collegeName?: string;
  rollNo?: string;
  enrolledAt?: any;
  createdAt?: any;
}

// Utility: parse duration string into months and days
export function parseDuration(durationStr?: string): { months: number; days: number } {
  if (!durationStr) return { months: 3, days: 0 };
  const s = durationStr.toLowerCase().trim();
  const numMatch = s.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 3;

  if (s.includes('year')) {
    return { months: num * 12, days: 0 };
  } else if (s.includes('month')) {
    return { months: num, days: 0 };
  } else if (s.includes('week')) {
    return { months: 0, days: num * 7 };
  } else if (s.includes('day')) {
    return { months: 0, days: num };
  }
  return { months: num, days: 0 };
}

// Utility: compute completion date from enrollment start date and course duration
export function computeCompletionDate(startDateStr: string, durationStr?: string): string {
  try {
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return startDateStr;
    const { months, days } = parseDuration(durationStr);
    const end = new Date(start);
    if (months > 0) end.setMonth(end.getMonth() + months);
    if (days > 0) end.setDate(end.getDate() + days);
    return end.toISOString().split('T')[0];
  } catch {
    return startDateStr;
  }
}

export function generateBatchOptions(): string[] {
  const batches: string[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  for (const year of [currentYear - 1, currentYear, currentYear + 1]) {
    for (const month of months) {
      batches.push(`${month} ${year}`);
    }
  }
  return batches;
}
