import type { ReactNode } from 'react';
import { fetchContactCard, isContactId } from '../api/contactCard';
import { StatusAlert } from '../components/alerts/status-alert';
import { ContactCardView } from '../components/ContactCardView';
import { Spinner } from '../components/ui/spinner';
import { useHostRecordId } from '../embedding';
import { useAsyncData } from '../hooks/useAsyncData';

export const NO_RECORD_MESSAGE =
  'Open this card from a Contact record page. To try it on its own, add ?recordId=<Contact Id> to the URL.';
export const NOT_A_CONTACT_MESSAGE = 'This card only works on Contact records.';
export const NOT_FOUND_MESSAGE =
  "This contact doesn't exist, or you don't have access to it.";

function Loading() {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner /> Loading contact…
    </p>
  );
}

export default function ContactCardPage() {
  const { ready, recordId } = useHostRecordId();
  const contactId = isContactId(recordId) ? recordId : null;
  const {
    data: contact,
    loading,
    error,
  } = useAsyncData(
    () =>
      contactId ? fetchContactCard(contactId) : Promise.resolve(null),
    [contactId]
  );

  let content: ReactNode;
  if (!ready) {
    content = <Loading />;
  } else if (!recordId) {
    content = <StatusAlert variant="info">{NO_RECORD_MESSAGE}</StatusAlert>;
  } else if (!contactId) {
    content = <StatusAlert variant="info">{NOT_A_CONTACT_MESSAGE}</StatusAlert>;
  } else if (loading) {
    content = <Loading />;
  } else if (error) {
    content = (
      <StatusAlert variant="error">
        <p className="font-medium">Couldn't load this contact.</p>
        <p>{error}</p>
      </StatusAlert>
    );
  } else if (!contact) {
    content = <StatusAlert variant="info">{NOT_FOUND_MESSAGE}</StatusAlert>;
  } else {
    content = <ContactCardView contact={contact} />;
  }

  return (
    <main className="p-2">
      {content}
    </main>
  );
}
