'use client';

// Konami Code Easter Egg - up up down down left right left right B A

import { useEffect, useState, useCallback } from 'react';
import styles from './KonamiCode.module.css';

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'KeyB', 'KeyA'
];

export default function KonamiCode() {
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [activated, setActivated] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const newSequence = [...keySequence, event.code].slice(-KONAMI_CODE.length);
    setKeySequence(newSequence);

    // Check if the sequence matches
    if (newSequence.length === KONAMI_CODE.length &&
        newSequence.every((key, index) => key === KONAMI_CODE[index])) {
      setActivated(true);
      setShowMessage(true);

      // Hide message after 5 seconds
      setTimeout(() => {
        setShowMessage(false);
      }, 5000);
    }
  }, [keySequence]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!activated) return null;

  return (
    <>
      {/* Rainbow mode activated - adds class to body */}
      <style jsx global>{`
        body {
          animation: hueRotate 3s linear infinite;
        }
        @keyframes hueRotate {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `}</style>

      {/* Secret message popup */}
      {showMessage && (
        <div className={styles.secretMessage}>
          <div className={styles.messageBox}>
            <div className={styles.titleBar}>
              <span>secret.exe</span>
              <button onClick={() => setShowMessage(false)} className={styles.closeBtn}>X</button>
            </div>
            <div className={styles.messageContent}>
              <p className={styles.congrats}>+30 LIVES!</p>
              <p>You found the secret Konami Code!</p>
              <p className={styles.hint}>The colors are now... different.</p>
              <p className={styles.small}>(refresh to reset)</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
