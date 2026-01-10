// Header component with global navigation
// All nav links are always visible, linking to the 6 main sections

import Link from 'next/link';
import styles from './Header.module.css';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/writing', label: 'Writing' },
  { href: '/triathlon', label: 'Triathlon' },
  { href: '/food', label: 'Food' },
  { href: '/work', label: 'Work' },
  { href: '/art', label: 'Art' },
];

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerContent}`}>
        <Link href="/" className={styles.logo}>
          Marshall&apos;s Corner
        </Link>
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.navLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
