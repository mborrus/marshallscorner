import type { Metadata } from 'next';
import styles from '../page.module.css';

export const metadata: Metadata = { title: 'Training', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className={styles.page}>
      <h1>Training</h1>
      <form method="post" action="/api/training/login" className={`win98-box ${styles.login}`}>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" autoFocus required />
        <button type="submit">Log in</button>
        {!process.env.TRAINING_PASSWORD && <p className={styles.warn}>TRAINING_PASSWORD isn&apos;t set on the server.</p>}
        {error && <p className={styles.warn}>Wrong password.</p>}
      </form>
    </div>
  );
}
