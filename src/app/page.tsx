// Home page - displays intro from content/home.md and section cards

import { getHomeContent } from '@/lib/content';
import Placeholder from '@/components/Placeholder';
import SectionCard from '@/components/SectionCard';
import styles from './page.module.css';

const sections = [
  { title: 'Writing', href: '/writing' },
  { title: 'Triathlon', href: '/triathlon' },
  { title: 'Food', href: '/food' },
  { title: 'Work', href: '/work' },
  { title: 'Art', href: '/art' },
];

export default async function HomePage() {
  const homeContent = await getHomeContent();

  return (
    <div>
      <section className={styles.intro}>
        {homeContent ? (
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: homeContent.contentHtml }}
          />
        ) : (
          <Placeholder message="create content/home.md" />
        )}
      </section>

      <section className={styles.sections}>
        <div className={styles.grid}>
          {sections.map((section) => (
            <SectionCard
              key={section.href}
              title={section.title}
              href={section.href}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
