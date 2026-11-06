/**
 * Contact data access through the Data SDK's GraphQL (UI API) endpoint:
 * list/search, create, update and delete.
 *
 * Reads go through the SDK's query cache (300 s by default). After a create,
 * update or delete, callers pass `bypassCache` so the list comes back fresh.
 *
 * A mutation only counts as a success when there are no errors AND Salesforce
 * returned the record it was expected to return. Every other outcome becomes a
 * failure with messages for the UI, and the raw errors are logged to the console.
 */
import { gql } from '@salesforce/platform-sdk';
import { executeGraphQL, GraphQLRequestError } from './graphqlClient';
import {
  parseGraphQLErrors,
  type ContactFormField,
  type FieldErrors,
} from './contactErrors';
import type {
  CreateContactMutation,
  CreateContactMutationVariables,
  DeleteContactMutation,
  DeleteContactMutationVariables,
  SearchContactsQuery,
  SearchContactsQueryVariables,
  UpdateContactMutation,
  UpdateContactMutationVariables,
} from './graphql-operations-types';

/** The list shows at most this many contacts. */
export const CONTACT_LIST_LIMIT = 50;

export const SEARCH_CONTACTS = gql`
  query SearchContacts($namePattern: String!, $first: Int!) {
    uiapi {
      query {
        Contact(
          first: $first
          where: { Name: { like: $namePattern } }
          orderBy: { LastName: { order: ASC } }
        ) {
          edges {
            node {
              Id
              Name @optional {
                value
              }
              FirstName @optional {
                value
              }
              LastName @optional {
                value
              }
              Title @optional {
                value
              }
              Email @optional {
                value
              }
              Phone @optional {
                value
              }
              Account @optional {
                Name @optional {
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const CREATE_CONTACT = gql`
  mutation CreateContact($input: ContactCreateInput!) {
    uiapi {
      ContactCreate(input: $input) {
        Record {
          Id
          Name {
            value
          }
        }
      }
    }
  }
`;

export const UPDATE_CONTACT = gql`
  mutation UpdateContact($input: ContactUpdateInput!) {
    uiapi {
      ContactUpdate(input: $input) {
        success
        Record {
          Id
          Name {
            value
          }
        }
      }
    }
  }
`;

export const DELETE_CONTACT = gql`
  mutation DeleteContact($input: RecordDeleteInput!) {
    uiapi {
      ContactDelete(input: $input) {
        Id
      }
    }
  }
`;

/** A Contact as the UI uses it: every text value is a string ('' when empty). */
export interface Contact {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  accountName: string;
}

/** The form's values, by field API name, exactly as typed. */
export type ContactFormValues = Record<ContactFormField, string>;

export type MutationOutcome =
  | { ok: true; id: string; name: string }
  | { ok: false; fieldErrors: FieldErrors; formErrors: string[] };

// Indexed access rather than the SDK's NodeOfConnection: with codegen's nullable
// edges (`Array<{ node } | null>`), NodeOfConnection resolves to `unknown`.
type ContactConnection = NonNullable<
  SearchContactsQuery['uiapi']['query']['Contact']
>;
type ContactEdge = NonNullable<
  NonNullable<ContactConnection['edges']>[number]
>;
type ContactNode = NonNullable<ContactEdge['node']>;

function toContact(node: ContactNode): Contact {
  return {
    id: node.Id,
    name: node.Name?.value ?? '',
    firstName: node.FirstName?.value ?? '',
    lastName: node.LastName?.value ?? '',
    title: node.Title?.value ?? '',
    email: node.Email?.value ?? '',
    phone: node.Phone?.value ?? '',
    accountName: node.Account?.Name?.value ?? '',
  };
}

export function toFormValues(contact?: Contact | null): ContactFormValues {
  return {
    FirstName: contact?.firstName ?? '',
    LastName: contact?.lastName ?? '',
    Title: contact?.title ?? '',
    Email: contact?.email ?? '',
    Phone: contact?.phone ?? '',
  };
}

/** The `like` pattern for a search term: `%term%`, or `%` (everything) when blank. */
export function namePatternFor(search: string): string {
  const term = search.trim();
  return term === '' ? '%' : `%${term}%`;
}

export async function fetchContacts(
  search: string,
  options: { bypassCache?: boolean } = {}
): Promise<Contact[]> {
  const data = await executeGraphQL<
    SearchContactsQuery,
    SearchContactsQueryVariables
  >(
    SEARCH_CONTACTS,
    { namePattern: namePatternFor(search), first: CONTACT_LIST_LIMIT },
    options.bypassCache ? { cacheControl: 'no-cache' } : undefined
  );

  const edges = data.uiapi.query.Contact?.edges ?? [];
  return edges.flatMap(edge => (edge?.node ? [toContact(edge.node)] : []));
}

/**
 * The record fields to send. Values go to Salesforce exactly as typed: the only
 * change is that an empty field is sent as null, so it is left unset (create) or
 * cleared (update). No format or length checks happen here: Salesforce reports them.
 */
function toRecordFields(values: ContactFormValues) {
  const valueOrNull = (value: string) => (value === '' ? null : value);
  return {
    FirstName: valueOrNull(values.FirstName),
    LastName: values.LastName,
    Title: valueOrNull(values.Title),
    Email: valueOrNull(values.Email),
    Phone: valueOrNull(values.Phone),
  };
}

function displayName(values: ContactFormValues): string {
  return [values.FirstName, values.LastName]
    .map(part => part.trim())
    .filter(Boolean)
    .join(' ');
}

/** What a mutation confirmed, or a message saying why it can't be trusted. */
type Confirmation = { id: string; name: string } | { problem: string };

const UNEXPECTED_FAILURE = 'The request to Salesforce failed.';

async function runMutation(
  operationName: string,
  mutate: () => Promise<Confirmation>
): Promise<MutationOutcome> {
  let confirmation: Confirmation;
  try {
    confirmation = await mutate();
  } catch (error) {
    if (error instanceof GraphQLRequestError && error.kind === 'errors') {
      // Logged in full so the real error shape can be checked in the console.
      console.error(
        `[ContactManager] ${operationName} returned errors:\n${JSON.stringify(error.errors, null, 2)}`
      );
      return { ok: false, ...parseGraphQLErrors(error.errors) };
    }

    const message =
      error instanceof GraphQLRequestError && error.kind === 'no-data'
        ? `Salesforce returned no data for ${operationName}, so the change can't be confirmed.`
        : error instanceof Error && error.message
          ? error.message
          : UNEXPECTED_FAILURE;
    console.error(`[ContactManager] ${operationName} failed:`, error);
    return { ok: false, fieldErrors: {}, formErrors: [message] };
  }

  if ('problem' in confirmation) {
    console.error(`[ContactManager] ${operationName}: ${confirmation.problem}`);
    return { ok: false, fieldErrors: {}, formErrors: [confirmation.problem] };
  }

  return { ok: true, ...confirmation };
}

export function createContact(
  values: ContactFormValues
): Promise<MutationOutcome> {
  return runMutation('ContactCreate', async () => {
    const data = await executeGraphQL<
      CreateContactMutation,
      CreateContactMutationVariables
    >(CREATE_CONTACT, { input: { Contact: toRecordFields(values) } });

    const record = data.uiapi.ContactCreate?.Record;
    if (!record?.Id) {
      return {
        problem:
          'Salesforce did not return the new contact, so the create can’t be confirmed.',
      };
    }
    return { id: record.Id, name: record.Name?.value || displayName(values) };
  });
}

export function updateContact(
  id: string,
  values: ContactFormValues
): Promise<MutationOutcome> {
  return runMutation('ContactUpdate', async () => {
    const data = await executeGraphQL<
      UpdateContactMutation,
      UpdateContactMutationVariables
    >(UPDATE_CONTACT, { input: { Id: id, Contact: toRecordFields(values) } });

    const payload = data.uiapi.ContactUpdate;
    if (payload?.success === false) {
      return { problem: 'Salesforce reported that the update did not succeed.' };
    }
    if (!payload?.Record?.Id) {
      return {
        problem:
          'Salesforce did not return the updated contact, so the update can’t be confirmed.',
      };
    }
    return {
      id: payload.Record.Id,
      name: payload.Record.Name?.value || displayName(values),
    };
  });
}

export function deleteContact(id: string): Promise<MutationOutcome> {
  return runMutation('ContactDelete', async () => {
    const data = await executeGraphQL<
      DeleteContactMutation,
      DeleteContactMutationVariables
    >(DELETE_CONTACT, { input: { Id: id } });

    const deletedId = data.uiapi.ContactDelete?.Id;
    if (!deletedId) {
      return {
        problem:
          'Salesforce did not return the deleted contact’s Id, so the delete can’t be confirmed.',
      };
    }
    return { id: deletedId, name: '' };
  });
}
