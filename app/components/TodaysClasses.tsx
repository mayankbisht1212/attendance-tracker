'use client';

import { useEffect, useState, useCallback } from 'react';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

interface DayClassInfo {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  startTime: string;
  endTime: string;
  status: AttendanceStatus | null;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  LATE: 'Late',
  ABSENT: 'Absent',
};

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function formatLabel(iso: string) {
  // Parsed as UTC so the label matches the date key exactly, with no
  // local-timezone drift shifting it to the day before/after.
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

interface TodaysClassesProps {
  /** ISO "YYYY-MM-DD" date to show. Defaults to today if omitted. */
  date?: string;
  /** Called when the person wants to jump back to today (e.g. from the calendar). */
  onBackToToday?: () => void;
}

export default function TodaysClasses({ date, onBackToToday }: TodaysClassesProps) {
  const activeDate = date ?? todayIso();
  const isToday = activeDate === todayIso();

  const [classes, setClasses] = useState<DayClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/day?date=${activeDate}`);
      if (!res.ok) throw new Error();
      const json: { classes: DayClassInfo[] } = await res.json();
      setClasses(json.classes);
      setError('');
    } catch {
      setError('Could not load that day\u2019s classes.');
    } finally {
      setLoading(false);
    }
  }, [activeDate]);

  useEffect(() => {
    load();
  }, [load]);

  const mark = async (subjectId: string, status: AttendanceStatus) => {
    setMarkingId(subjectId);

    // Optimistic update so the button reacts immediately.
    setClasses((prev) =>
      prev.map((c) => (c.subjectId === subjectId ? { ...c, status } : c))
    );

    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, status, date: activeDate }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError('Could not save that — try again.');
      await load(); // roll back to server truth
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="eyebrow">Attendance Ledger</div>
        <h2>{isToday ? "Today's classes" : 'Classes for this day'}</h2>
        <div className="date-row">
          <span className="date-label">{formatLabel(activeDate)}</span>
          {!isToday && onBackToToday && (
            <button type="button" className="today-btn" onClick={onBackToToday}>
              Back to today
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="skeleton-list">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {!loading && error && classes.length === 0 && (
        <div className="error-block">
          <p className="error-text">{error}</p>
          <button type="button" className="retry-btn" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && classes.length === 0 && (
        <p className="empty-text">
          {isToday ? (
            <>
              No classes on your timetable for today. Enjoy the break, or check your{' '}
              <a href="/onboarding">semester setup</a> if that looks wrong.
            </>
          ) : (
            'No classes were scheduled on this day.'
          )}
        </p>
      )}

      {!loading && classes.length > 0 && (
        <div className="class-list">
          {classes.map((cls) => (
            <div className="class-row" key={cls.subjectId}>
              <div className="class-info">
                <span className="class-name">{cls.subjectName}</span>
                <span className="class-meta">
                  {cls.subjectCode} · {cls.startTime}–{cls.endTime}
                </span>
              </div>

              <div className="status-buttons">
                {(['PRESENT', 'LATE', 'ABSENT'] as AttendanceStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={markingId === cls.subjectId}
                    className={`status-btn status-${status.toLowerCase()} ${
                      cls.status === status ? 'active' : ''
                    }`}
                    onClick={() => mark(cls.subjectId, status)}
                  >
                    {STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && classes.length > 0 && <p className="error-text inline">{error}</p>}

      <style jsx>{`
        .card {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid var(--paper-line, #e4dcc5);
          border-radius: 8px;
          padding: 24px 26px;
          font-family: 'IBM Plex Sans', sans-serif;
          color: var(--ink, #1c2331);
          max-width: 480px;
        }

        .card-head {
          margin-bottom: 20px;
        }

        .eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--stamp, #b8452b);
          margin-bottom: 6px;
        }

        h2 {
          font-family: 'Zilla Slab', serif;
          font-weight: 700;
          font-size: 22px;
          margin: 0 0 4px;
        }

        .date-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .date-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--ink-soft, #5b6478);
        }

        .today-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--stamp, #b8452b);
          background: transparent;
          border: 1px solid rgba(184, 69, 43, 0.35);
          border-radius: 20px;
          padding: 4px 10px;
          cursor: pointer;
        }
        .today-btn:hover {
          border-color: var(--stamp, #b8452b);
          background: rgba(184, 69, 43, 0.06);
        }

        .class-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .class-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid var(--paper-line, #e4dcc5);
          border-radius: 6px;
          flex-wrap: wrap;
        }

        .class-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 140px;
        }
        .class-name {
          font-weight: 600;
          font-size: 14.5px;
        }
        .class-meta {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11.5px;
          color: var(--ink-soft, #5b6478);
        }

        .status-buttons {
          display: flex;
          gap: 6px;
        }

        .status-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11.5px;
          font-weight: 500;
          border: 1.5px solid #d6cdaf;
          background: transparent;
          color: var(--ink-soft, #5b6478);
          border-radius: 20px;
          padding: 7px 13px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .status-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .status-btn:hover:not(:disabled) {
          border-color: var(--ink-soft, #5b6478);
        }

        .status-present.active {
          background: var(--present, #4c9a6a);
          border-color: var(--present, #4c9a6a);
          color: #fff;
        }
        .status-late.active {
          background: #c9a24b;
          border-color: #c9a24b;
          color: #fff;
        }
        .status-absent.active {
          background: var(--stamp, #b8452b);
          border-color: var(--stamp, #b8452b);
          color: #fff;
        }

        .empty-text {
          font-size: 14px;
          color: var(--ink-soft, #5b6478);
          line-height: 1.6;
        }
        .empty-text a {
          color: var(--stamp, #b8452b);
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .error-text {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          color: var(--stamp, #b8452b);
        }
        .error-text.inline {
          margin-top: 14px;
        }

        .retry-btn {
          margin-top: 10px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          border: 1px solid var(--stamp, #b8452b);
          color: var(--stamp, #b8452b);
          background: transparent;
          padding: 8px 14px;
          border-radius: 4px;
          cursor: pointer;
        }

        .skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .skeleton-row {
          height: 52px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.06);
        }

        @media (max-width: 420px) {
          .class-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}