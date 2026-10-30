// Display helpers for the NYRR page

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export function formatPct(p: number): string {
  if (p <= 0) return '0%';
  if (p >= 1) return '100%';
  if (p < 0.005) return '<1%';
  if (p > 0.995) return '>99%';
  return `${Math.round(p * 100)}%`;
}

// "2026 New Balance Bronx 10M" -> "Bronx 10M"
export function shortEventName(name: string): string {
  return name
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\s+Presented by.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(NYRR|TCS|New Balance|United Airlines|RBC|Citizens|Percy Sutton)\s+/i, '');
}

// "Nov 1"
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
