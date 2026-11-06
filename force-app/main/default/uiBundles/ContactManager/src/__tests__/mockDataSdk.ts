/**
 * Installs a mocked Data SDK. Each test file must mock the module first:
 *
 *   vi.mock('@salesforce/platform-sdk', () => ({
 *     createDataSDK: vi.fn(),
 *     gql: (strings: TemplateStringsArray) => strings.join(''),
 *   }));
 */
import { vi, type Mock } from 'vitest';
import { createDataSDK } from '@salesforce/platform-sdk';

export interface MockGraphQL {
  query: Mock;
  mutate: Mock;
}

/** Makes createDataSDK() resolve to an SDK whose graphql.query/mutate are mocks. */
export function installMockDataSdk(): MockGraphQL {
  const graphql: MockGraphQL = { query: vi.fn(), mutate: vi.fn() };
  (createDataSDK as unknown as Mock).mockResolvedValue({ graphql });
  return graphql;
}

/** Makes createDataSDK() resolve to an SDK with no graphql namespace. */
export function installSdkWithoutGraphQL(): void {
  (createDataSDK as unknown as Mock).mockResolvedValue({});
}
