// SectionCard component for the home page grid
// Links to each of the 6 main sections

import Link from 'next/link';
import styles from './SectionCard.module.css';

interface SectionCardProps {
  title: string;
  href: string;
}

export default function SectionCard({ title, href }: SectionCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
    </Link>
  );
}
