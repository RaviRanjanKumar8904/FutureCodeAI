export interface WebinarItem {
  id: string;
  title: string;
  topic?: string;
  speaker?: string;
  startDate: string;
  endDate?: string;
  totalDays: number;
  maxSeats?: number;
  time?: string;
  meetingLink?: string;
  formLink?: string;
  assignedStaff?: string;
  assignedStaffEmail?: string;
  assignedCenter?: string;
  location?: string;
  status: 'Upcoming' | 'Live' | 'Completed';
  postponedDates?: string[];
  postponements?: Record<string, { reason?: string; postponedAt?: any }>;
  createdAt?: any;
}

export interface WebinarAttendee {
  id: string;
  webinarId?: string;
  webinarTitle: string;
  studentName: string;
  email: string;
  phone?: string;
  collegeName?: string;
  branch?: string;
  yearOfStudy?: string;
  timestamp?: string;
  dailyAttendance: Record<string, 'Present' | 'Absent'>;
  certificateIssued: boolean;
  certificateId?: string;
  certificateIssuedAt?: any;
  status?: 'Confirmed' | 'Waitlisted';
  waitlistPosition?: number;
  promotedAt?: any;
  source: 'google_form_csv' | 'manual' | 'student_self_enroll';
  importedAt?: any;
  createdAt?: any;
}
