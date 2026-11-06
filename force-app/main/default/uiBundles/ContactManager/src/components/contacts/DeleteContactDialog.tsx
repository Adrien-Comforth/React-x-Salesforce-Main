import { useState } from 'react';
import { deleteContact, type Contact } from '../../api/contacts';
import { allErrorMessages } from '../../api/contactErrors';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ErrorBanner } from './ErrorBanner';

interface DeleteContactDialogProps {
  /** The contact to delete. The dialog is open while this is set. */
  contact: Contact | null;
  onCancel: () => void;
  onDeleted: (contact: Contact) => void;
}

/** Confirmation dialog. If Salesforce refuses the delete, its error shows here. */
export function DeleteContactDialog({
  contact,
  onCancel,
  onDeleted,
}: DeleteContactDialogProps) {
  return (
    <Dialog
      open={contact !== null}
      onOpenChange={open => {
        if (!open) {
          onCancel();
        }
      }}
    >
      {contact && (
        <DeleteConfirmation
          key={contact.id}
          contact={contact}
          onCancel={onCancel}
          onDeleted={onDeleted}
        />
      )}
    </Dialog>
  );
}

function DeleteConfirmation({
  contact,
  onCancel,
  onDeleted,
}: {
  contact: Contact;
  onCancel: () => void;
  onDeleted: (contact: Contact) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleConfirm() {
    setDeleting(true);
    setErrors([]);
    const outcome = await deleteContact(contact.id);
    setDeleting(false);
    if (outcome.ok) {
      onDeleted(contact);
      return;
    }
    setErrors(allErrorMessages(outcome));
  }

  // While the delete is in flight, Escape and outside clicks must not close the dialog.
  const blockWhileDeleting = (event: { preventDefault(): void }) => {
    if (deleting) {
      event.preventDefault();
    }
  };

  return (
    <DialogContent
      showCloseButton={!deleting}
      onEscapeKeyDown={blockWhileDeleting}
      onInteractOutside={blockWhileDeleting}
    >
      <DialogHeader>
        <DialogTitle>Delete contact</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete {contact.name || 'this contact'}?
        </DialogDescription>
      </DialogHeader>
      <ErrorBanner
        title="Salesforce couldn't delete this contact."
        messages={errors}
      />
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={deleting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={deleting}
          onClick={handleConfirm}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
