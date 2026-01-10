'use client';

// Secret click easter egg - click 5 times to reveal a message

import { useState } from 'react';
import styles from './SecretClick.module.css';

const secrets = [
  "Did you know? This site was built with Next.js!",
  "The year is 1997 and the internet is forever.",
  "You've been surfing the web for 10 minutes. Time for a snack?",
  "Remember when websites had MIDI background music?",
  "This message will self-destruct in 5 seconds... just kidding!",
  "You are the 1337th person to find this secret!",
  "Netscape Navigator was the best browser. Change my mind.",
  "GeoCities lives on in our hearts.",
];

export default function SecretClick() {
  const [clicks, setClicks] = useState(0);
  const [showSecret, setShowSecret] = useState(false);
  const [secretMessage, setSecretMessage] = useState('');

  const handleClick = () => {
    const newClicks = clicks + 1;
    setClicks(newClicks);

    if (newClicks >= 5) {
      const randomSecret = secrets[Math.floor(Math.random() * secrets.length)];
      setSecretMessage(randomSecret);
      setShowSecret(true);
      setClicks(0);

      // Hide after 4 seconds
      setTimeout(() => {
        setShowSecret(false);
      }, 4000);
    }
  };

  return (
    <>
      {/* Clickable secret trigger */}
      <div
        className={styles.secretTrigger}
        onClick={handleClick}
        title={clicks > 0 ? `${5 - clicks} more clicks...` : "What's this?"}
      >
        <span className={styles.icon}>*</span>
      </div>

      {/* Secret message popup */}
      {showSecret && (
        <div className={styles.secretPopup}>
          <div className={styles.popupContent}>
            <span className={styles.sparkle}>✨</span>
            <p>{secretMessage}</p>
            <span className={styles.sparkle}>✨</span>
          </div>
        </div>
      )}
    </>
  );
}
