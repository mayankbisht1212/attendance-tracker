import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getClassesForDate, parseDateOnly, todayDateOnly } from '@/lib/attendance';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');

  let date: Date;
  try {
    date = dateParam ? parseDateOnly(dateParam) : todayDateOnly();
  } catch {
    return NextResponse.json(
      { error: 'Invalid date format — expected YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  const classes = await getClassesForDate(session.user.id, date);

  return NextResponse.json({
    date: date.toISOString().slice(0, 10),
    classes,
  });
}