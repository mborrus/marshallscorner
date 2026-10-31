// A probability as a small filled bar with the percentage on top

import { formatPct } from '@/lib/nyrr/format';
import styles from './page.module.css';

export default function ProbBar({ p }: { p: number }) {
  return (
    <span className={styles.probCell}>
      <span className={styles.probBar} style={{ width: `${Math.round(p * 100)}%` }} />
      <span className={styles.probText}>{formatPct(p)}</span>
    </span>
  );
}
