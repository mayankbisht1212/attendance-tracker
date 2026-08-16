'use client';

import { useEffect, useState, useCallback } from 'react';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

interface TodayClassInfo {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  startTime: string;
  endTime: string;
  status: AttendanceStatus | null;
}

interface SubjectAttendanceStats {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

interface AttendanceDashboardData {
  today: TodayClassInfo[];
  subjects: SubjectAttendanceStats[];
  overall: {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  };
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
};

function percentageTone(pct: number): 'good' | 'warn' | 'bad' {
  if (pct >= 75) return 'good';
  if (pct >= 60) return 'warn';
  return 'bad';
}

const TEXT_TONES = {
  good: 'text-[#4c9a6a]',
  warn: 'text-[#b8862f]',
  bad: 'text-[#b8452b]',
};

const BG_TONES = {
  good: 'bg-[#4c9a6a]',
  warn: 'bg-[#c9a24b]',
  bad: 'bg-[#b8452b]',
};

const getStatusBtnClass = (
  status: AttendanceStatus,
  isActive: boolean,
  isDisabled: boolean
) => {
  const base =
    "font-['IBM_Plex_Mono',monospace] text-[11px] font-medium border-[1.5px] rounded-[20px] px-3 py-1.5 transition-all duration-150";

  if (isActive) {
    if (status === 'PRESENT') {
      return `${base} bg-[#4c9a6a] border-[#4c9a6a] text-white`;
    }

    if (status === 'LATE') {
      return `${base} bg-[#c9a24b] border-[#c9a24b] text-white`;
    }

    if (status === 'ABSENT') {
      return `${base} bg-[#b8452b] border-[#b8452b] text-white`;
    }
  }

  return `${base} bg-transparent border-[#d6cdaf] text-[#5b6478] ${
    isDisabled
      ? 'opacity-50 cursor-default'
      : 'hover:border-[#5b6478] cursor-pointer'
  }`;
};

export default function AttendanceCard() {
  const [data, setData] = useState<AttendanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance');

      if (!res.ok) {
        throw new Error('Could not load attendance.');
      }

      const json: AttendanceDashboardData = await res.json();

      setData(json);
      setError('');
    } catch {
      setError('Could not load your attendance right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mark = async (
    subjectId: string,
    status: AttendanceStatus
  ) => {
    setMarkingId(subjectId);

    // Optimistic update
    setData((prev) =>
      prev
        ? {
            ...prev,
            today: prev.today.map((t) =>
              t.subjectId === subjectId
                ? { ...t, status }
                : t
            ),
          }
        : prev
    );

    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId,
          status,
        }),
      });

      if (!res.ok) {
        throw new Error();
      }

      // Refresh actual totals and percentages
      await load();
    } catch {
      setError('Could not save that — try again.');

      // Roll back to server state
      await load();
    } finally {
      setMarkingId(null);
    }
  };

  // ================= LOADING =================

  if (loading) {
    return (
      <div className="bg-white/50 border border-[#e4dcc5] rounded-lg px-[26px] py-6 font-['IBM_Plex_Sans',sans-serif] text-[#1c2331] w-full flex flex-col gap-2.5">
        <div className="h-5 rounded bg-black/5 w-[90%]" />
        <div className="h-[14px] rounded bg-black/5 w-[60%]" />
        <div className="h-[14px] rounded bg-black/5 w-[60%]" />
      </div>
    );
  }

  // ================= ERROR =================

  if (error && !data) {
    return (
      <div className="bg-white/50 border border-[#e4dcc5] rounded-lg px-[26px] py-6 font-['IBM_Plex_Sans',sans-serif] text-[#1c2331] w-full">
        <p className="font-['IBM_Plex_Mono',monospace] text-[12.5px] text-[#b8452b]">
          {error}
        </p>

        <button
          className="mt-2.5 font-['IBM_Plex_Mono',monospace] text-xs border border-[#b8452b] text-[#b8452b] bg-transparent px-[14px] py-2 rounded cursor-pointer"
          onClick={load}
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const hasSubjects = data.subjects.length > 0;
  const overallTone = percentageTone(data.overall.percentage);

  return (
    <div className="bg-white/50 border border-[#e4dcc5] rounded-lg px-[26px] py-6 font-['IBM_Plex_Sans',sans-serif] text-[#1c2331] h-full w-full flex flex-col">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <div className="font-['IBM_Plex_Mono',monospace] text-[11px] tracking-[0.14em] uppercase text-[#b8452b] mb-1.5">
            Attendance Ledger
          </div>

          <h2 className="font-['Zilla_Slab',serif] font-bold text-[22px] m-0">
            Your attendance
          </h2>
        </div>

        {/* Overall percentage */}

        <div className="flex flex-col items-end leading-[1.1]">
          <span
            className={`font-['Zilla_Slab',serif] font-bold text-[30px] ${TEXT_TONES[overallTone]}`}
          >
            {data.overall.percentage}%
          </span>

          <span className="font-['IBM_Plex_Mono',monospace] text-[10px] tracking-[0.08em] uppercase text-[#5b6478]">
            overall
          </span>
        </div>
      </div>

      {/* =====================================================
          NO SUBJECTS
      ===================================================== */}

      {!hasSubjects && (
        <p className="text-sm text-[#5b6478] leading-[1.6]">
          No subjects yet — finish your{' '}
          <a
            href="/onboarding"
            className="text-[#b8452b] font-semibold underline underline-offset-[3px]"
          >
            semester setup
          </a>{' '}
          to start tracking attendance.
        </p>
      )}

      {hasSubjects && (
        <>
          {/* =================================================
              TODAY'S CLASSES
          ================================================= */}

          {data.today.length > 0 && (
            <section className="mb-[22px] flex-shrink-0">
              <div className="font-['IBM_Plex_Mono',monospace] text-[11px] tracking-[0.1em] uppercase text-[#5b6478] mb-3">
                Today&apos;s classes
              </div>

              <div className="flex flex-col gap-2.5">
                {data.today.map((cls) => (
                  <div
                    className="flex flex-col min-[481px]:flex-row items-start min-[481px]:items-center justify-between gap-3 px-3.5 py-3 bg-white/60 border border-[#e4dcc5] rounded-md"
                    key={cls.subjectId}
                  >
                    {/* Class information */}

                    <div className="flex flex-col gap-0.5 min-w-[140px]">
                      <span className="font-semibold text-sm">
                        {cls.subjectName}
                      </span>

                      <span className="font-['IBM_Plex_Mono',monospace] text-[11px] text-[#5b6478]">
                        {cls.subjectCode} · {cls.startTime}–
                        {cls.endTime}
                      </span>
                    </div>

                    {/* Attendance buttons */}

                    <div className="flex gap-1.5">
                      {(
                        [
                          'PRESENT',
                          'LATE',
                          'ABSENT',
                        ] as AttendanceStatus[]
                      ).map((status) => {
                        const isMarking =
                          markingId === cls.subjectId;

                        return (
                          <button
                            key={status}
                            type="button"
                            disabled={isMarking}
                            className={getStatusBtnClass(
                              status,
                              cls.status === status,
                              isMarking
                            )}
                            onClick={() =>
                              mark(cls.subjectId, status)
                            }
                          >
                            {STATUS_LABEL[status]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =================================================
              BY SUBJECT
          ================================================= */}

          <section className="mb-5">
            <div className="font-['IBM_Plex_Mono',monospace] text-[11px] tracking-[0.1em] uppercase text-[#5b6478] mb-3">
              By subject
            </div>

            {/* Responsive 2-column layout */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {data.subjects.map((s) => {
                const tone = percentageTone(s.percentage);

                return (
                  <div
                    key={s.subjectId}
                    className="rounded-lg border border-[#e4dcc5] bg-white/60 px-4 py-3 transition-all duration-150 hover:bg-white/80 hover:border-[#d6cdaf]"
                  >
                    {/* Subject name + percentage */}

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-[13px] text-[#1c2331]">
                          {s.subjectName}
                        </h3>

                        <span className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#7a8190]">
                          {s.subjectCode}
                        </span>
                      </div>

                      {/* Percentage */}

                      <span
                        className={`flex-shrink-0 font-['Zilla_Slab',serif] text-[22px] font-bold leading-none ${TEXT_TONES[tone]}`}
                      >
                        {s.percentage}%
                      </span>
                    </div>

                    {/* Progress bar */}

                    <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full bg-[#e4dcc5]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${BG_TONES[tone]}`}
                        style={{
                          width: `${Math.min(
                            s.percentage,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    {/* Attendance stats */}

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 font-['IBM_Plex_Mono',monospace] text-[9.5px]">
                      <span className="text-[#5b6478]">
                        <strong className="text-[#1c2331]">
                          {s.total}
                        </strong>{' '}
                        total
                      </span>

                      <span className="text-[#4c9a6a]">
                        <strong className="text-[#1c2331]">
                          {s.present}
                        </strong>{' '}
                        present
                      </span>

                      <span className="text-[#b8452b]">
                        <strong className="text-[#1c2331]">
                          {s.absent}
                        </strong>{' '}
                        absent
                      </span>

                      {s.late > 0 && (
                        <span className="text-[#b8862f]">
                          <strong className="text-[#1c2331]">
                            {s.late}
                          </strong>{' '}
                          late
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =================================================
              OVERALL STATS
          ================================================= */}

          <div className="flex flex-wrap gap-4 pt-4 border-t border-[#e4dcc5] font-['IBM_Plex_Mono',monospace] text-xs text-[#5b6478] mt-auto">
            <span>
              <strong className="text-[#1c2331]">
                {data.overall.total}
              </strong>{' '}
              classes recorded
            </span>

            <span className="text-[#4c9a6a]">
              <strong className="text-[#1c2331]">
                {data.overall.present}
              </strong>{' '}
              present
            </span>

            <span className="text-[#b8452b]">
              <strong className="text-[#1c2331]">
                {data.overall.absent}
              </strong>{' '}
              absent
            </span>

            {data.overall.late > 0 && (
              <span className="text-[#b8862f]">
                <strong className="text-[#1c2331]">
                  {data.overall.late}
                </strong>{' '}
                late
              </span>
            )}
          </div>
        </>
      )}

      {/* =====================================================
          ERROR MESSAGE
      ===================================================== */}

      {error && (
        <p className="font-['IBM_Plex_Mono',monospace] text-[12.5px] text-[#b8452b] mt-[14px]">
          {error}
        </p>
      )}
    </div>
  );
}