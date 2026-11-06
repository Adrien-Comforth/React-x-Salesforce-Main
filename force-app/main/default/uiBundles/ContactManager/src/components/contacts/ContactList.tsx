import type { Contact } from '../../api/contacts';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface ContactListProps {
  contacts: readonly Contact[];
  /** True while the list is loading or reloading. */
  loading: boolean;
  /** The search term the list was filtered with ('' when not searching). */
  searchTerm: string;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export function ContactList({
  contacts,
  loading,
  searchTerm,
  onEdit,
  onDelete,
}: ContactListProps) {
  if (contacts.length === 0) {
    if (loading) {
      return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading contacts…
        </p>
      );
    }
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {searchTerm
          ? `No contacts match "${searchTerm}".`
          : 'No contacts found.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Refreshing…
        </p>
      )}
      <Table aria-label="Contacts">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map(contact => (
            <TableRow
              key={contact.id}
              className="cursor-pointer"
              onClick={() => onEdit(contact)}
            >
              <TableCell className="font-medium">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={event => {
                    event.stopPropagation();
                    onEdit(contact);
                  }}
                >
                  {contact.name || '(no name)'}
                </Button>
              </TableCell>
              <TableCell>{contact.title}</TableCell>
              <TableCell>{contact.email}</TableCell>
              <TableCell>{contact.phone}</TableCell>
              <TableCell>{contact.accountName}</TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  aria-label={`Delete ${contact.name}`}
                  onClick={event => {
                    event.stopPropagation();
                    onDelete(contact);
                  }}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
