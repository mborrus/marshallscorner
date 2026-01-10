// Footer component - minimal footer with site name

import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <p className={styles.text}>Marshall&apos;s Corner</p>
      </div>
    </footer>
  );
}
