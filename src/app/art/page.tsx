// Art stub page

import Placeholder from '@/components/Placeholder';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Art',
};

export default function ArtPage() {
  return (
    <div>
      <h1>Art</h1>
      <Placeholder message="implement section" />
    </div>
  );
}
