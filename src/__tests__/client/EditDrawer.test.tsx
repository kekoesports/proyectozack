import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditDrawer } from '@/components/admin/ui/EditDrawer';

// Mock motion/react and motion/react-client to avoid animation issues in tests
jest.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('motion/react-client', () => ({
  div: ({ children, onClick, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
    <div onClick={onClick} {...rest}>
      {children}
    </div>
  ),
}));

// Mock lucide-react X icon
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
}));

function renderDrawer(
  props: Partial<React.ComponentProps<typeof EditDrawer>> = {},
) {
  const defaults = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Edit Item',
    children: (
      <form>
        <input data-testid="input-name" placeholder="Name" />
        <button type="submit" data-testid="btn-submit">
          Save
        </button>
      </form>
    ),
  };
  return render(<EditDrawer {...defaults} {...props} />);
}

describe('EditDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders panel with aria-modal="true" when isOpen=true', () => {
    renderDrawer({ isOpen: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('does not render panel when isOpen=false', () => {
    renderDrawer({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title in header', () => {
    renderDrawer({ title: 'My Drawer Title' });
    expect(screen.getByText('My Drawer Title')).toBeInTheDocument();
  });

  it('calls onClose when ESC key is pressed', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderDrawer({ onClose });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderDrawer({ onClose });
    // The backdrop is the first div with aria-hidden="true"
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(backdrop).not.toBeNull();
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the panel', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderDrawer({ onClose });
    const input = screen.getByTestId('input-name');
    await user.click(input);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('aria-modal="true" is present when isOpen=true', () => {
    renderDrawer({ isOpen: true });
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('renders footer when footer prop is provided', () => {
    renderDrawer({
      footer: <button data-testid="footer-btn">Cancel</button>,
    });
    expect(screen.getByTestId('footer-btn')).toBeInTheDocument();
  });

  it('does not render footer section when footer prop is omitted', () => {
    renderDrawer({ footer: undefined });
    expect(screen.queryByTestId('footer-btn')).not.toBeInTheDocument();
  });

  it('focus trap: Tab on last element wraps to a focusable inside the dialog', async () => {
    const user = userEvent.setup();
    renderDrawer();

    // Focus the submit button (last focusable in our test fixture)
    const submitBtn = screen.getByTestId('btn-submit');
    act(() => submitBtn.focus());
    expect(document.activeElement).toBe(submitBtn);

    await user.tab();
    // After wrapping, focus must remain inside the dialog (any focusable, not body).
    // The exact target varies by jsdom version so we verify containment, not identity.
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('focus trap: Shift+Tab on first element wraps to a focusable inside the dialog', async () => {
    const user = userEvent.setup();
    renderDrawer();

    // Focus the close button (first focusable)
    const closeBtn = screen.getByRole('button', { name: /cerrar/i });
    act(() => closeBtn.focus());
    expect(document.activeElement).toBe(closeBtn);

    await user.tab({ shift: true });
    // Focus should remain inside the dialog after wrapping.
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('restore focus: focus returns to previously focused element on close', () => {
    // Create an element outside the drawer that has focus before opening
    const triggerBtn = document.createElement('button');
    triggerBtn.textContent = 'Open Drawer';
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const { rerender } = renderDrawer({ isOpen: true });

    // Close the drawer
    rerender(
      <EditDrawer isOpen={false} onClose={jest.fn()} title="Edit Item">
        <input data-testid="input-name" placeholder="Name" />
        <button type="submit" data-testid="btn-submit">Save</button>
      </EditDrawer>,
    );

    // Focus should be restored to the trigger button
    expect(document.activeElement).toBe(triggerBtn);

    document.body.removeChild(triggerBtn);
  });
});
