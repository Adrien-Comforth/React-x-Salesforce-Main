import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchContactCard, isContactId } from '../contactCard';
import { GraphQLRequestError } from '../graphqlClient';
import {
  ADA,
  contactResult,
  installMockDataSdk,
  installSdkWithoutGraphQL,
  type MockGraphQL,
} from '../../__tests__/mockSdk';

vi.mock('@salesforce/platform-sdk', () => ({
  createDataSDK: vi.fn(),
  getViewSDK: vi.fn(),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

let graphql: MockGraphQL;

beforeEach(() => {
  graphql = installMockDataSdk();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('isContactId', () => {
  it('accepts 15- and 18-character Contact Ids', () => {
    expect(isContactId('003000000000001')).toBe(true);
    expect(isContactId('003000000000001AAA')).toBe(true);
  });

  it('rejects other objects, malformed values and non-strings', () => {
    expect(isContactId('001000000000001AAA')).toBe(false);
    expect(isContactId('003123')).toBe(false);
    expect(isContactId('003000000000001AA!')).toBe(false);
    expect(isContactId(null)).toBe(false);
    expect(isContactId(42)).toBe(false);
  });
});

describe('fetchContactCard', () => {
  it('queries the Contact by Id and maps its fields', async () => {
    graphql.query.mockResolvedValue(contactResult(ADA));

    const contact = await fetchContactCard(ADA.id);

    const [options] = graphql.query.mock.calls[0];
    expect(options.variables).toEqual({ recordId: ADA.id });
    expect(options.query).toContain('where: { Id: { eq: $recordId } }');
    expect(contact).toEqual(ADA);
  });

  it('maps missing values to empty strings', async () => {
    graphql.query.mockResolvedValue({
      data: {
        uiapi: { query: { Contact: { edges: [{ node: { Id: ADA.id } }] } } },
      },
    });

    expect(await fetchContactCard(ADA.id)).toEqual({
      id: ADA.id,
      name: '',
      title: '',
      email: '',
      phone: '',
      accountName: '',
    });
  });

  it('returns null when the Contact is missing or not visible', async () => {
    graphql.query.mockResolvedValue(contactResult(null));

    expect(await fetchContactCard(ADA.id)).toBeNull();
  });

  it('throws the GraphQL errors as a GraphQLRequestError', async () => {
    graphql.query.mockResolvedValue({
      data: undefined,
      errors: [{ message: 'Insufficient access' }],
    });

    const failure = await fetchContactCard(ADA.id).catch(
      (error: unknown) => error
    );

    expect(failure).toBeInstanceOf(GraphQLRequestError);
    expect((failure as Error).message).toBe('GraphQL Error: Insufficient access');
  });

  it('fails clearly when the SDK has no GraphQL support', async () => {
    installSdkWithoutGraphQL();

    await expect(fetchContactCard(ADA.id)).rejects.toThrow(
      'GraphQL data access is not available in this environment.'
    );
  });
});
