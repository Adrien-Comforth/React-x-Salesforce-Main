import { act, render, screen, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import ContactCardPage, {
  NO_RECORD_MESSAGE,
  NOT_A_CONTACT_MESSAGE,
  NOT_FOUND_MESSAGE,
} from '../ContactCardPage';
import {
  ADA,
  contactResult,
  installEmptyViewSdk,
  installMockDataSdk,
  installMockViewSdk,
  type MockGraphQL,
} from '../../__tests__/mockSdk';

vi.mock('@salesforce/platform-sdk', () => ({
  createDataSDK: vi.fn(),
  getViewSDK: vi.fn(),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

let graphql: MockGraphQL;
let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
  graphql = installMockDataSdk();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});

describe('ContactCardPage', () => {
  it('shows the card for the contact the host passes', async () => {
    installMockViewSdk({ recordId: ADA.id });
    graphql.query.mockResolvedValue(contactResult(ADA));

    render(<ContactCardPage />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Analytical Engines')).toBeInTheDocument();
    expect(graphql.query.mock.calls[0][0].variables).toEqual({
      recordId: ADA.id,
    });
  });

  it('reads the contact from the URL when the host passes no props', async () => {
    window.history.replaceState({}, '', `/?recordId=${ADA.id}`);
    installEmptyViewSdk();
    graphql.query.mockResolvedValue(contactResult(ADA));

    render(<ContactCardPage />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('explains how to open the card when there is no record', async () => {
    installEmptyViewSdk();

    render(<ContactCardPage />);

    expect(await screen.findByText(NO_RECORD_MESSAGE)).toBeInTheDocument();
    expect(graphql.query).not.toHaveBeenCalled();
  });

  it('refuses records that are not Contacts, without querying', async () => {
    installMockViewSdk({ recordId: '001000000000001AAA' });

    render(<ContactCardPage />);

    expect(await screen.findByText(NOT_A_CONTACT_MESSAGE)).toBeInTheDocument();
    expect(graphql.query).not.toHaveBeenCalled();
  });

  it('says so when the contact is missing or not visible', async () => {
    installMockViewSdk({ recordId: ADA.id });
    graphql.query.mockResolvedValue(contactResult(null));

    render(<ContactCardPage />);

    expect(await screen.findByText(NOT_FOUND_MESSAGE)).toBeInTheDocument();
  });

  it('shows the error when the contact cannot be loaded', async () => {
    installMockViewSdk({ recordId: ADA.id });
    graphql.query.mockResolvedValue({
      data: undefined,
      errors: [{ message: 'Insufficient access' }],
    });

    render(<ContactCardPage />);

    expect(
      await screen.findByText("Couldn't load this contact.")
    ).toBeInTheDocument();
    expect(
      screen.getByText('GraphQL Error: Insufficient access')
    ).toBeInTheDocument();
  });

  it('loads the new contact when the host switches records', async () => {
    const view = installMockViewSdk({ recordId: ADA.id });
    graphql.query
      .mockResolvedValueOnce(contactResult(ADA))
      .mockResolvedValueOnce(
        contactResult({ ...ADA, id: '003000000000002AAA', name: 'Grace Hopper' })
      );
    render(<ContactCardPage />);
    await screen.findByText('Ada Lovelace');

    act(() => view.push({ recordId: '003000000000002AAA' }));

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    await waitFor(() =>
      expect(graphql.query.mock.calls[1][0].variables).toEqual({
        recordId: '003000000000002AAA',
      })
    );
  });
});
