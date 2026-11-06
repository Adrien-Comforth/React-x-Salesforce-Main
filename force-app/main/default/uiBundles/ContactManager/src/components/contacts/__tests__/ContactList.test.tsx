import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ContactList } from '../ContactList';
import { ADA, GRACE } from '../../../__tests__/fixtures';

function renderList(props: Partial<ComponentProps<typeof ContactList>> = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <ContactList
      contacts={[ADA, GRACE]}
      loading={false}
      searchTerm=""
      onEdit={onEdit}
      onDelete={onDelete}
      {...props}
    />
  );
  return { onEdit, onDelete };
}

describe('ContactList', () => {
  it('shows a loading state while the first load runs', () => {
    renderList({ contacts: [], loading: true });

    expect(screen.getByText('Loading contacts…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an empty state', () => {
    renderList({ contacts: [] });

    expect(screen.getByText('No contacts found.')).toBeInTheDocument();
  });

  it('mentions the search term when a search finds nothing', () => {
    renderList({ contacts: [], searchTerm: 'zz' });

    expect(screen.getByText('No contacts match "zz".')).toBeInTheDocument();
  });

  it('shows name, title, email, phone and account name for each contact', () => {
    renderList();

    expect(
      screen.getAllByRole('columnheader').map(header => header.textContent)
    ).toEqual(['Name', 'Title', 'Email', 'Phone', 'Account Name', 'Actions']);
    const row = screen.getByRole('row', { name: /Ada Lovelace/ });
    expect(
      within(row)
        .getAllByRole('cell')
        .map(cell => cell.textContent)
    ).toEqual([
      'Ada Lovelace',
      'Analyst',
      'ada@example.com',
      '555-0100',
      'Analytical Engines',
      'Delete',
    ]);
  });

  it('opens a contact when its row is clicked', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderList();

    await user.click(screen.getByText('Analyst'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(ADA);
  });

  it('opens a contact from its name button, once', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderList();

    await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(GRACE);
  });

  it('asks to delete a contact without opening it', async () => {
    const user = userEvent.setup();
    const { onEdit, onDelete } = renderList();

    await user.click(screen.getByRole('button', { name: 'Delete Ada Lovelace' }));

    expect(onDelete).toHaveBeenCalledWith(ADA);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('keeps the rows visible while reloading', () => {
    renderList({ loading: true });

    expect(screen.getByText('Refreshing…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ada Lovelace' })).toBeInTheDocument();
  });
});
