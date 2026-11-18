// Work page - side projects

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Work',
};

export default function WorkPage() {
  return (
    <div>
      <h1>Work</h1>
      <h2>Side projects</h2>
      <ul>
        <li>
          <Link href="/turkey-trot">Turkey Trot Results Program</Link> &mdash; every year of turkey
          trot results, with runner lookup, rivals, and a place predictor.
        </li>
        <li>
          <Link href="/nyrr">NYRR Team Standings</Link> &mdash; live club points and a promotion
          forecast for Manhattan Track Club.
        </li>
      </ul>
    </div>
  );
}
