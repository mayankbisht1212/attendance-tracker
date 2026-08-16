import { AttendanceStatus, Weekday } from '@/app/generated/prisma/enums';
import { prisma } from './prisma';
// import { AttendanceStatus, Weekday } from '@/app/generated/prisma';

const WEEKDAY_BY_JS_DAY: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function todayWeekday(): Weekday {
  return WEEKDAY_BY_JS_DAY[new Date().getDay()];
}

// Normalized to midnight UTC so the same calendar day always maps to
// the same ClassSession row, regardless of what time attendance gets marked.
export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// Parses a "YYYY-MM-DD" string into the same UTC-midnight Date shape
// todayDateOnly() produces, so both map to identical ClassSession rows.
export function parseDateOnly(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error('Invalid date format, expected YYYY-MM-DD.');
  }
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date.');
  }
  return date;
}

export interface DayClassInfo {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  startTime: string;
  endTime: string;
  status: AttendanceStatus | null;
}

// Kept as an alias so any existing code importing TodayClassInfo still works.
export type TodayClassInfo = DayClassInfo;

// Returns the subjects scheduled for the given date (based on that
// date's weekday + the user's most recent semester's timetable),
// along with whatever attendance status is recorded for that date, if any.
export async function getClassesForDate(userId: string, date: Date): Promise<DayClassInfo[]> {
  const latest = await prisma.timetableEntry.aggregate({
    where: { userId },
    _max: { semester: true },
  });
  const semester = latest._max.semester;
  if (!semester) return [];

  const day = WEEKDAY_BY_JS_DAY[date.getUTCDay()];

  const entries = await prisma.timetableEntry.findMany({
    where: { userId, day, semester },
    include: { subject: true },
    orderBy: { startTime: 'asc' },
  });

  const subjectIds = entries.map((e) => e.subjectId);

  const sessions = subjectIds.length
    ? await prisma.classSession.findMany({
        where: { subjectId: { in: subjectIds }, date },
        include: { attendance: { where: { enrollment: { userId } } } },
      })
    : [];

  return entries.map((entry) => {
    const session = sessions.find((s) => s.subjectId === entry.subjectId);
    return {
      subjectId: entry.subjectId,
      subjectName: entry.subject.name,
      subjectCode: entry.subject.code,
      startTime: entry.startTime,
      endTime: entry.endTime,
      status: session?.attendance[0]?.status ?? null,
    };
  });
}

export interface SubjectAttendanceStats {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number; // (present + late) / total * 100, rounded to 1 decimal
}

export interface AttendanceDashboardData {
  today: TodayClassInfo[];
  subjects: SubjectAttendanceStats[];
  overall: {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  };
}

function computePercentage(present: number, late: number, total: number) {
  if (total === 0) return 0;
  return Math.round(((present + late) / total) * 1000) / 10;
}

export async function getAttendanceDashboard(userId: string): Promise<AttendanceDashboardData> {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: { subject: true, attendance: true },
  });

  const today = await getClassesForDate(userId, todayDateOnly());

  const subjects: SubjectAttendanceStats[] = enrollments.map((e) => {
    const present = e.attendance.filter((a) => a.status === 'PRESENT').length;
    const absent = e.attendance.filter((a) => a.status === 'ABSENT').length;
    const late = e.attendance.filter((a) => a.status === 'LATE').length;
    const total = present + absent + late;

    return {
      subjectId: e.subjectId,
      subjectName: e.subject.name,
      subjectCode: e.subject.code,
      total,
      present,
      absent,
      late,
      percentage: computePercentage(present, late, total),
    };
  });

  const overall = subjects.reduce(
    (acc, s) => {
      acc.total += s.total;
      acc.present += s.present;
      acc.absent += s.absent;
      acc.late += s.late;
      return acc;
    },
    { total: 0, present: 0, absent: 0, late: 0 }
  );

  return {
    today,
    subjects,
    overall: {
      ...overall,
      percentage: computePercentage(overall.present, overall.late, overall.total),
    },
  };
}

export async function markAttendance(
  userId: string,
  subjectId: string,
  status: AttendanceStatus,
  date: Date = todayDateOnly()
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_subjectId: { userId, subjectId } },
  });

  if (!enrollment) {
    throw new Error('You are not enrolled in this subject.');
  }

  const session = await prisma.classSession.upsert({
    where: { subjectId_date: { subjectId, date } },
    update: {},
    create: { subjectId, date },
  });

  return prisma.attendance.upsert({
    where: {
      enrollmentId_sessionId: { enrollmentId: enrollment.id, sessionId: session.id },
    },
    update: { status },
    create: { enrollmentId: enrollment.id, sessionId: session.id, status },
  });
}

export interface DayAttendanceSummary {
  date: string; // "YYYY-MM-DD", UTC
  present: number;
  absent: number;
  late: number;
  total: number;
}

// month is 1-12. Returns one entry per day in that month that has at
// least one attendance record for this user — days with nothing
// marked are simply absent from the array.
export async function getAttendanceCalendar(
  userId: string,
  year: number,
  month: number
): Promise<DayAttendanceSummary[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1)); // first day of next month, exclusive

  const sessions = await prisma.classSession.findMany({
    where: {
      date: { gte: start, lt: end },
      attendance: { some: { enrollment: { userId } } },
    },
    include: {
      attendance: { where: { enrollment: { userId } } },
    },
  });

  const map = new Map<string, DayAttendanceSummary>();

  for (const session of sessions) {
    const key = session.date.toISOString().slice(0, 10);
    const entry = map.get(key) ?? { date: key, present: 0, absent: 0, late: 0, total: 0 };

    for (const a of session.attendance) {
      if (a.status === 'PRESENT') entry.present += 1;
      else if (a.status === 'ABSENT') entry.absent += 1;
      else if (a.status === 'LATE') entry.late += 1;
      entry.total += 1;
    }

    map.set(key, entry);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}