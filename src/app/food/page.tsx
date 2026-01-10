// Food stub page

import Placeholder from '@/components/Placeholder';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Food',
};

export default function FoodPage() {
  return (
    <div>
      <h1>Food</h1>
      <Placeholder message="implement section" />
    </div>
  );
}
