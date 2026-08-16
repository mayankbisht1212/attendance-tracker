import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

const weekdays = { Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN' } as const;
type DayLabel = keyof typeof weekdays;
type TimetableInput = { semester: number; subjects: Array<{ name: string; code: string; slots: Array<{ day: DayLabel; startTime: string; endTime: string }> }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseTimetable(value: unknown): TimetableInput | null {
  if (!isRecord(value) || typeof value.semester !== 'number' || !Number.isInteger(value.semester) || value.semester < 1 || value.semester > 8 || !Array.isArray(value.subjects) || !value.subjects.length) return null;
  const codes = new Set<string>();
  const subjects: TimetableInput['subjects'] = [];
  for (const item of value.subjects) {
    if (!isRecord(item) || typeof item.name !== 'string' || typeof item.code !== 'string' || !item.name.trim() || !item.code.trim() || !Array.isArray(item.slots) || !item.slots.length) return null;
    const code = item.code.trim().toUpperCase();
    if (codes.has(code)) return null;
    codes.add(code);
    const days = new Set<DayLabel>();
    const slots: TimetableInput['subjects'][number]['slots'] = [];
    for (const slot of item.slots) {
      if (!isRecord(slot) || typeof slot.day !== 'string' || !(slot.day in weekdays) || typeof slot.startTime !== 'string' || typeof slot.endTime !== 'string' || !/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime) || slot.startTime >= slot.endTime || days.has(slot.day as DayLabel)) return null;
      days.add(slot.day as DayLabel);
      slots.push({ day: slot.day as DayLabel, startTime: slot.startTime, endTime: slot.endTime });
    }
    subjects.push({ name: item.name.trim(), code, slots });
  }
  return { semester: value.semester, subjects };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in to save a timetable.' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const timetable = parseTimetable(body);
  if (!timetable) return NextResponse.json({ error: 'Enter a valid semester, subject, and class time for every selected day.' }, { status: 400 });

  try {
    const saved = await prisma.$transaction(async (tx) => {
      // runtime check: some environments may provide a transaction client
      // without model delegates; surface a clear error if that happens.
      if (!tx || typeof (tx as any).timetableEntry === 'undefined') {
        throw new Error('Transaction client does not expose model delegates (tx.timetableEntry is undefined)');
      }

      await tx.timetableEntry.deleteMany({ where: { userId: session.user.id, semester: timetable.semester } });
      let count = 0;
      for (const subjectInput of timetable.subjects) {
        const subject = await tx.subject.upsert({
          where: { code: subjectInput.code },
          update: { name: subjectInput.name },
          create: { code: subjectInput.code, name: subjectInput.name },
        });

        await tx.enrollment.upsert({
          where: { userId_subjectId: { userId: session.user.id, subjectId: subject.id } },
          update: {},
          create: { userId: session.user.id, subjectId: subject.id },
        });

        if (subjectInput.slots.length > 0) {
          await tx.timetableEntry.createMany({
            data: subjectInput.slots.map((slot) => ({
              userId: session.user.id,
              subjectId: subject.id,
              semester: timetable.semester,
              day: weekdays[slot.day],
              startTime: slot.startTime,
              endTime: slot.endTime,
            })),
          });
        }

        count += subjectInput.slots.length;
      }

      return count;
    });

    return NextResponse.json({ saved }, { status: 201 });
  } catch (error) {
    console.error('Could not save timetable:', error);
    return NextResponse.json({ error: 'Could not save your timetable. Please try again.' }, { status: 500 });
  }
}
