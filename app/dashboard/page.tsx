'use client';

import { useState } from 'react';
import TodaysClasses from '@/app/components/TodaysClasses';
import AttendanceCalendar from '@/app/components/AttendanceCalendar';
import AttendanceCard from '@/app/components/AttendanceCard';
import TopBar from '../components/TopBar';

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  return (
  <div>
    <TopBar />

    <main className="min-h-screen p-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1.5fr_2.0fr] gap-6 items-stretch">
        
        <aside className="h-full">
          <TodaysClasses
            date={selectedDate}
            onBackToToday={() => setSelectedDate(undefined)}
          />
        </aside>

        <section className="h-full">
          <AttendanceCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </section>

        <aside className="h-full">
          <AttendanceCard />
        </aside>

      </div>
    </main>
  </div>
);
}