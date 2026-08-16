import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAttendanceDashboard } from '@/lib/attendance';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const data = await getAttendanceDashboard(session.user.id);

  // Pretty-print JSON in development for easier debugging in terminal/browser tools.
  if (process.env.NODE_ENV !== 'production') {
    return new Response(JSON.stringify(data, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json(data);
}
