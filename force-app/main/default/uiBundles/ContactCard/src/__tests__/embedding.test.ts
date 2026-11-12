import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFitHostHeight, useHostRecordId } from '../embedding';
import {
  installEmptyViewSdk,
  installMockViewSdk,
} from './mockSdk';

vi.mock('@salesforce/platform-sdk', () => ({
  createDataSDK: vi.fn(),
  getViewSDK: vi.fn(),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

const FROM_PROPS = '003000000000001AAA';
const FROM_URL = '003000000000002AAA';

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useHostRecordId', () => {
  it('uses the recordId from the host props', async () => {
    installMockViewSdk({ recordId: FROM_PROPS });

    const { result } = renderHook(() => useHostRecordId());

    expect(result.current.ready).toBe(false);
    await waitFor(() =>
      expect(result.current).toEqual({ ready: true, recordId: FROM_PROPS })
    );
  });

  it('falls back to the recordId query parameter', async () => {
    window.history.replaceState({}, '', `/app/c__ContactCard?recordId=${FROM_URL}`);
    installMockViewSdk({});

    const { result } = renderHook(() => useHostRecordId());

    await waitFor(() =>
      expect(result.current).toEqual({ ready: true, recordId: FROM_URL })
    );
  });

  it('prefers the host props over the query parameter', async () => {
    window.history.replaceState({}, '', `/?recordId=${FROM_URL}`);
    installMockViewSdk({ recordId: FROM_PROPS });

    const { result } = renderHook(() => useHostRecordId());

    await waitFor(() => expect(result.current.recordId).toBe(FROM_PROPS));
  });

  it('follows a new recordId pushed by the host', async () => {
    const view = installMockViewSdk({ recordId: FROM_PROPS });
    const { result } = renderHook(() => useHostRecordId());
    await waitFor(() => expect(result.current.recordId).toBe(FROM_PROPS));

    act(() => view.push({ recordId: FROM_URL }));

    expect(result.current.recordId).toBe(FROM_URL);
  });

  it('works outside an embedding host, with or without a query parameter', async () => {
    installEmptyViewSdk();
    const { result } = renderHook(() => useHostRecordId());
    await waitFor(() =>
      expect(result.current).toEqual({ ready: true, recordId: null })
    );

    window.history.replaceState({}, '', `/?recordId=${FROM_URL}`);
    const second = renderHook(() => useHostRecordId());
    await waitFor(() => expect(second.result.current.recordId).toBe(FROM_URL));
  });
});

describe('useFitHostHeight', () => {
  it('asks the host to fit the frame to the content height, once per change', async () => {
    const view = installMockViewSdk();
    let notify: () => void = () => {};
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      }
    );
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      height: 120.4,
    } as DOMRect);

    renderHook(() => useFitHostHeight({ current: element }));
    notify();
    notify();

    await waitFor(() => expect(view.resize).toHaveBeenCalledWith('', '121px'));
    expect(view.resize).toHaveBeenCalledTimes(1);
  });
});
