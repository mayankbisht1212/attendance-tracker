import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { prisma } from './prisma';
import { verifyPassword } from './users';

export const authOptions: NextAuthOptions = {
  // No adapter here — this schema doesn't have the Account/Session/
  // VerificationToken tables NextAuth's PrismaAdapter expects. Sessions
  // stay JWT-only, and the callbacks below provision/attach a User row
  // by email for OAuth sign-ins instead of relying on the adapter.
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/signin',
  },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required.');
        }

        const user = await verifyPassword(credentials.email, credentials.password);
        if (!user) {
          throw new Error('Invalid email or password.');
        }

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          department: user.department,
        };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID as string,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Credentials users already exist in the DB by the time
      // authorize() succeeds — nothing more to do here.
      if (account?.provider === 'credentials') return true;

      // OAuth sign-in: make sure a matching User row exists so the
      // rest of the app (enrollments, timetable, attendance) has
      // someone to attach records to.
      if (!user.email) return false;

      const existing = await prisma.user.findUnique({ where: { email: user.email } });
      if (!existing) {
        const [firstName, ...rest] = (user.name || user.email).trim().split(/\s+/);
        await prisma.user.create({
          data: {
            email: user.email,
            firstName: firstName || 'New',
            lastName: rest.join(' ') || 'User',
            // OAuth sign-ups have no department yet — worth prompting
            // for this in onboarding if it's still "Unassigned".
            department: 'Unassigned',
          },
        });
      }

      return true;
    },

    async jwt({ token, user }) {
      // For Credentials, `user` already carries our DB id. For OAuth,
      // `user.id` is the provider's id, not ours — look our row up by
      // email so token.id always matches the User table.
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser) {
          token.id = dbUser.id;
          token.department = dbUser.department;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.department = token.department;
      return session;
    },
  },
};