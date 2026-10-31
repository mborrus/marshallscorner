'use client';

// Men / Women tab switcher for the NYRR page. Remembers the tab in the URL hash.

import { useEffect, useState, type ReactNode } from 'react';
import styles from './page.module.css';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

export default function DivisionTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (tabs.some((t) => t.id === fromHash)) setActive(fromHash);
  }, [tabs]);

  const select = (id: string) => {
    setActive(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <div>
      <div className={styles.tabs} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            className={`${styles.tab} ${t.id === active ? styles.tabActive : ''}`}
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={t.id !== active} className={styles.tabPanel}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
