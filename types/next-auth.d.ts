import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      department?: string;
    } & NonNullable<Session['user']>;
  }

  interface User {
    department?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    department?: string;
  }
}
