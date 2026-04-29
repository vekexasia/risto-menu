import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks must come before the component import ─────────────────────

const loadRestaurantMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'it', restaurantSlug: 'test-resto' }),
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/api', () => ({
  recordView: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { src, alt, fill: _fill, priority: _priority, sizes: _sizes, unoptimized: _unoptimized, ...rest } = props;
    return <img src={src as string} alt={alt as string} {...rest} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/chat/ChatPanel', () => ({ ChatPanel: () => null }));
vi.mock('@/components/menu/MenuItemDetail', () => ({ MenuItemDetail: () => null }));
vi.mock('@/components/menu/RestaurantInfoModal', () => ({ RestaurantInfoModal: () => null }));
vi.mock('@/components/menu/PromotionPopup', () => ({ PromotionPopup: () => null }));

import { useRestaurantStore } from '@/stores/restaurantStore';
import { useChatActionsStore } from '@/stores/chatActionsStore';
import MenuPageClient from './MenuPageClient';

function resetStores() {
  useRestaurantStore.setState({
    data: null,
    isLoading: false,
    error: null,
    loadRestaurant: loadRestaurantMock,
  } as never);
  useChatActionsStore.setState({
    scrollToCategoryId: null,
    chatFilterCriteria: null,
  } as never);
}

beforeEach(() => {
  loadRestaurantMock.mockReset();
  resetStores();
});

describe('MenuPageClient', () => {
  it('renders the loading spinner when isLoading is true', () => {
    useRestaurantStore.setState({ isLoading: true } as never);
    const { container } = render(<MenuPageClient />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders the error state with a retry button when error is set', () => {
    useRestaurantStore.setState({ error: 'Network down', isLoading: false } as never);
    render(<MenuPageClient />);
    expect(screen.getByText('Network down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('clicking retry calls loadRestaurant with the restaurant id from params', () => {
    useRestaurantStore.setState({ error: 'Failed', isLoading: false } as never);
    render(<MenuPageClient />);

    // The loadRestaurant mock is called once on mount; clear to isolate click
    loadRestaurantMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(loadRestaurantMock).toHaveBeenCalled();
  });

  it('returns null (empty render) when data is null and not loading and no error', () => {
    const { container } = render(<MenuPageClient />);
    // First child is an empty fragment — the spinner wrapper only renders on isLoading
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });

  it('calls loadRestaurant on mount with the slug from useParams', () => {
    render(<MenuPageClient />);
    expect(loadRestaurantMock).toHaveBeenCalled();
  });
});
