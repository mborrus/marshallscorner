// SectionCard component for the home page grid
// 90s folder/button style cards

import Link from 'next/link';
import styles from './SectionCard.module.css';

interface SectionCardProps {
  title: string;
  href: string;
  icon?: string;
}

export default function SectionCard({ title, href, icon }: SectionCardProps) {
  return (
    <Link href={href} className={styles.card}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.title}>{title}</span>
    </Link>
  );
}
