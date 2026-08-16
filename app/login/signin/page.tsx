'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getProviders, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const inputClass = 'w-full border-0 border-b-2 border-[#c9bfa0] bg-transparent px-0.5 py-2.5 text-[15px] text-[#1c2331] outline-none placeholder:text-[#b4ac93] focus:border-[#b8452b]';
const labelClass = 'font-mono text-[11px] uppercase tracking-[0.1em] text-[#5b6478]';

export default function SignInPage() {
  const [time, setTime] = useState('--:--:--');
  const [date, setDate] = useState('Loading date…');
  const [stamped, setStamped] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => { const tick = () => { const now = new Date(); setTime(now.toLocaleTimeString([], { hour12: false })); setDate(now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })); }; tick(); const interval = setInterval(tick, 1000); return () => clearInterval(interval); }, []);
  useEffect(() => { void getProviders().then((providers) => setGoogleEnabled(Boolean(providers?.google))); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const result = await signIn('credentials', { redirect: false, email: String(formData.get('email') ?? ''), password: String(formData.get('password') ?? ''), callbackUrl: '/dashboard' });
    setIsSubmitting(false);
    if (result?.error) return setError('Invalid email or password.');
    setStamped(true); router.push(result?.url ?? '/dashboard'); router.refresh();
  }

  return <div className="flex min-h-screen bg-[#0b1120] font-sans text-[#1c2331]">
    <section className="hidden min-h-screen flex-[0_1_46%] flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(201,162,75,0.08),transparent_45%),linear-gradient(160deg,#10182b_0%,#0b1120_100%)] p-14 text-[#ede7d6] lg:flex lg:px-16">
      <div className="flex items-center gap-3 font-serif text-xl font-bold tracking-[0.02em]"><span className="size-[34px] rounded-full border-2 border-[#c9a24b]" />Roll Call</div>
      <div><div className="mb-[18px] font-mono text-xs uppercase tracking-[0.18em] text-[#c9a24b]">Today&apos;s log opens at</div><div className="font-serif text-[clamp(56px,8vw,92px)] font-semibold leading-none tabular-nums">{time}</div><div className="mt-3.5 font-mono text-[15px] tracking-[0.04em] text-[#a7adbe]">{date}</div></div>
      <p className="max-w-sm text-[15px] leading-relaxed text-[#a7adbe]"><strong className="block font-serif text-lg text-[#ede7d6]">One stamp, every day.</strong>Sign in to open today&apos;s ledger, mark yourself present, and see who else is in.</p>
    </section>
    <section className="flex min-h-screen flex-1 items-center justify-center bg-[#f6f1e4] px-5 py-10 sm:px-8"><div className="w-full max-w-[420px]">
      <div className="mb-2 font-mono text-xs uppercase tracking-[0.14em] text-[#b8452b]">Attendance Ledger</div><h1 className="font-serif text-[38px] font-bold">Sign in</h1><p className="mt-2 text-[15px] text-[#5b6478]">New here? <a href="/login/signup" className="text-[#b8452b] underline underline-offset-4">Set up an account</a></p>
      <form onSubmit={handleSubmit} className="mt-9 flex flex-col gap-6"><div className="flex flex-col gap-2"><label htmlFor="email" className={labelClass}>Work email</label><input id="email" name="email" type="email" placeholder="you@bitmesra.ac.in" autoComplete="email" required className={inputClass} /></div><div className="flex flex-col gap-2"><label htmlFor="password" className={labelClass}>Password</label><input id="password" name="password" type="password" placeholder="••••••••••" autoComplete="current-password" required className={inputClass} /></div>
        <div className="flex items-center justify-between gap-3 text-xs"><label className="flex items-center gap-2 text-[#5b6478]"><input type="checkbox" id="remember" className="accent-[#b8452b]" />Keep me signed in</label><span className="text-right text-[#5b6478]">Password recovery coming soon</span></div>
        {error && <p role="alert" className="-mb-3 text-sm text-[#b8452b]">{error}</p>}<button type="submit" disabled={isSubmitting} className="rounded-[3px] border-2 border-[#b8452b] px-7 py-[15px] font-serif text-base font-semibold tracking-[0.03em] text-[#b8452b] transition hover:bg-[#b8452b] hover:text-[#f6f1e4] disabled:cursor-default disabled:opacity-60">{isSubmitting ? 'Signing in…' : stamped ? 'Stamped ✓' : 'Stamp in & sign in'}</button>
        {googleEnabled && <><div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[#5b6478] before:h-px before:flex-1 before:bg-[#e4dcc5] after:h-px after:flex-1 after:bg-[#e4dcc5]">or continue with</div><button type="button" onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className="rounded border border-[#c9bfa0] px-4 py-3 font-mono text-[13px] text-[#1c2331] hover:border-[#b8452b]">Google</button></>}
      </form><p className="mt-8 font-mono text-[11px] leading-relaxed text-[#5b6478]">Badge ID login available at kiosk terminals on-site.</p>
    </div></section>
  </div>;
}
