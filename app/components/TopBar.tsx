'use client';

import { signOut, useSession } from 'next-auth/react';

function getInitials(name?: string | null, email?: string | null) {
  if (name) return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
  return email?.[0]?.toUpperCase() ?? '?';
}

export default function TopBar() {
  const { data: session, status } = useSession();
  return (
    <header className="flex items-center justify-between border-b border-white/5 bg-[#10182b] px-5 py-4 text-[#ede7d6] sm:px-8">
      <div className="flex items-center gap-2.5 font-serif text-[17px] font-bold tracking-[0.02em]"><span className="relative size-[22px] rounded-full border-2 border-[#c9a24b] before:absolute before:left-[8px] before:top-[3px] before:h-[7px] before:w-[1.5px] before:bg-[#c9a24b] after:absolute after:left-[8px] after:top-[8px] after:size-1 after:rounded-full after:bg-[#c9a24b]" />Roll Call</div>
      <div className="flex items-center">
        {status === 'loading' && <div className="flex items-center gap-2.5"><div className="size-[34px] animate-pulse rounded-full bg-white/10" /><div className="h-3 w-[90px] animate-pulse rounded bg-white/10" /></div>}
        {status === 'unauthenticated' && <a href="/login/signin" className="rounded-[3px] border border-[#c9a24b]/40 px-3.5 py-[7px] font-mono text-[13px] text-[#c9a24b] transition hover:border-[#c9a24b] hover:bg-[#c9a24b]/10">Sign in</a>}
        {status === 'authenticated' && session?.user && <div className="flex items-center gap-3.5"><div className="hidden text-right leading-[1.3] sm:flex sm:flex-col"><span className="text-sm font-semibold">{session.user.name ?? session.user.email}</span>{session.user.department && <span className="font-mono text-[11px] text-[#c9a24b]">{session.user.department}</span>}</div>{session.user.image ? <img src={session.user.image} alt={session.user.name ?? 'Profile photo'} referrerPolicy="no-referrer" className="size-[34px] rounded-full object-cover" /> : <div aria-hidden="true" className="grid size-[34px] place-items-center rounded-full bg-[#c9a24b] font-mono text-xs font-semibold text-[#10182b]">{getInitials(session.user.name, session.user.email)}</div>}<button type="button" onClick={() => signOut({ callbackUrl: '/login/signin' })} className="border-l border-white/15 pl-3.5 font-mono text-[11px] uppercase tracking-[0.06em] text-[#c9a24b] hover:text-[#ede7d6]">Sign out</button></div>}
      </div>
    </header>
  );
}
