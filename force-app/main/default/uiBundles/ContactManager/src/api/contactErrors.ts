/**
 * Splits GraphQL errors into field errors (shown inline) and form errors
 * (shown in the banner).
 *
 * What the SDK and schema say about the error shape:
 * - The SDK types an error as `{ message, locations?, path?, extensions? }`.
 *   `extensions` is a free-form record that the SDK passes through from the
 *   server unchanged; the SDK itself only ever sets `extensions.code` to
 *   `"CACHE_MISS"` (for `only-if-cached` queries).
 * - The mutation payload types (`ContactCreatePayload`, `ContactUpdatePayload`,
 *   `RecordDeletePayload`) have no error fields, so every failure arrives in the
 *   top-level `errors` array.
 * - Neither the SDK nor the schema documents a reference to a record field.
 *   `path` points into the response (e.g. `uiapi.ContactCreate`), not at an
 *   input field, so it is not used here.
 *
 * So an error only goes inline when `extensions` carries one of the field
 * shapes Salesforce uses in its REST and UI APIs (not verified for GraphQL):
 * - `fieldErrors: { <ApiName>: [{ message }] }`, also under `output`: UI API style
 * - `fields: ['<ApiName>', ...]`: REST API style
 * - `field: '<ApiName>'`
 * Everything else, including fields that are not on the form, goes to the banner.
 */
import type { GraphQLError } from '@salesforce/platform-sdk';

/** The Contact fields on the form, by API name, in display order. */
export const CONTACT_FORM_FIELDS = [
  'FirstName',
  'LastName',
  'Title',
  'Email',
  'Phone',
] as const;

export type ContactFormField = (typeof CONTACT_FORM_FIELDS)[number];

export type FieldErrors = Partial<Record<ContactFormField, string[]>>;

export interface ParsedErrors {
  /** Messages tied to a form field: shown inline under that field. */
  fieldErrors: FieldErrors;
  /** Messages not tied to a form field: shown in the error banner. */
  formErrors: string[];
}

export const MISSING_ERROR_MESSAGE =
  'Salesforce returned an error without a message.';

type UnknownRecord = Record<string, unknown>;

interface FieldMessage {
  field: string;
  message: string;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

/** A non-blank message from a string or a `{ message }` object, else `fallback`. */
function messageOf(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  const message = asRecord(value)?.message;
  return typeof message === 'string' && message.trim() !== ''
    ? message
    : fallback;
}

function fieldMessagesOf(error: GraphQLError, message: string): FieldMessage[] {
  const extensions = asRecord(error.extensions);
  if (!extensions) {
    return [];
  }

  const found: FieldMessage[] = [];

  const fieldErrors =
    asRecord(extensions.fieldErrors) ??
    asRecord(asRecord(extensions.output)?.fieldErrors);
  if (fieldErrors) {
    for (const [field, entries] of Object.entries(fieldErrors)) {
      for (const entry of Array.isArray(entries) ? entries : [entries]) {
        found.push({ field, message: messageOf(entry, message) });
      }
    }
  }

  if (Array.isArray(extensions.fields)) {
    for (const field of extensions.fields) {
      if (typeof field === 'string') {
        found.push({ field, message });
      }
    }
  }

  if (typeof extensions.field === 'string') {
    found.push({ field: extensions.field, message });
  }

  return found;
}

function toFormField(apiName: string): ContactFormField | undefined {
  const normalized = apiName.trim().toLowerCase();
  return CONTACT_FORM_FIELDS.find(field => field.toLowerCase() === normalized);
}

function addOnce(list: string[], message: string): void {
  if (!list.includes(message)) {
    list.push(message);
  }
}

export function parseGraphQLErrors(
  errors: readonly GraphQLError[]
): ParsedErrors {
  const fieldErrors: FieldErrors = {};
  const formErrors: string[] = [];

  for (const error of errors) {
    const message = messageOf(error?.message, MISSING_ERROR_MESSAGE);
    const fieldMessages = fieldMessagesOf(error, message);

    if (fieldMessages.length === 0) {
      addOnce(formErrors, message);
      continue;
    }

    for (const fieldMessage of fieldMessages) {
      const formField = toFormField(fieldMessage.field);
      if (formField) {
        addOnce((fieldErrors[formField] ??= []), fieldMessage.message);
      } else {
        addOnce(formErrors, fieldMessage.message);
      }
    }
  }

  return { fieldErrors, formErrors };
}

/** Every message in a parsed result, form errors first: for places with no form fields. */
export function allErrorMessages(parsed: ParsedErrors): string[] {
  const messages = [...parsed.formErrors];
  for (const field of CONTACT_FORM_FIELDS) {
    for (const message of parsed.fieldErrors[field] ?? []) {
      addOnce(messages, message);
    }
  }
  return messages;
}
