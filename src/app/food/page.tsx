// Food index page - lists food sections

import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Food',
};

export default function FoodPage() {
  return (
    <div>
      <h1>Food</h1>

      <ul className={styles.sectionList}>
        <li>
          <Link href="/food/pizza" className={styles.sectionLink}>
            Pizza
          </Link>
        </li>
        <li>
          <span className={styles.sectionLink}>
            Bakeries <span className={styles.stub}>[TODO: coming soon]</span>
          </span>
        </li>
      </ul>
    </div>
  );
}
