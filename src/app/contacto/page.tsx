import type { Metadata } from 'next';
import { ContactSection } from '@/features/contact/components/ContactSection';

export const metadata: Metadata = {
  title: 'Contacta con Nuestra Agencia Gaming',
  description:
    'Contacta con SocialPro. ¿Eres una marca o un creador? Cuéntanos tu proyecto y te respondemos en menos de 24h.',
  alternates: {
    canonical: '/contacto',
  },
};

export default function ContactoPage() {
  return (
    <main>
      <h1 className="sr-only">Contacta con Nuestra Agencia Gaming</h1>
      <ContactSection />
    </main>
  );
}
