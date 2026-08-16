import { NextResponse } from 'next/server';
import { createUser } from '../../../lib/users';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const { firstName, lastName, email, department, password, confirmPassword } = body;

  if (
    typeof firstName !== 'string' ||
    typeof lastName !== 'string' ||
    typeof email !== 'string' ||
    typeof department !== 'string' ||
    typeof password !== 'string' ||
    typeof confirmPassword !== 'string' ||
    !firstName.trim() ||
    !lastName.trim() ||
    !email.trim() ||
    !department.trim()
  ) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
  }

  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    );
  }

  try {
    const user = await createUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      department: department.trim(),
      password,
    });
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create account.';
    if (message === 'An account with this email already exists.') {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error('Registration failed:', err);
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
  }
}
