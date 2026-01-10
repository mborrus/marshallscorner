// Footer component - authentic 90s web style

import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <hr className={styles.topRule} />

      <div className={styles.content}>
        {/* Webring section */}
        <div className={styles.webring}>
          <span className={styles.webringLabel}>Personal Homepages Webring</span>
          <div className={styles.webringNav}>
            <span className={styles.webringLink}>&lt;&lt; Prev</span>
            <span className={styles.webringDivider}>|</span>
            <span className={styles.webringLink}>Random</span>
            <span className={styles.webringDivider}>|</span>
            <span className={styles.webringLink}>Next &gt;&gt;</span>
          </div>
        </div>

        {/* Links section */}
        <div className={styles.links}>
          <a href="mailto:marshall@example.com" className={styles.link}>
            Email Me
          </a>
          <span className={styles.divider}>|</span>
          <span className={styles.link}>Sign My Guestbook</span>
          <span className={styles.divider}>|</span>
          <span className={styles.link}>View Guestbook</span>
        </div>

        {/* Best viewed badge */}
        <div className={styles.badge}>
          <span>Best viewed with</span>
          <span className={styles.browser}>Netscape Navigator 4.0</span>
          <span>at 800x600</span>
        </div>

        {/* Copyright */}
        <div className={styles.copyright}>
          <p>&copy; 1997-2025 Marshall. All rights reserved.</p>
          <p className={styles.disclaimer}>
            This site is not affiliated with any company or organization.
          </p>
        </div>

        {/* Made with love */}
        <div className={styles.madeWith}>
          Made with Notepad on Windows 95
        </div>
      </div>
    </footer>
  );
}
