import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Onest, Inter } from 'next/font/google';

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  weight: ['800'],
  variable: '--font-onest',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Muster',
  description: 'Find your gaming partners',
};

export const viewport: Viewport = {
  themeColor: '#09090b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${onest.variable} ${inter.variable} font-inter bg-zinc-950 text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
