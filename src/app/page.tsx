// Home page - displays intro from content/home.md and section cards

import { getHomeContent } from '@/lib/content';
import Placeholder from '@/components/Placeholder';
import SectionCard from '@/components/SectionCard';
import SecretClick from '@/components/SecretClick';
import styles from './page.module.css';

const sections = [
  { title: 'Writing', href: '/writing', icon: '✏️' },
  { title: 'Triathlon', href: '/triathlon', icon: '🏊' },
  { title: 'Food', href: '/food', icon: '🍳' },
  { title: 'Work', href: '/work', icon: '💼' },
  { title: 'Art', href: '/art', icon: '🎨' },
];

export default async function HomePage() {
  const homeContent = await getHomeContent();

  return (
    <div>
      {/* Welcome message with 90s flair */}
      <div className={styles.welcome}>
        <span className={styles.welcomeText}>
          * * * Welcome to my homepage! * * *
        </span>
      </div>

      <section className={styles.intro}>
        <div className={styles.sectionHeader}>About Me</div>
        {homeContent ? (
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: homeContent.contentHtml }}
          />
        ) : (
          <Placeholder message="create content/home.md" />
        )}
      </section>

      {/* Decorative divider */}
      <div className={styles.divider}>
        <span>~*~*~*~*~*~</span>
      </div>

      <section className={styles.sections}>
        <div className={styles.sectionHeader}>Site Map</div>
        <div className={styles.grid}>
          {sections.map((section) => (
            <SectionCard
              key={section.href}
              title={section.title}
              href={section.href}
              icon={section.icon}
            />
          ))}
        </div>
      </section>

      {/* Under Construction section - easter egg hint */}
      <div className={styles.underConstruction}>
        <div className={styles.constructionStripe}></div>
        <div className={styles.constructionContent}>
          <span className={styles.constructionIcon}>🚧</span>
          <span>More content coming soon!</span>
          <span className={styles.constructionIcon}>🚧</span>
        </div>
        <div className={styles.constructionStripe}></div>
      </div>

      {/* Secret click easter egg */}
      <SecretClick />

      {/* Hidden message - CSS easter egg */}
      <div className={styles.hiddenSecret} title="You found a secret! Try the Konami code...">
        ?
      </div>
    </div>
  );
}
