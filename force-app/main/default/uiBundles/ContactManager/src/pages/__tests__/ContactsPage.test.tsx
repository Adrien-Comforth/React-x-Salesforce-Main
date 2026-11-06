import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import ContactsPage from '../ContactsPage';
import {
  ADA,
  GRACE,
  createdResult,
  deletedResult,
  errorResult,
  listResult,
  updatedResult,
} from '../../__tests__/fixtures';
import {
  installMockDataSdk,
  type MockGraphQL,
} from '../../__tests__/mockDataSdk';

vi.mock('@salesforce/platform-sdk', () => ({
  createDataSDK: vi.fn(),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

let graphql: MockGraphQL;
let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
  graphql = installMockDataSdk();
  graphql.query.mockResolvedValue(listResult([ADA, GRACE]));
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
  vi.clearAllMocks();
});

/** The options object passed to the nth sdk.graphql.query call. */
const queryOptions = (call: number) => graphql.query.mock.calls[call][0];

async function renderPage() {
  render(<ContactsPage />);
  await screen.findByRole('button', { name: 'Ada Lovelace' });
}

async function waitUntilIdle() {
  await waitFor(() =>
    expect(screen.queryByText('Refreshing…')).not.toBeInTheDocument()
  );
}

describe('ContactsPage', () => {
  it('shows a loading state, then the contacts', async () => {
    let resolveList: (value: unknown) => void = () => {};
    graphql.query.mockReturnValueOnce(
      new Promise(resolve => {
        resolveList = resolve;
      })
    );
    render(<ContactsPage />);

    expect(await screen.findByText('Loading contacts…')).toBeInTheDocument();
    await act(async () => resolveList(listResult([ADA, GRACE])));

    expect(
      await screen.findByRole('button', { name: 'Ada Lovelace' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Grace Hopper' })
    ).toBeInTheDocument();
    expect(queryOptions(0).variables).toEqual({ namePattern: '%', first: 50 });
    expect(queryOptions(0)).not.toHaveProperty('cacheControl');
  });

  it('shows an empty state when there are no contacts', async () => {
    graphql.query.mockResolvedValue(listResult([]));
    render(<ContactsPage />);

    expect(await screen.findByText('No contacts found.')).toBeInTheDocument();
  });

  it('shows a banner instead of an empty list when the contacts cannot load', async () => {
    graphql.query.mockResolvedValue(errorResult({ message: 'Request failed' }));
    render(<ContactsPage />);

    expect(await screen.findByText("Couldn't load contacts.")).toBeInTheDocument();
    expect(screen.getByText('GraphQL Error: Request failed')).toBeInTheDocument();
    expect(screen.queryByText('No contacts found.')).not.toBeInTheDocument();
  });

  it('searches by name on the server once the user stops typing', async () => {
    const user = userEvent.setup();
    await renderPage();
    graphql.query.mockResolvedValue(listResult([ADA]));

    await user.type(
      screen.getByRole('searchbox', { name: 'Search contacts by name' }),
      'lov'
    );

    await waitFor(() => expect(graphql.query).toHaveBeenCalledTimes(2));
    expect(queryOptions(1).variables).toEqual({
      namePattern: '%lov%',
      first: 50,
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Grace Hopper' })
      ).not.toBeInTheDocument()
    );
    // One query for the whole word, not one per keystroke.
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(graphql.query).toHaveBeenCalledTimes(2);
  });

  it('creates a contact: closes the form, reloads without the cache and confirms', async () => {
    const user = userEvent.setup();
    await renderPage();
    graphql.mutate.mockResolvedValue(createdResult('003NEW', 'Alan Turing'));

    await user.click(screen.getByRole('button', { name: 'New Contact' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Contact' });
    await user.type(within(dialog).getByLabelText('First Name'), 'Alan');
    await user.type(within(dialog).getByLabelText(/Last Name/), 'Turing');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Contact "Alan Turing" was created.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(graphql.query).toHaveBeenCalledTimes(2));
    expect(queryOptions(1).cacheControl).toBe('no-cache');
    await waitUntilIdle();
  });

  it('opens a contact from its row and saves changes with ContactUpdate', async () => {
    const user = userEvent.setup();
    await renderPage();
    graphql.mutate.mockResolvedValue(updatedResult(ADA.id, 'Ada Lovelace'));

    await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Contact' });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Analyst');
    await user.clear(within(dialog).getByLabelText('Title'));
    await user.type(within(dialog).getByLabelText('Title'), 'Countess');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Contact "Ada Lovelace" was saved.')
    ).toBeInTheDocument();
    expect(graphql.mutate.mock.calls[0][0].variables.input.Id).toBe(ADA.id);
    await waitFor(() => expect(graphql.query).toHaveBeenCalledTimes(2));
    expect(queryOptions(1).cacheControl).toBe('no-cache');
    await waitUntilIdle();
  });

  it('deletes a contact from its row after confirmation', async () => {
    const user = userEvent.setup();
    await renderPage();
    graphql.mutate.mockResolvedValue(deletedResult(ADA.id));

    await user.click(screen.getByRole('button', { name: 'Delete Ada Lovelace' }));
    expect(
      screen.queryByRole('dialog', { name: 'Edit Contact' })
    ).not.toBeInTheDocument();
    const dialog = await screen.findByRole('dialog', { name: 'Delete contact' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText('Contact "Ada Lovelace" was deleted.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(graphql.query).toHaveBeenCalledTimes(2));
    expect(queryOptions(1).cacheControl).toBe('no-cache');
    await waitUntilIdle();
  });

  it('deletes from the edit form and closes both dialogs', async () => {
    const user = userEvent.setup();
    await renderPage();
    graphql.mutate.mockResolvedValue(deletedResult(ADA.id));

    await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));
    const form = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(form).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog', {
      name: 'Delete contact',
    });
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText('Contact "Ada Lovelace" was deleted.')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    await waitUntilIdle();
  });

  it('keeps bypassing the cache for later searches once a contact changed', async () => {
    const user = userEvent.setup();
    await renderPage();
    graphql.mutate.mockResolvedValue(deletedResult(ADA.id));

    await user.click(screen.getByRole('button', { name: 'Delete Ada Lovelace' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete contact' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await screen.findByText('Contact "Ada Lovelace" was deleted.');
    await waitFor(() => expect(graphql.query).toHaveBeenCalledTimes(2));
    await waitUntilIdle();

    await user.type(
      screen.getByRole('searchbox', { name: 'Search contacts by name' }),
      'gr'
    );

    await waitFor(() => expect(graphql.query).toHaveBeenCalledTimes(3));
    expect(queryOptions(2).variables.namePattern).toBe('%gr%');
    expect(queryOptions(2).cacheControl).toBe('no-cache');
    await waitUntilIdle();
  });
});
