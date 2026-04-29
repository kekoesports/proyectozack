import type { Metadata } from 'next';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Contacta con Nuestra Agencia Gaming',
  description:
    'Contacta con SocialPro. ¿Eres una marca o un creador? Cuéntanos tu proyecto y te respondemos en menos de 24h.',
  alternates: {
    canonical: '/contacto',
  },
  openGraph: {
    title: 'Contacta con Nuestra Agencia Gaming | SocialPro',
    description:
      'Contacta con SocialPro. ¿Eres una marca o un creador? Cuéntanos tu proyecto y te respondemos en menos de 24h.',
    url: absoluteUrl('/contacto'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contacta con Nuestra Agencia Gaming | SocialPro',
    description:
      '¿Eres una marca o un creador? Cuéntanos tu proyecto y te respondemos en menos de 24h.',
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
