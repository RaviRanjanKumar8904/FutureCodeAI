export interface ScheduleItem {
  date: string;
  isPostponed: boolean;
  dayNumber?: number;
  label: string;
  reason?: string;
}

/**
 * Generates the full webinar session schedule accounting for postponed days.
 * Every postponement shifts the timeline forward by +1 day, ensuring students
 * still receive the complete count of active teaching sessions (e.g., 15 sessions).
 */
export function generateWebinarSchedule(
  startDateStr: string,
  totalActiveDays: number = 15,
  postponedDates: string[] = [],
  postponements?: Record<string, { reason?: string }>
): { schedule: ScheduleItem[]; activeDates: string[]; endDate: string } {
  const schedule: ScheduleItem[] = [];
  const activeDates: string[] = [];
  if (!startDateStr || totalActiveDays <= 0) return { schedule, activeDates, endDate: startDateStr || '' };

  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return { schedule, activeDates, endDate: startDateStr };

  let activeCount = 0;
  let dayOffset = 0;
  const maxLoop = 120; // safety ceiling

  while (activeCount < totalActiveDays && dayOffset < maxLoop) {
    const current = new Date(start);
    current.setDate(start.getDate() + dayOffset);
    const dateStr = current.toISOString().split('T')[0];

    const isPostponed = (postponedDates || []).includes(dateStr);

    if (isPostponed) {
      const reason = postponements?.[dateStr]?.reason || 'Instructor Unavailable / Rescheduled';
      schedule.push({
        date: dateStr,
        isPostponed: true,
        label: 'Postponed',
        reason,
      });
    } else {
      activeCount++;
      activeDates.push(dateStr);
      schedule.push({
        date: dateStr,
        isPostponed: false,
        dayNumber: activeCount,
        label: `Day ${activeCount}`,
      });
    }

    dayOffset++;
  }

  const lastItem = schedule[schedule.length - 1];
  const endDate = lastItem ? lastItem.date : startDateStr;

  return { schedule, activeDates, endDate };
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatDateFull(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
