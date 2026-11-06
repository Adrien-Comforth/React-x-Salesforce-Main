import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { Dialog } from '../../ui/dialog';
import { ContactForm, LAST_NAME_REQUIRED } from '../ContactForm';
import {
  ADA,
  createdResult,
  errorResult,
  updatedResult,
} from '../../../__tests__/fixtures';
import {
  installMockDataSdk,
  type MockGraphQL,
} from '../../../__tests__/mockDataSdk';

vi.mock('@salesforce/platform-sdk', () => ({
  createDataSDK: vi.fn(),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

const BANNER_TITLE = "Salesforce couldn't save this contact.";

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

function renderForm(props: Partial<ComponentProps<typeof ContactForm>> = {}) {
  const handlers = {
    onSaved: vi.fn(),
    onCancel: vi.fn(),
    onDeleteRequest: vi.fn(),
  };
  render(
    <Dialog open>
      <ContactForm contact={null} {...handlers} {...props} />
    </Dialog>
  );
  return handlers;
}

const input = (label: string) => screen.getByLabelText(label);
const lastNameInput = () => screen.getByLabelText(/Last Name/);
const saveButton = () => screen.getByRole('button', { name: 'Save' });

describe('ContactForm', () => {
  it('starts empty in create mode, with no Delete button', () => {
    renderForm();

    expect(
      screen.getByRole('dialog', { name: 'New Contact' })
    ).toBeInTheDocument();
    for (const label of ['First Name', 'Title', 'Email', 'Phone']) {
      expect(input(label)).toHaveValue('');
    }
    expect(lastNameInput()).toHaveValue('');
    expect(
      screen.queryByRole('button', { name: 'Delete' })
    ).not.toBeInTheDocument();
  });

  it('requires Last Name in the browser and sends nothing without it', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(input('First Name'), 'Ada');
    await user.click(saveButton());

    expect(lastNameInput()).toHaveAttribute('aria-invalid', 'true');
    expect(lastNameInput()).toHaveAccessibleDescription(LAST_NAME_REQUIRED);
    expect(graphql.mutate).not.toHaveBeenCalled();
  });

  it('leaves email format and field length checks to Salesforce', async () => {
    const user = userEvent.setup();
    graphql.mutate.mockResolvedValue(createdResult('003NEW', 'Doe'));
    renderForm();

    await user.type(lastNameInput(), 'Doe');
    await user.type(input('Email'), 'not-an-email');
    await user.click(input('Title'));
    await user.paste('x'.repeat(200));
    await user.click(saveButton());

    await waitFor(() => expect(graphql.mutate).toHaveBeenCalledTimes(1));
    const sent = graphql.mutate.mock.calls[0][0].variables.input.Contact;
    expect(sent.Email).toBe('not-an-email');
    expect(sent.Title).toHaveLength(200);
  });

  it('shows a Salesforce error tied to a field under that field, not in the banner', async () => {
    const user = userEvent.setup();
    const rule = 'Phone is required when Title is set.';
    graphql.mutate.mockResolvedValue(
      errorResult({ message: rule, extensions: { fields: ['Phone'] } })
    );
    renderForm();

    await user.type(lastNameInput(), 'Doe');
    await user.type(input('Title'), 'CTO');
    await user.click(saveButton());

    await waitFor(() =>
      expect(input('Phone')).toHaveAttribute('aria-invalid', 'true')
    );
    expect(input('Phone')).toHaveAccessibleDescription(rule);
    expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
  });

  it('shows errors without a field in the banner and keeps what was typed', async () => {
    const user = userEvent.setup();
    const message = 'Email: invalid email address: not-an-email';
    graphql.mutate.mockResolvedValue(errorResult({ message }));
    const { onSaved } = renderForm();

    await user.type(lastNameInput(), 'Doe');
    await user.type(input('Email'), 'not-an-email');
    await user.click(saveButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText(BANNER_TITLE)).toBeInTheDocument();
    expect(lastNameInput()).toHaveValue('Doe');
    expect(input('Email')).toHaveValue('not-an-email');
    expect(saveButton()).toBeEnabled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('never fails silently: no record back means a banner, not a success', async () => {
    const user = userEvent.setup();
    graphql.mutate.mockResolvedValue({
      data: { uiapi: { ContactCreate: { Record: null } } },
    });
    const { onSaved } = renderForm();

    await user.type(lastNameInput(), 'Doe');
    await user.click(saveButton());

    expect(
      await screen.findByText(/did not return the new contact/)
    ).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('creates the contact and reports success', async () => {
    const user = userEvent.setup();
    graphql.mutate.mockResolvedValue(createdResult('003NEW', 'Ada Lovelace'));
    const { onSaved } = renderForm();

    await user.type(input('First Name'), 'Ada');
    await user.type(lastNameInput(), 'Lovelace');
    await user.click(saveButton());

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith({
        mode: 'create',
        name: 'Ada Lovelace',
      })
    );
  });

  it('pre-fills the form in edit mode and saves with ContactUpdate', async () => {
    const user = userEvent.setup();
    graphql.mutate.mockResolvedValue(updatedResult(ADA.id, 'Ada Lovelace'));
    const { onSaved } = renderForm({ contact: ADA });

    expect(
      screen.getByRole('dialog', { name: 'Edit Contact' })
    ).toBeInTheDocument();
    expect(input('First Name')).toHaveValue('Ada');
    expect(lastNameInput()).toHaveValue('Lovelace');
    expect(input('Title')).toHaveValue('Analyst');
    expect(input('Email')).toHaveValue('ada@example.com');
    expect(input('Phone')).toHaveValue('555-0100');

    await user.clear(input('Title'));
    await user.type(input('Title'), 'Countess');
    await user.click(saveButton());

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith({
        mode: 'edit',
        name: 'Ada Lovelace',
      })
    );
    expect(graphql.mutate.mock.calls[0][0].variables.input).toEqual({
      Id: ADA.id,
      Contact: {
        FirstName: 'Ada',
        LastName: 'Lovelace',
        Title: 'Countess',
        Email: 'ada@example.com',
        Phone: '555-0100',
      },
    });
  });

  it('asks the parent to confirm a delete in edit mode', async () => {
    const user = userEvent.setup();
    const { onDeleteRequest } = renderForm({ contact: ADA });

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDeleteRequest).toHaveBeenCalledWith(ADA);
    expect(graphql.mutate).not.toHaveBeenCalled();
  });

  it('cancels without saving', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
    expect(graphql.mutate).not.toHaveBeenCalled();
  });
});
