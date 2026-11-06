import { render, screen, waitFor, within } from '@testing-library/react';
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
import { DeleteContactDialog } from '../DeleteContactDialog';
import { ADA, deletedResult, errorResult } from '../../../__tests__/fixtures';
import {
  installMockDataSdk,
  type MockGraphQL,
} from '../../../__tests__/mockDataSdk';

vi.mock('@salesforce/platform-sdk', () => ({
  createDataSDK: vi.fn(),
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
  vi.clearAllMocks();
});

function renderDialog() {
  const onCancel = vi.fn();
  const onDeleted = vi.fn();
  render(
    <DeleteContactDialog contact={ADA} onCancel={onCancel} onDeleted={onDeleted} />
  );
  return {
    onCancel,
    onDeleted,
    dialog: screen.getByRole('dialog', { name: 'Delete contact' }),
  };
}

describe('DeleteContactDialog', () => {
  it('asks for confirmation, then deletes the contact', async () => {
    const user = userEvent.setup();
    graphql.mutate.mockResolvedValue(deletedResult(ADA.id));
    const { dialog, onDeleted } = renderDialog();

    expect(dialog).toHaveTextContent(
      'Are you sure you want to delete Ada Lovelace?'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(ADA));
    expect(graphql.mutate.mock.calls[0][0].variables).toEqual({
      input: { Id: ADA.id },
    });
  });

  it('does not delete on Cancel', async () => {
    const user = userEvent.setup();
    const { dialog, onCancel } = renderDialog();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
    expect(graphql.mutate).not.toHaveBeenCalled();
  });

  it('shows the server error in the dialog when Salesforce refuses the delete', async () => {
    const user = userEvent.setup();
    const refusal =
      'Your attempt to delete Ada Lovelace could not be completed because it is associated with the following cases.: 00001026';
    graphql.mutate.mockResolvedValue(errorResult({ message: refusal }));
    const { dialog, onDeleted } = renderDialog();

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByText(refusal)).toBeInTheDocument();
    expect(
      within(dialog).getByText("Salesforce couldn't delete this contact.")
    ).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(
      within(dialog).getByRole('button', { name: 'Delete' })
    ).toBeEnabled();
  });
});
