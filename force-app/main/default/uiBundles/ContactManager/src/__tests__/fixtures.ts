/** Contacts and GraphQL responses for tests, shaped like the real API returns them. */
import type { Contact } from '../api/contacts';

export const ADA: Contact = {
  id: '003000000000001AAA',
  name: 'Ada Lovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  title: 'Analyst',
  email: 'ada@example.com',
  phone: '555-0100',
  accountName: 'Analytical Engines',
};

export const GRACE: Contact = {
  id: '003000000000002AAA',
  name: 'Grace Hopper',
  firstName: 'Grace',
  lastName: 'Hopper',
  title: '',
  email: 'grace@example.com',
  phone: '',
  accountName: '',
};

/** A SearchContacts node, shaped the way the GraphQL API returns it. */
export function toNode(contact: Contact) {
  return {
    Id: contact.id,
    Name: { value: contact.name },
    FirstName: { value: contact.firstName || null },
    LastName: { value: contact.lastName },
    Title: { value: contact.title || null },
    Email: { value: contact.email || null },
    Phone: { value: contact.phone || null },
    Account: contact.accountName
      ? { Name: { value: contact.accountName } }
      : null,
  };
}

/** A successful SearchContacts result from sdk.graphql.query. */
export function listResult(contacts: readonly Contact[]) {
  return {
    data: {
      uiapi: {
        query: {
          Contact: {
            edges: contacts.map(contact => ({ node: toNode(contact) })),
          },
        },
      },
    },
  };
}

export function createdResult(id: string, name: string) {
  return {
    data: {
      uiapi: { ContactCreate: { Record: { Id: id, Name: { value: name } } } },
    },
  };
}

export function updatedResult(id: string, name: string) {
  return {
    data: {
      uiapi: {
        ContactUpdate: {
          success: true,
          Record: { Id: id, Name: { value: name } },
        },
      },
    },
  };
}

export function deletedResult(id: string) {
  return { data: { uiapi: { ContactDelete: { Id: id } } } };
}

export interface ErrorFixture {
  message: string;
  path?: string[];
  extensions?: Record<string, unknown>;
}

/** A failed GraphQL response: errors and no data. */
export function errorResult(...errors: ErrorFixture[]) {
  return { data: undefined, errors };
}
