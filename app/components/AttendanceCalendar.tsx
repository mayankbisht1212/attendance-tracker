'use client';

import { useEffect, useState, useCallback } from 'react';

interface DayAttendanceSummary {
  date: string; // "YYYY-MM-DD"
  present: number;
  absent: number;
  late: number;
  total: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Monday-first, matching the schema's Weekday enum ordering (MON..SUN).
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// 0 = Monday, 6 = Sunday
function firstWeekdayIndex(year: number, month: number) {
  const jsDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sun
  return (jsDay + 6) % 7;
}

interface CalendarCell {
  day: number | null;
  key: string | null;
  isToday: boolean;
  isFuture: boolean;
}

interface AttendanceCalendarProps {
  /** ISO "YYYY-MM-DD" of the currently selected date, if any. */
  selectedDate?: string;
  /** Called with the ISO date when a day cell is clicked. */
  onSelectDate?: (date: string) => void;
}

export default function AttendanceCalendar({
  selectedDate,
  onSelectDate,
}: AttendanceCalendarProps) {
  const today = new Date();
  const todayKey = dateKey(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());

  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth() + 1); // 1-12
  const [summaries, setSummaries] = useState<Record<string, DayAttendanceSummary>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/calendar?year=${y}&month=${m}`);
      if (!res.ok) throw new Error();
      const json: { days: DayAttendanceSummary[] } = await res.json();
      const map: Record<string, DayAttendanceSummary> = {};
      json.days.forEach((d) => (map[d.date] = d));
      setSummaries(map);
    } catch {
      setSummaries({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(year, month);
  }, [year, month, load]);

  const goPrev = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const total = daysInMonth(year, month);
  const leadingBlanks = firstWeekdayIndex(year, month);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ day: null, key: null, isToday: false, isFuture: false });
  }
  for (let d = 1; d <= total; d++) {
    const key = dateKey(year, month, d);
    cells.push({
      day: d,
      key,
      isToday: key === todayKey,
      isFuture: key > todayKey,
    });
  }
  // Pad to a full last week so the grid doesn't jump around between months.
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, key: null, isToday: false, isFuture: false });
  }

  return (
    <div className="cal-card">
      <div className="cal-head">
        <div>
          <div className="eyebrow">Attendance Ledger</div>
          <h2>
            {MONTH_NAMES[month - 1]} {year}
          </h2>
        </div>
        <div className="cal-nav">
          <button type="button" onClick={goPrev} aria-label="Previous month">
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              setYear(today.getUTCFullYear());
              setMonth(today.getUTCMonth() + 1);
            }}
          >
            Today
          </button>
          <button type="button" onClick={goNext} aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      <div className="weekday-row">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className={`cal-grid ${loading ? 'loading' : ''}`}>
        {cells.map((cell, i) => {
          if (cell.day === null) {
            return <div className="cal-cell blank" key={`blank-${i}`} />;
          }

          const summary = cell.key ? summaries[cell.key] : undefined;
          const hasData = !cell.isFuture && summary && summary.total > 0;
          const isSelected = cell.key !== null && cell.key === selectedDate;

          return (
            <button
              type="button"
              key={cell.key}
              onClick={() => cell.key && onSelectDate?.(cell.key)}
              className={`cal-cell ${cell.isToday ? 'today' : ''} ${
                cell.isFuture ? 'future' : ''
              } ${hasData ? 'has-data' : ''} ${isSelected ? 'selected' : ''}`}
            >
              <span className="day-num">{cell.day}</span>

              {hasData && (
                <>
                  <span className="dot-row">
                    {summary!.present > 0 && <span className="dot dot-present" />}
                    {summary!.late > 0 && <span className="dot dot-late" />}
                    {summary!.absent > 0 && <span className="dot dot-absent" />}
                  </span>

                  <div className="tooltip" role="tooltip">
                    <div className="tooltip-row present">
                      <strong>{summary!.present}</strong> attended
                    </div>
                    {summary!.late > 0 && (
                      <div className="tooltip-row late">
                        <strong>{summary!.late}</strong> late
                      </div>
                    )}
                    <div className="tooltip-row absent">
                      <strong>{summary!.absent}</strong> missed
                    </div>
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="legend">
        <span>
          <i className="dot dot-present" /> Attended
        </span>
        <span>
          <i className="dot dot-late" /> Late
        </span>
        <span>
          <i className="dot dot-absent" /> Missed
        </span>
      </div>

      <style jsx>{`
        .cal-card {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid var(--paper-line, #e4dcc5);
          border-radius: 8px;
          padding: 24px 26px;
          font-family: 'IBM Plex Sans', sans-serif;
          color: var(--ink, #1c2331);
          max-width: 420px;
        }

        .cal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 18px;
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
          font-size: 19px;
          margin: 0;
        }

        .cal-nav {
          display: flex;
          gap: 4px;
        }
        .cal-nav button {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          border: 1px solid #d6cdaf;
          background: transparent;
          color: var(--ink-soft, #5b6478);
          border-radius: 4px;
          padding: 5px 9px;
          cursor: pointer;
        }
        .cal-nav button:hover {
          border-color: var(--ink-soft, #5b6478);
          color: var(--ink, #1c2331);
        }

        .weekday-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: 6px;
        }
        .weekday-row span {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft, #5b6478);
          text-align: center;
        }

        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          transition: opacity 0.15s ease;
        }
        .cal-grid.loading {
          opacity: 0.5;
        }

        .cal-cell {
          position: relative;
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          border-radius: 6px;
          font-size: 13px;
          width: 100%;
          border: 1.5px solid transparent;
          background: transparent;
          padding: 0;
          font-family: inherit;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
        }
        .cal-cell.blank {
          visibility: hidden;
          cursor: default;
        }

        .cal-cell.future .day-num {
          color: #c2bca4;
        }
        .cal-cell.future {
          cursor: pointer;
        }

        .cal-cell.today {
          background: var(--stamp, #b8452b);
        }
        .cal-cell.today .day-num {
          color: #fff;
          font-weight: 700;
        }

        .cal-cell:not(.today):hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .cal-cell.selected:not(.today) {
          border-color: var(--stamp, #b8452b);
          background: rgba(184, 69, 43, 0.08);
        }
        .cal-cell.selected .day-num {
          font-weight: 700;
        }

        .day-num {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 500;
        }

        .dot-row {
          display: flex;
          gap: 3px;
        }
        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          display: inline-block;
        }
        .dot-present {
          background: var(--present, #4c9a6a);
        }
        .dot-late {
          background: #c9a24b;
        }
        .dot-absent {
          background: var(--stamp, #b8452b);
        }
        .cal-cell.today .dot-present,
        .cal-cell.today .dot-late,
        .cal-cell.today .dot-absent {
          background: #fff;
        }

        .tooltip {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          background: var(--ink, #1c2331);
          color: #ede7d6;
          padding: 8px 12px;
          border-radius: 6px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.12s ease, transform 0.12s ease;
          z-index: 5;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
        }
        .tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: var(--ink, #1c2331);
        }

        .cal-cell.has-data:hover .tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .tooltip-row {
          display: flex;
          gap: 4px;
        }
        .tooltip-row.present strong {
          color: var(--present, #4c9a6a);
        }
        .tooltip-row.late strong {
          color: #dcb668;
        }
        .tooltip-row.absent strong {
          color: #e08469;
        }

        .legend {
          display: flex;
          gap: 16px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid var(--paper-line, #e4dcc5);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--ink-soft, #5b6478);
        }
        .legend span {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .legend i.dot {
          width: 6px;
          height: 6px;
        }
      `}</style>
    </div>
  );
}