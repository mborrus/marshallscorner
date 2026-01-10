// YearSelector component for triathlon section
// Displays available years as links

import Link from 'next/link';
import styles from './YearSelector.module.css';

interface YearSelectorProps {
  years: string[];
  currentYear?: string;
}

export default function YearSelector({ years, currentYear }: YearSelectorProps) {
  if (years.length === 0) {
    return null;
  }

  return (
    <nav className={styles.selector} aria-label="Year navigation">
      <span className={styles.label}>Years:</span>
      <ul className={styles.list}>
        {years.map((year) => (
          <li key={year}>
            <Link
              href={`/triathlon/${year}`}
              className={`${styles.link} ${year === currentYear ? styles.active : ''}`}
              aria-current={year === currentYear ? 'page' : undefined}
            >
              {year}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
