import { useState } from 'react';
import { fetchContacts, type Contact } from '../api/contacts';
import { StatusAlert } from '../components/alerts/status-alert';
import {
  ContactForm,
  type ContactSavedResult,
} from '../components/contacts/ContactForm';
import { ContactList } from '../components/contacts/ContactList';
import { DeleteContactDialog } from '../components/contacts/DeleteContactDialog';
import { ErrorBanner } from '../components/contacts/ErrorBanner';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { useAsyncData } from '../hooks/useAsyncData';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export const SEARCH_DEBOUNCE_MS = 300;

type FormState = { mode: 'create' } | { mode: 'edit'; contact: Contact };

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const searchTerm = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  // The SDK caches each search's list for 300 s, and mutations don't clear that
  // cache. After the first create/update/delete, every list read (the reload
  // and any later search) bypasses it so no stale list is shown.
  const [bypassCache, setBypassCache] = useState(false);
  const {
    data: contacts,
    loading,
    error,
    reload,
  } = useAsyncData(
    () => fetchContacts(searchTerm, { bypassCache }),
    [searchTerm]
  );

  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function refreshAfterChange(message: string) {
    setBypassCache(true);
    reload();
    setSuccessMessage(message);
  }

  function openForm(state: FormState) {
    setSuccessMessage(null);
    setFormState(state);
  }

  function requestDelete(contact: Contact) {
    setSuccessMessage(null);
    setDeleteTarget(contact);
  }

  function handleSaved(result: ContactSavedResult) {
    setFormState(null);
    refreshAfterChange(
      result.mode === 'create'
        ? `Contact "${result.name}" was created.`
        : `Contact "${result.name}" was saved.`
    );
  }

  function handleDeleted(contact: Contact) {
    setDeleteTarget(null);
    // The delete may have been started from the edit form: close it too.
    setFormState(null);
    refreshAfterChange(`Contact "${contact.name}" was deleted.`);
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
        <Button type="button" onClick={() => openForm({ mode: 'create' })}>
          New Contact
        </Button>
      </div>

      <StatusAlert variant="success">{successMessage}</StatusAlert>

      <div className="max-w-sm">
        <Input
          type="search"
          aria-label="Search contacts by name"
          placeholder="Search by name…"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </div>

      {error && (
        <ErrorBanner title="Couldn't load contacts." messages={[error]} />
      )}

      {!(error && contacts === null) && (
        <ContactList
          contacts={contacts ?? []}
          loading={loading}
          searchTerm={searchTerm}
          onEdit={contact => openForm({ mode: 'edit', contact })}
          onDelete={requestDelete}
        />
      )}

      <Dialog
        open={formState !== null}
        onOpenChange={open => {
          if (!open) {
            setFormState(null);
          }
        }}
      >
        {formState && (
          <ContactForm
            key={formState.mode === 'edit' ? formState.contact.id : 'new'}
            contact={formState.mode === 'edit' ? formState.contact : null}
            onSaved={handleSaved}
            onCancel={() => setFormState(null)}
            onDeleteRequest={requestDelete}
          />
        )}
      </Dialog>

      <DeleteContactDialog
        contact={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </main>
  );
}
