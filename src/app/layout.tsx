// Root layout - wraps all pages with Header and Footer
// Imports global styles

import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import KonamiCode from '@/components/KonamiCode';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: "Marshall's Corner",
    template: "%s | Marshall's Corner",
  },
  description: "Marshall's personal website",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <KonamiCode />
        <Header />
        <main className="container">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
