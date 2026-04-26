import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterTabs } from '@/components/ui/FilterTabs';

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'youtube', label: 'YouTube' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

describe('FilterTabs', () => {
  it('renders all tab labels', () => {
    render(<FilterTabs instanceId="test" tabs={tabs} active="all" onChange={jest.fn()} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Twitch')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('calls onChange with the correct key when a tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn<void, [TabKey]>();
    render(<FilterTabs instanceId="test" tabs={tabs} active="all" onChange={onChange} />);
    await user.click(screen.getByText('Twitch'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('twitch');
  });

  it('active tab label has text-white class, inactive tab label does not', () => {
    render(<FilterTabs instanceId="test" tabs={tabs} active="twitch" onChange={jest.fn()} />);
    const twitchLabel = screen.getByText('Twitch');
    const allLabel = screen.getByText('All');
    expect(twitchLabel.className).toContain('text-white');
    expect(allLabel.className).not.toContain('text-white');
  });
});
