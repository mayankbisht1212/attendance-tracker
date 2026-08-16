import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function createUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  password: string;
}) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.user.create({
  data: {
    email: input.email.toLowerCase(),
    firstName: input.firstName,
    lastName: input.lastName,
    department: input.department,
    passwordHash,
  },
});
}

export async function verifyPassword(email: string, password: string) {
  const user = await findUserByEmail(email);

  // No passwordHash means this account only ever signed in via
  // Google/Microsoft — there's no local password to check.
  if (!user || !user.passwordHash) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return user;
}