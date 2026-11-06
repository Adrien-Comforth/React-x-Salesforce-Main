import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsyncData } from '../useAsyncData';

describe('useAsyncData', () => {
  it('loads on mount', async () => {
    const fetcher = vi.fn().mockResolvedValue('first');

    const { result } = renderHook(() => useAsyncData(fetcher, []));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe('first'));
    expect(result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('reload() runs the fetcher again and keeps the previous data while loading', async () => {
    let resolveSecond: (value: string) => void = () => {};
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockReturnValueOnce(
        new Promise<string>(resolve => {
          resolveSecond = resolve;
        })
      );

    const { result } = renderHook(() => useAsyncData(fetcher, []));
    await waitFor(() => expect(result.current.data).toBe('first'));

    act(() => result.current.reload());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe('first');
    await act(async () => resolveSecond('second'));
    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reports a failed fetch as an error message', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const fetcher = vi.fn().mockRejectedValue(new Error('Nope'));

    const { result } = renderHook(() => useAsyncData(fetcher, []));

    await waitFor(() => expect(result.current.error).toBe('Nope'));
    expect(result.current.loading).toBe(false);
    consoleError.mockRestore();
  });
});
