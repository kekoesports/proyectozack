import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { ContactFormEn } from '@/features/contact/components/ContactFormEn';
import { NewsletterPopup } from '@/features/news/components/NewsletterPopup';
import { CreatorApplyForm } from '@/features/contact/components/CreatorApplyForm';

const mockSubmit = jest.fn().mockResolvedValue({ ok: true });
jest.mock('@/lib/trpc/client', () => ({ trpc: {
  contact: { submit: { useMutation: () => ({ mutateAsync: mockSubmit }) } },
  creatorApply: { submit: { useMutation: () => ({ mutateAsync: mockSubmit }) } },
} }));
jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/components/ui/FadeInOnScroll', () => ({ FadeInOnScroll: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('motion/react', () => ({ ...jest.requireActual<Record<string, unknown>>('motion/react'), useInView: () => true, useReducedMotion: () => true, AnimatePresence: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('motion/react-client', () => ({ ...jest.requireActual<Record<string, unknown>>('motion/react-client'), div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

beforeEach(() => { mockSubmit.mockClear(); localStorage.clear(); });

it('keeps creator identity and profile fields separate across both steps and back navigation', async () => {
  render(<CreatorApplyForm />);
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'TEST Creator' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'creator@example.com' } });
  fireEvent.change(screen.getByLabelText('País'), { target: { value: 'España' } });
  fireEvent.change(screen.getByLabelText('Plataforma principal'), { target: { value: 'youtube' } });
  fireEvent.change(screen.getByLabelText('URL de tu canal principal'), { target: { value: 'https://youtube.com/@fixture' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar →' }));
  await screen.findByLabelText('Juego o contenido principal');
  expect(screen.getByLabelText('Juego o contenido principal')).toHaveValue('');
  expect(screen.getByLabelText(/Seguidores aproximados/)).toHaveValue('');
  expect(screen.getByLabelText(/Visualizaciones medias en vídeos largos/)).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Juego o contenido principal'), { target: { value: 'Counter-Strike 2' } });
  fireEvent.click(screen.getByRole('button', { name: '← Volver' }));
  expect(screen.getByLabelText('Nombre')).toHaveValue('TEST Creator');
  expect(screen.getByLabelText('Email')).toHaveValue('creator@example.com');
  fireEvent.click(screen.getByRole('button', { name: 'Continuar →' }));
  await screen.findByLabelText('Juego o contenido principal');
  expect(screen.getByLabelText('Juego o contenido principal')).toHaveValue('Counter-Strike 2');
  fireEvent.click(screen.getByRole('button', { name: 'Enviar mi perfil' }));
  await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
    name: 'TEST Creator', email: 'creator@example.com', country: 'España', contentCategory: 'Counter-Strike 2', followers: '', averageAudience: '',
  })));
});

it.each([
  ['Spanish', ContactSection, 'Nombre *', 'Mensaje *', 'SOY… *'],
  ['English', ContactFormEn, 'Name *', 'Message *', 'I am… *'],
] as const)('%s contact submits after leaving incomplete creator fields', async (_language, Component, name, message, type) => {
  render(<Component />);
  fireEvent.change(screen.getByLabelText(name), { target: { value: 'TEST QA' } });
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'fixture@example.com' } });
  fireEvent.change(screen.getByLabelText(message), { target: { value: 'Isolated form journey verification.' } });
  fireEvent.change(screen.getByLabelText(type), { target: { value: 'talent' } });
  fireEvent.submit(screen.getByLabelText(name).closest('form')!);
  await waitFor(() => expect(screen.getAllByText(/Selecciona tu plataforma|Invalid option|Choose your main platform/).length).toBeGreaterThan(0));
  expect(mockSubmit).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(type), { target: { value: 'other' } });
  fireEvent.submit(screen.getByLabelText(name).closest('form')!);
  await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
  expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: 'other', email: 'fixture@example.com' }));
  expect(mockSubmit.mock.calls[0]?.[0]).not.toHaveProperty('platform');
  expect(mockSubmit.mock.calls[0]?.[0]).not.toHaveProperty('channelUrl');
});

it('newsletter requires consent and forwards the bot trap instead of discarding it', async () => {
  jest.useFakeTimers();
  const originalFetch = global.fetch;
  const fetchMock = jest.fn().mockResolvedValue({ ok: true });
  global.fetch = fetchMock;
  try {
    const { container } = render(<NewsletterPopup />);
    act(() => { jest.advanceTimersByTime(8000); });
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'fixture@example.com' } });
    const form = container.querySelector('form');
    if (!form) throw new Error('Newsletter form missing');
    fireEvent.submit(form);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Debes aceptar recibir el newsletter.')).toBeInTheDocument();
    const consent = screen.getByRole('button', { name: /Acepto recibir el newsletter/ });
    fireEvent.click(consent);
    expect(consent).toHaveAttribute('aria-pressed', 'true');
    const trap = container.querySelector('input[name="website"]');
    if (!trap) throw new Error('Bot trap missing');
    fireEvent.change(trap, { target: { value: 'https://spam.example' } });
    await act(async () => { fireEvent.submit(form); });
    expect(fetchMock).toHaveBeenCalledWith('/api/newsletter/subscribe', expect.objectContaining({
      body: JSON.stringify({ email: 'fixture@example.com', consentNewsletter: true, consentMarketing: false, honeypot: 'https://spam.example' }),
    }));
  } finally { global.fetch = originalFetch; jest.useRealTimers(); }
});
