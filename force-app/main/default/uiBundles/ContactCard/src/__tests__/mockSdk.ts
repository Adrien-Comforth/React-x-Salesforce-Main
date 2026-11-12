/**
 * A mocked platform SDK for tests. Each test file must mock the module first:
 *
 *   vi.mock('@salesforce/platform-sdk', () => ({
 *     createDataSDK: vi.fn(),
 *     getViewSDK: vi.fn(),
 *     gql: (strings: TemplateStringsArray) => strings.join(''),
 *   }));
 */
import { vi, type Mock } from 'vitest';
import { createDataSDK, getViewSDK } from '@salesforce/platform-sdk';
import type { ContactCardData } from '../api/contactCard';

export interface MockGraphQL {
  query: Mock;
  mutate: Mock;
}

/** Makes createDataSDK() resolve to an SDK whose graphql methods are mocks. */
export function installMockDataSdk(): MockGraphQL {
  const graphql: MockGraphQL = { query: vi.fn(), mutate: vi.fn() };
  (createDataSDK as unknown as Mock).mockResolvedValue({ graphql });
  return graphql;
}

/** Makes createDataSDK() resolve to an SDK with no graphql namespace. */
export function installSdkWithoutGraphQL(): void {
  (createDataSDK as unknown as Mock).mockResolvedValue({});
}

type Props = Record<string, unknown>;
type UiStateHandler = (state: { props: Props; styles: object }) => void;

export interface MockView {
  /** Simulates the host pushing new UI-state props. */
  push: (props: Props) => void;
}

/** Makes getViewSDK() resolve to an embedding ViewSDK with these host props. */
export function installMockViewSdk(props: Props = {}): MockView {
  let handlers: UiStateHandler[] = [];
  const view = {
    getUiState: () => ({
      state: { props, styles: {} },
      subscribe: (handler: UiStateHandler) => {
        handlers.push(handler);
        return () => {
          handlers = handlers.filter(item => item !== handler);
        };
      },
    }),
  };
  (getViewSDK as unknown as Mock).mockResolvedValue(view);
  return {
    push: next => handlers.forEach(handler => handler({ props: next, styles: {} })),
  };
}

/** Outside an embedding host the ViewSDK is a bare {}. */
export function installEmptyViewSdk(): void {
  (getViewSDK as unknown as Mock).mockResolvedValue({});
}

export const ADA: ContactCardData = {
  id: '003000000000001AAA',
  name: 'Ada Lovelace',
  title: 'Analyst',
  email: 'ada@example.com',
  phone: '555-0100',
  accountName: 'Analytical Engines',
};

/** A ContactCard query result from sdk.graphql.query (no contact when null). */
export function contactResult(contact: ContactCardData | null) {
  const edges = contact
    ? [
        {
          node: {
            Id: contact.id,
            Name: { value: contact.name },
            Title: { value: contact.title || null },
            Email: { value: contact.email || null },
            Phone: { value: contact.phone || null },
            Account: contact.accountName
              ? { Name: { value: contact.accountName } }
              : null,
          },
        },
      ]
    : [];
  return { data: { uiapi: { query: { Contact: { edges } } } } };
}
