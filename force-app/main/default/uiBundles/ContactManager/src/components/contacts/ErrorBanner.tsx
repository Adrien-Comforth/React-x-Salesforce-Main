import { StatusAlert } from '../alerts/status-alert';

interface ErrorBannerProps {
  /** The messages to show. Nothing renders when the list is empty. */
  messages: readonly string[];
  /** Optional lead-in line above the messages. */
  title?: string;
}

/** Error banner for messages that aren't tied to a form field. */
export function ErrorBanner({ messages, title }: ErrorBannerProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <StatusAlert variant="error">
      {title && <p className="font-medium">{title}</p>}
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul className="list-disc pl-4">
          {messages.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      )}
    </StatusAlert>
  );
}
