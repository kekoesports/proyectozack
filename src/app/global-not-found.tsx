import type { Metadata } from 'next';
import { inter, barlowCondensed } from '@/lib/fonts';
import NotFound from './not-found';
import './globals.css';

export const metadata: Metadata = {
  title: 'Página no encontrada | SocialPro',
  robots: { index: false, follow: true },
};

// Unmatched URLs bypass the root layout, which needs request headers.
export default function GlobalNotFound(): React.JSX.Element {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${barlowCondensed.variable} bg-sp-off antialiased`}>
        <main><NotFound /></main>
      </body>
    </html>
  );
}
