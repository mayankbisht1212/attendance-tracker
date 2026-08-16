import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { markAttendance, parseDateOnly } from '@/lib/attendance';
import { AttendanceStatus } from '@/app/generated/prisma/enums';

const VALID_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE'];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const { subjectId, status, date: dateParam } = body;

  if (!subjectId || typeof subjectId !== 'string') {
    return NextResponse.json({ error: 'subjectId is required.' }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  let date: Date | undefined;
  if (dateParam) {
    try {
      date = parseDateOnly(dateParam);
    } catch {
      return NextResponse.json(
        { error: 'Invalid date format — expected YYYY-MM-DD.' },
        { status: 400 }
      );
    }
  }

  try {
    await markAttendance(session.user.id, subjectId, status, date);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update attendance.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}