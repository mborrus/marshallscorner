'use client';

// Syncs from Strava when the page opens (if the last sync is stale) and on "Sync now".

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function SyncControls({ stale, lastSync }: { stale: boolean; lastSync: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function sync(manual: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/training/sync${manual ? '?manual=1' : ''}`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) setError(data.error ?? 'Sync failed');
      else if (!data.skipped) router.refresh();
    } catch {
      setError('Sync failed');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (stale && !started.current) {
      started.current = true;
      sync(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale]);

  return (
    <span>
      <button type="button" onClick={() => sync(true)} disabled={busy}>
        {busy ? 'Syncing…' : 'Sync now'}
      </button>{' '}
      <small>
        {lastSync ? `Last sync ${new Date(lastSync).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : 'Never synced'}
      </small>
      {error && <small style={{ color: '#b00020' }}> · {error}</small>}
    </span>
  );
}
