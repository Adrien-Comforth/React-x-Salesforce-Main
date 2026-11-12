/**
 * Data access for the Contact card: one Contact, by Id, through the Data SDK's
 * GraphQL (UI API) endpoint. Read-only.
 */
import { gql } from '@salesforce/platform-sdk';
import { executeGraphQL } from './graphqlClient';
import type {
  ContactCardQuery,
  ContactCardQueryVariables,
} from './graphql-operations-types';

export const CONTACT_CARD_QUERY = gql`
  query ContactCard($recordId: ID!) {
    uiapi {
      query {
        Contact(where: { Id: { eq: $recordId } }, first: 1) {
          edges {
            node {
              Id
              Name @optional {
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

/** The Contact as the card shows it: every text value is a string ('' when empty). */
export interface ContactCardData {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  accountName: string;
}

// Contact Ids start with the 003 key prefix and are 15 or 18 characters long.
const CONTACT_ID = /^003[a-zA-Z0-9]{12}(?:[a-zA-Z0-9]{3})?$/;

export function isContactId(value: unknown): value is string {
  return typeof value === 'string' && CONTACT_ID.test(value);
}

/** The Contact, or null when it doesn't exist or the user can't see it. */
export async function fetchContactCard(
  recordId: string
): Promise<ContactCardData | null> {
  const data = await executeGraphQL<
    ContactCardQuery,
    ContactCardQueryVariables
  >(CONTACT_CARD_QUERY, { recordId });

  const node = data.uiapi.query.Contact?.edges?.find(edge => edge?.node)?.node;
  if (!node) {
    return null;
  }

  return {
    id: node.Id,
    name: node.Name?.value ?? '',
    title: node.Title?.value ?? '',
    email: node.Email?.value ?? '',
    phone: node.Phone?.value ?? '',
    accountName: node.Account?.Name?.value ?? '',
  };
}
