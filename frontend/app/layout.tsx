import type { Metadata } from 'next';
import { Instrument_Serif, DM_Mono } from 'next/font/google';
import 'boxicons/css/boxicons.min.css';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
});

export const metadata: Metadata = {
  title: 'The Long View',
  description:
    'A public conviction ledger for Nigerian equities. Publish a thesis, lock it, and let the market grade it.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${dmMono.variable}`}>
      <body>
        {/* All client-side state (TanStack Query cache, later Zustand
            stores) is scoped inside this provider tree. The root layout
            itself stays a Server Component. */}
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
