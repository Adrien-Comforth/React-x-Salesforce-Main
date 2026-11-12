/**
 * Host integration for the embedded card (lightning-ui-embedding on a record
 * page), through the shared ViewSDK. Every call is feature-detected: outside an
 * embedding host the ViewSDK is empty and this hook falls back quietly.
 *
 * Frame height needs no code here: the embedding bridge (sf-embedding-bridge)
 * already observes document.body and sends its height to the host.
 */
import { useEffect, useState } from 'react';
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
