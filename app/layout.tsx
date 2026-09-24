import type { Metadata } from 'next';
import './globals.css';
import './invite.css';
import './mobile.css';

export const metadata: Metadata = {
  title: 'PairVoice | Get Paid for Voice Work',
  description: 'Join PairVoice for paid voice recording opportunities across languages and accents.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
