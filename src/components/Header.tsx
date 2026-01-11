// Header component with authentic 90s web style

import Link from 'next/link';
import styles from './Header.module.css';
import VisitorCounter from './VisitorCounter';

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
      {/* Marquee banner - classic 90s */}
      <div className={styles.marquee}>
        <span className={styles.marqueeText}>
          Welcome to my corner of the internet! This site is always under construction. Last updated: January 2025 ~*~*~*~
        </span>
      </div>

      <div className={`container ${styles.headerContent}`}>
        {/* Site title with 90s decoration */}
        <div className={styles.titleArea}>
          <span className={styles.decoration}>~*</span>
          <Link href="/" className={styles.logo}>
            Marshall&apos;s Corner
          </Link>
          <span className={styles.decoration}>*~</span>
        </div>

        <p className={styles.tagline}>My Personal Homepage on the World Wide Web</p>

        <VisitorCounter />

        {/* Navigation */}
        <nav className={styles.nav}>
          <span className={styles.navLabel}>[ Navigate ]</span>
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

      {/* Decorative HR */}
      <div className={styles.divider}>
        <hr />
      </div>
    </header>
  );
}
