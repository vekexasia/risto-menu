import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBackButtonClose } from './useBackButtonClose';

describe('useBackButtonClose', () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pushes history state when modal opens', () => {
    const onClose = vi.fn();
    renderHook(() => useBackButtonClose(true, onClose));
    expect(pushStateSpy).toHaveBeenCalledWith({ modal: true }, '');
  });

  it('does not push history state when modal is closed', () => {
    const onClose = vi.fn();
    renderHook(() => useBackButtonClose(false, onClose));
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('calls onClose when popstate event fires while modal is open', () => {
    const onClose = vi.fn();
    renderHook(() => useBackButtonClose(true, onClose));

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls window.history.back() when modal transitions from open to closed', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useBackButtonClose(open, onClose),
      { initialProps: { open: true } }
    );

    // Simulate external close (e.g. clicking the X button)
    rerender({ open: false });

    expect(backSpy).toHaveBeenCalled();
  });

  it('does not push history state twice if already open', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useBackButtonClose(open, onClose),
      { initialProps: { open: true } }
    );

    rerender({ open: true });

    // pushState should only have been called once
    expect(pushStateSpy).toHaveBeenCalledTimes(1);
  });

  it('does not call back() when closing a modal that was never opened', () => {
    const onClose = vi.fn();
    renderHook(() => useBackButtonClose(false, onClose));
    expect(backSpy).not.toHaveBeenCalled();
  });
});
