'use client';

import { useEffect, useState } from 'react';
import styles from './Header.module.css';

export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/visitor-count')
      .then((res) => res.json())
      .then((data) => setCount(data.count))
      .catch(() => setCount(1));
  }, []);

  const formattedCount = count !== null
    ? count.toString().padStart(6, '0')
    : '------';

  return (
    <div className={styles.counter}>
      You are visitor #<span className={styles.counterNum}>{formattedCount}</span>
    </div>
  );
}
