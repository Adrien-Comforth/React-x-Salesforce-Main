/**
 * Host integration for the embedded card (lightning-ui-embedding on a record
 * page), through the shared ViewSDK. Every call is feature-detected: outside an
 * embedding host the ViewSDK is empty and these hooks fall back quietly.
 */
import { useEffect, useState, type RefObject } from 'react';
import { getViewSDK, type UiState } from '@salesforce/platform-sdk';

/** The query parameter the host LWC adds to the app URL. */
export const RECORD_ID_PARAM = 'recordId';

export interface HostRecord {
  /** False until the host's UI state has been read. */
  ready: boolean;
  /** The record Id the host gave the card, or null when it gave none. */
  recordId: string | null;
}

function nonBlank(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function recordIdFromUrl(): string | null {
  return nonBlank(
    new URLSearchParams(window.location.search).get(RECORD_ID_PARAM)
  );
}

/**
 * The record the card is for. A `recordId` in the host's UI-state props wins
 * (and is followed when the host pushes a new one); otherwise the `recordId`
 * query parameter on the app URL, which the contactCardHost LWC sets.
 */
export function useHostRecordId(): HostRecord {
  const [hostRecord, setHostRecord] = useState<HostRecord>({
    ready: false,
    recordId: null,
  });

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const fromUrl = recordIdFromUrl();
    const apply = (state: UiState | undefined) => {
      if (!cancelled) {
        setHostRecord({
          ready: true,
          recordId: nonBlank(state?.props?.recordId) ?? fromUrl,
        });
      }
    };

    getViewSDK()
      .then(view => {
        const uiState = view.getUiState?.();
        apply(uiState?.state);
        if (!cancelled && uiState) {
          unsubscribe = uiState.subscribe(apply);
        }
      })
      .catch((error: unknown) => {
        console.warn('[ContactCard] Host UI state unavailable:', error);
        apply(undefined);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return hostRecord;
}

/** Asks the host to fit the frame to the element's height whenever it changes. */
export function useFitHostHeight(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    let lastHeight = 0;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height === 0 || height === lastHeight) {
        return;
      }
      lastHeight = height;
      getViewSDK()
        .then(view => view.resize?.('', `${height}px`))
        .catch((error: unknown) =>
          console.warn('[ContactCard] Resize request failed:', error)
        );
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
}
