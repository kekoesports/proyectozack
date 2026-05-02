import type { Metadata } from 'next';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Contacta con Nuestra Agencia Gaming',
  description:
    '¿Buscas streamers para tu campaña gaming o iGaming? Cuéntanos tu proyecto. Respondemos en menos de 24h. Sin compromiso.',
  alternates: {
    canonical: '/contacto',
  },
  openGraph: {
    title: 'Contacta con Nuestra Agencia Gaming | SocialPro',
    description:
      '¿Buscas streamers para tu campaña gaming o iGaming? Cuéntanos tu proyecto. Respondemos en menos de 24h.',
    url: absoluteUrl('/contacto'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contacta con Nuestra Agencia Gaming | SocialPro',
    description:
      '¿Buscas streamers para tu campaña gaming o iGaming? Respondemos en menos de 24h. Sin compromiso.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

export default function ContactoPage() {
  return (
    <div>
      <h1 className="sr-only">Contacta con Nuestra Agencia Gaming</h1>
      <ContactSection />
    </div>
  );
}
