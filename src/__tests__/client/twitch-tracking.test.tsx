import { fireEvent, render, screen } from '@testing-library/react';
import { TwitchTrackedLink } from '@/features/twitch/TwitchTrackedLink';
import { trackEvent } from '@/lib/analytics';
import { getConsentSnapshot } from '@/lib/consent/consentStore';

jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/lib/consent/consentStore', () => ({ getConsentSnapshot: jest.fn() }));

describe('Twitch click consent', () => {
  beforeEach(() => jest.clearAllMocks());
  it('records public identifiers only after consent and stops after revocation', () => {
    const consent = { v: 1, ts: 1, analytics: true, marketing: false };
    jest.mocked(getConsentSnapshot).mockReturnValue(null);
    render(<TwitchTrackedLink href="#profile" event="twitch_creator_profile_click" creator="public-slug" placement="roster" pagePath="/agencia-streamers-twitch" language="es">Perfil</TwitchTrackedLink>);
    const link = screen.getByRole('link', { name: 'Perfil' });
    fireEvent.click(link);
    expect(trackEvent).not.toHaveBeenCalled();
    jest.mocked(getConsentSnapshot).mockReturnValue(consent);
    fireEvent.click(link);
    expect(trackEvent).toHaveBeenCalledWith('twitch_creator_profile_click', { creator: 'public-slug', placement: 'roster', page_path: '/agencia-streamers-twitch', language: 'es' });
    jest.mocked(getConsentSnapshot).mockReturnValue({ ...consent, analytics: false });
    fireEvent.click(link);
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });
  it('keeps navigation usable when storage is blocked', () => {
    jest.mocked(getConsentSnapshot).mockImplementation(() => { throw new Error('Storage blocked'); });
    render(<TwitchTrackedLink href="/contact?type=brand&source=twitch-streamers-agency" event="twitch_proposal_click" placement="hero" pagePath="/twitch-streamers-agency" language="en">Proposal</TwitchTrackedLink>);
    const link = screen.getByRole('link', { name: 'Proposal' });
    expect(() => fireEvent.click(link)).not.toThrow();
    expect(link).toHaveAttribute('href', '/contact?type=brand&source=twitch-streamers-agency');
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
