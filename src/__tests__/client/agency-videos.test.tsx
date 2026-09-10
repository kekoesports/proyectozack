import { act, fireEvent, render, screen } from '@testing-library/react';
import { AgencyVideoShowcase } from '@/features/marketing-site/components/AgencyVideoShowcase';
import { saveConsent } from '@/lib/consent/consentStore';
import type { AgencyVideo } from '@/lib/schemas/agencyVideo';

let intersect: (ratio: number) => void;
let reduced = false;
class Observer implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0, 0.45];
  constructor(callback: IntersectionObserverCallback) {
    intersect = ratio => {
      const target = document.createElement('div');
      callback([{
        target, time: 0, rootBounds: null, boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(), intersectionRatio: ratio, isIntersecting: ratio > 0,
      }], this);
    };
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() { return []; }
}

const videos: AgencyVideo[] = [
  { id: '7683853921047055648', title: 'Primer vídeo', subtitle: 'Uno', url: 'https://www.tiktok.com/@socialproagency/video/7683853921047055648', thumbnail: null },
  { id: '7682825984642436384', title: 'Segundo vídeo', subtitle: 'Dos', url: 'https://www.tiktok.com/@socialproagency/video/7682825984642436384', thumbnail: null },
];

function allow() {
  act(() => { saveConsent({ analytics: false, marketing: true }); jest.advanceTimersByTime(0); });
}

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  reduced = false;
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  global.IntersectionObserver = Observer;
  window.matchMedia = jest.fn(query => ({
    matches: reduced, media: query, onchange: null,
    addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(),
    removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
  }));
});
afterEach(() => { jest.useRealTimers(); });

test('requires consent and visibility before loading an external player', () => {
  const { container } = render(<AgencyVideoShowcase videos={videos} />);
  act(() => intersect(1));
  expect(container.querySelector('iframe')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Activar vídeos de TikTok' }));
  act(() => jest.advanceTimersByTime(0));
  const src = container.querySelector('iframe')?.src ?? '';
  expect(src).toContain('autoplay=1');
  expect(src).toContain('muted=1');
  expect(JSON.parse(localStorage.getItem('sp-consent-v1') ?? '{}')).toMatchObject({ analytics: false, marketing: true });
});

test('switches the single player and exposes the matching original video', () => {
  allow();
  const { container } = render(<AgencyVideoShowcase videos={videos} />);
  act(() => intersect(1));
  const oldFrame = container.querySelector('iframe');
  fireEvent.click(screen.getByRole('button', { name: 'Ver vídeo: Segundo vídeo' }));
  expect(container.querySelectorAll('iframe')).toHaveLength(1);
  expect(oldFrame?.isConnected).toBe(false);
  expect(container.querySelector('iframe')?.src).toContain(videos[1]?.id);
  expect(screen.getByRole('link', { name: 'Ver en TikTok ↗' })).toHaveAttribute('href', videos[1]?.url);
});

test('unmounts offscreen, when the tab is hidden, and after consent is revoked', () => {
  allow();
  const { container } = render(<AgencyVideoShowcase videos={videos} />);
  act(() => intersect(1));
  expect(container.querySelector('iframe')).not.toBeNull();
  act(() => intersect(0));
  expect(container.querySelector('iframe')).toBeNull();
  act(() => intersect(1));
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  fireEvent(document, new Event('visibilitychange'));
  expect(container.querySelector('iframe')).toBeNull();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  fireEvent(document, new Event('visibilitychange'));
  expect(container.querySelector('iframe')).not.toBeNull();
  act(() => { saveConsent({ analytics: false, marketing: false }); jest.advanceTimersByTime(0); });
  expect(container.querySelector('iframe')).toBeNull();
});

test('respects reduced motion and provides an explicit sound control', () => {
  reduced = true; allow();
  const { container } = render(<AgencyVideoShowcase videos={videos} />);
  act(() => intersect(1));
  expect(container.querySelector('iframe')?.src).toContain('autoplay=0');
  fireEvent.click(screen.getByRole('button', { name: 'Activar sonido' }));
  expect(container.querySelector('iframe')?.src).toContain('muted=0');
  expect(container.querySelector('iframe')?.src).toContain('autoplay=0');
});

test('rejects forged player messages and exposes a fallback for a real player error', () => {
  allow();
  const { container } = render(<AgencyVideoShowcase videos={videos} />);
  act(() => intersect(1));
  const source = container.querySelector('iframe')?.contentWindow ?? null;
  const data = { 'x-tiktok-player': true, type: 'onPlayerError', value: { errorCode: 1001, errorType: 'INVALID_VIDEO' } };
  fireEvent(window, new MessageEvent('message', { origin: 'https://example.com', source, data }));
  expect(container.querySelector('iframe')).not.toBeNull();
  fireEvent(window, new MessageEvent('message', { origin: 'https://www.tiktok.com', source, data }));
  expect(container.querySelector('iframe')).toBeNull();
  expect(screen.getByRole('link', { name: 'Ver vídeo en TikTok ↗' })).toHaveAttribute('href', videos[0]?.url);
});
