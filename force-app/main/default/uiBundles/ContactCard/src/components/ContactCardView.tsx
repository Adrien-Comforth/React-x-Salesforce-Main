import type { ContactCardData } from '../api/contactCard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';

const EMPTY = '—';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : (parts[0]?.slice(0, 2) ?? '');
  return letters.toUpperCase() || '?';
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value || EMPTY}</dd>
    </div>
  );
}

/** Read-only card for one Contact. */
export function ContactCardView({ contact }: { contact: ContactCardData }) {
  return (
    <Card size="sm" aria-label={`Contact: ${contact.name}`}>
      <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-3">
        <div
          aria-hidden="true"
          className="row-span-2 flex size-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700"
        >
          {initials(contact.name)}
        </div>
        <CardTitle className="truncate">
          {contact.name || 'Unnamed contact'}
        </CardTitle>
        <CardDescription>{contact.title || EMPTY}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <Detail label="Account" value={contact.accountName} />
          <Detail label="Email" value={contact.email} />
          <Detail label="Phone" value={contact.phone} />
        </dl>
      </CardContent>
    </Card>
  );
}
