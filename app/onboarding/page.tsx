'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ClassSlot {
  day: DayOfWeek;
  startTime: string; // "HH:MM", 24-hour
  endTime: string; // "HH:MM", 24-hour
}

interface SubjectDraft {
  id: string;
  name: string;
  code: string;
  slots: ClassSlot[];
}

interface SemesterSetupPayload {
  semester: number;
  subjects: {
    name: string;
    code: string;
    slots: ClassSlot[];
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newSubject(): SubjectDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    code: '',
    slots: [],
  };
}

function dayOrder(day: DayOfWeek) {
  return ALL_DAYS.indexOf(day);
}

function validate(semester: number | null, subjects: SubjectDraft[]): string | null {
  if (!semester) return 'Select which semester you\u2019re starting.';
  if (subjects.length === 0) return 'Add at least one subject.';

  for (const s of subjects) {
    if (!s.name.trim()) return 'Every subject needs a name.';
    if (!s.code.trim()) return 'Every subject needs a subject code.';
    if (s.slots.length === 0) return `Pick at least one class day for ${s.name || 'a subject'}.`;

    for (const slot of s.slots) {
      if (!slot.startTime || !slot.endTime) {
        return `Set a start and end time for ${s.name || 'a subject'} on ${slot.day}.`;
      }
      if (slot.startTime >= slot.endTime) {
        return `${s.name || 'A subject'}'s ${slot.day} class ends before it starts.`;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SemesterSetupPage() {
  const router = useRouter();

  const [semester, setSemester] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<SubjectDraft[]>([newSubject()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stamped, setStamped] = useState(false);

  const updateSubject = (id: string, patch: Partial<SubjectDraft>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const toggleDay = (subjectId: string, day: DayOfWeek) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== subjectId) return s;
        const exists = s.slots.some((slot) => slot.day === day);
        const slots = exists
          ? s.slots.filter((slot) => slot.day !== day)
          : [...s.slots, { day, startTime: '', endTime: '' }].sort(
              (a, b) => dayOrder(a.day) - dayOrder(b.day)
            );
        return { ...s, slots };
      })
    );
  };

  const updateSlotTime = (
    subjectId: string,
    day: DayOfWeek,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== subjectId) return s;
        return {
          ...s,
          slots: s.slots.map((slot) => (slot.day === day ? { ...slot, [field]: value } : slot)),
        };
      })
    );
  };

  const addSubject = () => setSubjects((prev) => [...prev, newSubject()]);

  const removeSubject = (id: string) =>
    setSubjects((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const validationError = validate(semester, subjects);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const payload: SemesterSetupPayload = {
      semester: semester as number,
      subjects: subjects.map(({ name, code, slots }) => ({ name, code, slots })),
    };

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not save your setup. Please try again.');
      }

      setStamped(true);
      setTimeout(() => router.push('/dashboard'), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f1e4] font-['IBM_Plex_Sans',sans-serif] text-[#1c2331]">
      {/* Kept standard <style> for the fonts import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      `}</style>

      <header className="flex items-center justify-between px-8 py-4 bg-[#10182b] text-[#ede7d6]">
        <div className="flex items-center gap-2.5 font-['Zilla_Slab',serif] font-bold text-[17px]">
          <span
            className="w-[22px] h-[22px] rounded-full border-2 border-[#c9a24b]"
            aria-hidden="true"
          />
          Roll Call
        </div>
        <div className="font-['IBM_Plex_Mono',monospace] text-xs tracking-[0.08em] uppercase text-[#c9a24b]">
          One-time setup
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-6 pt-14 pb-24 max-sm:px-[18px] max-sm:pt-10 max-sm:pb-[72px]">
        <div className="mb-10">
          <div className="font-['IBM_Plex_Mono',monospace] text-xs tracking-[0.14em] uppercase text-[#b8452b] mb-2.5">
            Let&apos;s open a fresh ledger
          </div>
          <h1 className="font-['Zilla_Slab',serif] font-bold text-[34px] m-0 mb-3 text-[#1c2331]">
            Set up your semester
          </h1>
          <p className="text-[#5b6478] text-[15px] leading-[1.6] max-w-[560px]">
            Add your subjects and pick which days they meet. Each day can have its own time —
            handy for a subject with a morning lecture and a later lab. We&apos;ll build your
            attendance tracker and timetable from this in one go.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-7">
          <section className="bg-white/50 border border-[#e4dcc5] rounded-md px-6 py-[22px] flex flex-col gap-2.5">
            <label
              htmlFor="semester"
              className="font-['IBM_Plex_Mono',monospace] text-[11px] tracking-[0.1em] uppercase text-[#5b6478]"
            >
              Which semester is this?
            </label>
            <select
              id="semester"
              value={semester ?? ''}
              onChange={(e) => setSemester(e.target.value ? Number(e.target.value) : null)}
              required
              className="font-['IBM_Plex_Sans',sans-serif] text-base font-semibold text-[#1c2331] bg-transparent border-0 border-b-[1.5px] border-[#c9bfa0] py-2 px-0.5 max-w-[220px] focus:outline-none focus:border-[#b8452b] focus:ring-0"
            >
              <option value="" disabled>
                Select semester
              </option>
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Semester {n}
                </option>
              ))}
            </select>
          </section>

          <section className="flex flex-col gap-5">
            {subjects.map((subject, index) => (
              <div
                className="bg-white/50 border border-[#e4dcc5] rounded-md px-6 py-[22px] flex flex-col gap-[18px]"
                key={subject.id}
              >
                <div className="flex items-center justify-between">
                  <span className="font-['IBM_Plex_Mono',monospace] text-xs tracking-[0.1em] text-[#b8452b]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {subjects.length > 1 && (
                    <button
                      type="button"
                      className="font-['IBM_Plex_Mono',monospace] text-[11px] tracking-[0.05em] uppercase text-[#5b6478] bg-transparent border-none cursor-pointer px-1 py-0.5 hover:text-[#b8452b]"
                      onClick={() => removeSubject(subject.id)}
                      aria-label={`Remove ${subject.name || 'this subject'}`}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex gap-4 max-sm:flex-col">
                  <div className="flex-1 min-w-0 flex flex-col gap-[7px]">
                    <label
                      htmlFor={`name-${subject.id}`}
                      className="font-['IBM_Plex_Mono',monospace] text-[11px] tracking-[0.1em] uppercase text-[#5b6478]"
                    >
                      Subject name
                    </label>
                    <input
                      id={`name-${subject.id}`}
                      type="text"
                      placeholder="Data Structures"
                      value={subject.name}
                      onChange={(e) => updateSubject(subject.id, { name: e.target.value })}
                      required
                      className="font-['IBM_Plex_Sans',sans-serif] text-[15px] text-[#1c2331] bg-transparent border-0 border-b-[1.5px] border-[#c9bfa0] py-[9px] px-0.5 focus:outline-none focus:border-[#b8452b] focus:ring-0 placeholder:text-[#b4ac93]"
                    />
                  </div>

                  <div className="flex-none w-[160px] max-sm:w-full flex flex-col gap-[7px]">
                    <label
                      htmlFor={`code-${subject.id}`}
                      className="font-['IBM_Plex_Mono',monospace] text-[11px] tracking-[0.1em] uppercase text-[#5b6478]"
                    >
                      Subject code
                    </label>
                    <input
                      id={`code-${subject.id}`}
                      type="text"
                      placeholder="CS301"
                      value={subject.code}
                      onChange={(e) => updateSubject(subject.id, { code: e.target.value })}
                      required
                      className="font-['IBM_Plex_Sans',sans-serif] text-[15px] text-[#1c2331] bg-transparent border-0 border-b-[1.5px] border-[#c9bfa0] py-[9px] px-0.5 focus:outline-none focus:border-[#b8452b] focus:ring-0 placeholder:text-[#b4ac93]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-[7px]">
                  <label className="font-['IBM_Plex_Mono',monospace] text-[11px] tracking-[0.1em] uppercase text-[#5b6478]">
                    Class days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_DAYS.map((day) => {
                      const active = subject.slots.some((slot) => slot.day === day);
                      return (
                        <button
                          type="button"
                          key={day}
                          className={`font-['IBM_Plex_Mono',monospace] text-xs font-medium rounded-full py-[7px] px-[14px] cursor-pointer transition-all duration-150 ease-in-out border-[1.5px] ${
                            active
                              ? 'bg-[#b8452b] border-[#b8452b] text-[#f6f1e4]'
                              : 'bg-transparent border-[#d6cdaf] text-[#5b6478] hover:border-[#5b6478]'
                          }`}
                          onClick={() => toggleDay(subject.id, day)}
                          aria-pressed={active}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {subject.slots.length > 0 && (
                  <div className="flex flex-col gap-3 p-4 bg-[#4c9a6a]/5 border border-dashed border-[#4c9a6a]/30 rounded-md">
                    {subject.slots.map((slot) => (
                      <div className="flex items-end gap-[14px] max-sm:flex-wrap" key={slot.day}>
                        <span className="font-['IBM_Plex_Mono',monospace] text-xs font-semibold text-[#4c9a6a] w-[36px] shrink-0 pb-[9px]">
                          {slot.day}
                        </span>
                        <div className="flex-none w-[130px] flex flex-col gap-[7px]">
                          <label
                            htmlFor={`start-${subject.id}-${slot.day}`}
                            className="font-['IBM_Plex_Mono',monospace] text-[11px] tracking-[0.1em] uppercase text-[#5b6478]"
                          >
                            Start
                          </label>
                          <input
                            id={`start-${subject.id}-${slot.day}`}
                            type="time"
                            value={slot.startTime}
                            onChange={(e) =>
                              updateSlotTime(subject.id, slot.day, 'startTime', e.target.value)
                            }
                            required
                            className="font-['IBM_Plex_Sans',sans-serif] text-[15px] text-[#1c2331] bg-transparent border-0 border-b-[1.5px] border-[#c9bfa0] py-[9px] px-0.5 focus:outline-none focus:border-[#b8452b] focus:ring-0 placeholder:text-[#b4ac93]"
                          />
                        </div>
                        <div className="flex-none w-[130px] flex flex-col gap-[7px]">
                          <label
                            htmlFor={`end-${subject.id}-${slot.day}`}
                            className="font-['IBM_Plex_Mono',monospace] text-[11px] tracking-[0.1em] uppercase text-[#5b6478]"
                          >
                            End
                          </label>
                          <input
                            id={`end-${subject.id}-${slot.day}`}
                            type="time"
                            value={slot.endTime}
                            onChange={(e) =>
                              updateSlotTime(subject.id, slot.day, 'endTime', e.target.value)
                            }
                            required
                            className="font-['IBM_Plex_Sans',sans-serif] text-[15px] text-[#1c2331] bg-transparent border-0 border-b-[1.5px] border-[#c9bfa0] py-[9px] px-0.5 focus:outline-none focus:border-[#b8452b] focus:ring-0 placeholder:text-[#b4ac93]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              className="font-['IBM_Plex_Mono',monospace] text-[13px] text-[#b8452b] bg-transparent border-[1.5px] border-dashed border-[#c9a68f] rounded-md p-[14px] cursor-pointer transition-colors duration-200 ease-in-out hover:border-[#b8452b] hover:bg-[#b8452b]/5"
              onClick={addSubject}
            >
              + Add another subject
            </button>
          </section>

          {error && (
            <p className="font-['IBM_Plex_Mono',monospace] text-[12.5px] text-[#b8452b] -mt-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="self-start max-sm:self-stretch relative border-2 border-[#b8452b] bg-transparent text-[#b8452b] font-['Zilla_Slab',serif] font-semibold text-base tracking-[0.03em] px-7 py-[15px] rounded-[3px] cursor-pointer overflow-hidden transition-colors duration-250 ease-in-out disabled:opacity-60 disabled:cursor-default before:absolute before:inset-0 before:bg-[#b8452b] before:origin-bottom before:scale-y-0 before:transition-transform before:duration-[280ms] before:ease-[cubic-bezier(0.4,0,0.2,1)] before:z-0 hover:before:scale-y-100 focus-visible:before:scale-y-100 hover:text-[#f6f1e4] focus-visible:text-[#f6f1e4]"
            
          >
            <span className="relative z-10">
              {loading ? 'Building…' : stamped ? 'Ledger opened ✓' : 'Build my tracker & timetable'}
            </span>
          </button>
        </form>
      </main>
    </div>
  );
}
