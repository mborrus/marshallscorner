// All-time records - fastest times ever for each discipline

import styles from './CourseRecords.module.css';

interface AllTimeRecordsProps {
  allResults: Array<{
    year: number;
    entries: Array<{
      name_public: string;
      splits_seconds: {
        swim: number | null;
        t1: number | null;
        bike: number | null;
        t2: number | null;
        run: number | null;
      };
      total_seconds: number | null;
      status: string;
    }>;
  }>;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(secs)}`;
  return `${minutes}:${pad(secs)}`;
}

type Discipline = 'swim' | 'bike' | 'run' | 'total';

interface RecordInfo {
  name: string;
  time: number;
  year: number;
}

export default function AllTimeRecords({ allResults }: AllTimeRecordsProps) {
  function findFastest(discipline: Discipline): RecordInfo | null {
    let fastest: RecordInfo | null = null;

    for (const yearData of allResults) {
      for (const entry of yearData.entries) {
        let time: number | null = null;

        if (discipline === 'total') {
          if (entry.status !== 'finished') continue;
          time = entry.total_seconds;
        } else {
          time = entry.splits_seconds[discipline];
        }

        if (time !== null && time > 0 && (fastest === null || time < fastest.time)) {
          fastest = { name: entry.name_public, time, year: yearData.year };
        }
      }
    }

    return fastest;
  }

  const records = [
    { label: 'Swim', icon: '🏊', record: findFastest('swim') },
    { label: 'Bike', icon: '🚴', record: findFastest('bike') },
    { label: 'Run', icon: '🏃', record: findFastest('run') },
    { label: 'Overall', icon: '🏆', record: findFastest('total') },
  ];

  const validRecords = records.filter((r) => r.record !== null);
  if (validRecords.length === 0) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Course Records (All-Time)</h3>
      <div className={styles.grid}>
        {records.map((r) => {
          if (!r.record) return null;
          return (
            <div key={r.label} className={styles.card}>
              <span className={styles.icon}>{r.icon}</span>
              <span className={styles.discipline}>{r.label}</span>
              <span className={styles.time}>{formatTime(r.record.time)}</span>
              <span className={styles.name}>{r.record.name}</span>
              <span className={styles.year}>({r.record.year})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
