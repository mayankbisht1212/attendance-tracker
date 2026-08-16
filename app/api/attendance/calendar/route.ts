import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAttendanceCalendar } from '@/lib/attendance';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const year = Number(url.searchParams.get('year')) || now.getUTCFullYear();
  const month = Number(url.searchParams.get('month')) || now.getUTCMonth() + 1;

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: 'month must be between 1 and 12.' }, { status: 400 });
  }

  const days = await getAttendanceCalendar(session.user.id, year, month);
  return NextResponse.json({ year, month, days });
}