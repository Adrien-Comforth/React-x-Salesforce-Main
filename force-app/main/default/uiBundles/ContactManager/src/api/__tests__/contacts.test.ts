import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import {
  CONTACT_LIST_LIMIT,
  createContact,
  deleteContact,
  fetchContacts,
  namePatternFor,
  updateContact,
  type ContactFormValues,
} from '../contacts';
import { GraphQLRequestError } from '../graphqlClient';
import {
  ADA,
  createdResult,
  deletedResult,
  errorResult,
  listResult,
  updatedResult,
} from '../../__tests__/fixtures';
import {
  installMockDataSdk,
  installSdkWithoutGraphQL,
  type MockGraphQL,
} from '../../__tests__/mockDataSdk';

vi.mock('@salesforce/platform-sdk', () => ({
  createDataSDK: vi.fn(),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

const VALUES: ContactFormValues = {
  FirstName: 'Ada',
  LastName: 'Lovelace',
  Title: '',
  Email: 'not-an-email',
  Phone: '',
};

let graphql: MockGraphQL;
let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
  graphql = installMockDataSdk();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
  vi.clearAllMocks();
});

describe('fetchContacts', () => {
  it('asks for up to 50 contacts, filtered by name with like and sorted by last name', async () => {
    graphql.query.mockResolvedValue(listResult([ADA]));

    const contacts = await fetchContacts('  love ');

    expect(CONTACT_LIST_LIMIT).toBe(50);
    expect(graphql.query).toHaveBeenCalledTimes(1);
    const [options] = graphql.query.mock.calls[0];
    expect(options.variables).toEqual({ namePattern: '%love%', first: 50 });
    expect(options.query).toContain('where: { Name: { like: $namePattern } }');
    expect(options.query).toContain('orderBy: { LastName: { order: ASC } }');
    expect(options).not.toHaveProperty('cacheControl');
    expect(contacts).toEqual([ADA]);
  });

  it('matches every contact when the search is blank', async () => {
    graphql.query.mockResolvedValue(listResult([]));

    await fetchContacts('   ');

    expect(namePatternFor('')).toBe('%');
    expect(graphql.query.mock.calls[0][0].variables.namePattern).toBe('%');
  });

  it('bypasses the SDK cache when asked', async () => {
    graphql.query.mockResolvedValue(listResult([]));

    await fetchContacts('', { bypassCache: true });

    expect(graphql.query.mock.calls[0][0].cacheControl).toBe('no-cache');
  });

  it('maps missing values to empty strings and skips null edges and nodes', async () => {
    graphql.query.mockResolvedValue({
      data: {
        uiapi: {
          query: {
            Contact: {
              edges: [
                null,
                { node: null },
                { node: { Id: '003X', Name: { value: 'Solo' } } },
              ],
            },
          },
        },
      },
    });

    const contacts = await fetchContacts('');

    expect(contacts).toEqual([
      {
        id: '003X',
        name: 'Solo',
        firstName: '',
        lastName: '',
        title: '',
        email: '',
        phone: '',
        accountName: '',
      },
    ]);
  });

  it('throws a GraphQLRequestError that carries the raw errors', async () => {
    graphql.query.mockResolvedValue(errorResult({ message: 'Boom' }));

    const failure = await fetchContacts('').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GraphQLRequestError);
    expect((failure as GraphQLRequestError).message).toBe('GraphQL Error: Boom');
    expect((failure as GraphQLRequestError).errors).toEqual([
      { message: 'Boom' },
    ]);
  });
});

describe('createContact', () => {
  it('sends the values as typed (empty fields as null) and confirms the new record', async () => {
    graphql.mutate.mockResolvedValue(createdResult('003NEW', 'Ada Lovelace'));

    const outcome = await createContact(VALUES);

    expect(graphql.mutate).toHaveBeenCalledWith({
      mutation: expect.stringContaining('ContactCreate(input: $input)'),
      variables: {
        input: {
          Contact: {
            FirstName: 'Ada',
            LastName: 'Lovelace',
            Title: null,
            Email: 'not-an-email',
            Phone: null,
          },
        },
      },
    });
    expect(outcome).toEqual({ ok: true, id: '003NEW', name: 'Ada Lovelace' });
  });

  it('does not check lengths in the browser: a 200-character title is sent as is', async () => {
    graphql.mutate.mockResolvedValue(createdResult('003NEW', 'Ada Lovelace'));
    const title = 'x'.repeat(200);

    await createContact({ ...VALUES, Title: title });

    expect(
      graphql.mutate.mock.calls[0][0].variables.input.Contact.Title
    ).toBe(title);
  });

  it('turns server errors into field and banner messages and logs the raw errors', async () => {
    graphql.mutate.mockResolvedValue(
      errorResult(
        {
          message: 'Phone is required when Title is set.',
          extensions: { fields: ['Phone'] },
        },
        { message: 'Something else went wrong.' }
      )
    );

    const outcome = await createContact(VALUES);

    expect(outcome).toEqual({
      ok: false,
      fieldErrors: { Phone: ['Phone is required when Title is set.'] },
      formErrors: ['Something else went wrong.'],
    });
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('"message": "Phone is required when Title is set."')
    );
  });

  it('is a failure when errors come back together with data', async () => {
    graphql.mutate.mockResolvedValue({
      ...createdResult('003NEW', 'Ada Lovelace'),
      errors: [{ message: 'Partial failure' }],
    });

    const outcome = await createContact(VALUES);

    expect(outcome).toEqual({
      ok: false,
      fieldErrors: {},
      formErrors: ['Partial failure'],
    });
  });

  it('is a failure when no record comes back, even without errors', async () => {
    graphql.mutate.mockResolvedValue({
      data: { uiapi: { ContactCreate: { Record: null } } },
    });

    const outcome = await createContact(VALUES);

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.formErrors[0]).toMatch(
      /did not return the new contact/
    );
  });

  it('is a failure when there is neither data nor errors', async () => {
    graphql.mutate.mockResolvedValue({ data: undefined, errors: [] });

    const outcome = await createContact(VALUES);

    expect(outcome.ok === false && outcome.formErrors[0]).toMatch(
      /returned no data for ContactCreate/
    );
  });

  it('is a failure when the SDK has no GraphQL support', async () => {
    installSdkWithoutGraphQL();

    const outcome = await createContact(VALUES);

    expect(outcome).toEqual({
      ok: false,
      fieldErrors: {},
      formErrors: ['GraphQL data access is not available in this environment.'],
    });
  });

  it('is a failure when the SDK call itself rejects', async () => {
    graphql.mutate.mockRejectedValue(new Error('Network down'));

    const outcome = await createContact(VALUES);

    expect(outcome).toEqual({
      ok: false,
      fieldErrors: {},
      formErrors: ['Network down'],
    });
  });
});

describe('updateContact', () => {
  it('sends the Id with the fields and confirms the updated record', async () => {
    graphql.mutate.mockResolvedValue(updatedResult(ADA.id, 'Ada Lovelace'));

    const outcome = await updateContact(ADA.id, { ...VALUES, Phone: '555' });

    expect(graphql.mutate).toHaveBeenCalledWith({
      mutation: expect.stringContaining('ContactUpdate(input: $input)'),
      variables: {
        input: {
          Id: ADA.id,
          Contact: {
            FirstName: 'Ada',
            LastName: 'Lovelace',
            Title: null,
            Email: 'not-an-email',
            Phone: '555',
          },
        },
      },
    });
    expect(outcome).toEqual({ ok: true, id: ADA.id, name: 'Ada Lovelace' });
  });

  it('is a failure when Salesforce reports success: false', async () => {
    graphql.mutate.mockResolvedValue({
      data: {
        uiapi: {
          ContactUpdate: {
            success: false,
            Record: { Id: ADA.id, Name: { value: 'Ada Lovelace' } },
          },
        },
      },
    });

    const outcome = await updateContact(ADA.id, VALUES);

    expect(outcome.ok === false && outcome.formErrors[0]).toMatch(
      /did not succeed/
    );
  });

  it('is a failure when no record comes back', async () => {
    graphql.mutate.mockResolvedValue({
      data: { uiapi: { ContactUpdate: { success: true, Record: null } } },
    });

    const outcome = await updateContact(ADA.id, VALUES);

    expect(outcome.ok === false && outcome.formErrors[0]).toMatch(
      /did not return the updated contact/
    );
  });
});

describe('deleteContact', () => {
  it('sends the Id and confirms the deleted Id', async () => {
    graphql.mutate.mockResolvedValue(deletedResult(ADA.id));

    const outcome = await deleteContact(ADA.id);

    expect(graphql.mutate).toHaveBeenCalledWith({
      mutation: expect.stringContaining('ContactDelete(input: $input)'),
      variables: { input: { Id: ADA.id } },
    });
    expect(outcome).toEqual({ ok: true, id: ADA.id, name: '' });
  });

  it('returns the server error when Salesforce refuses the delete', async () => {
    const refusal =
      'Your attempt to delete Ada Lovelace could not be completed because it is associated with the following cases.: 00001026';
    graphql.mutate.mockResolvedValue(errorResult({ message: refusal }));

    const outcome = await deleteContact(ADA.id);

    expect(outcome).toEqual({ ok: false, fieldErrors: {}, formErrors: [refusal] });
  });

  it('is a failure when the deleted Id is missing', async () => {
    graphql.mutate.mockResolvedValue({
      data: { uiapi: { ContactDelete: { Id: null } } },
    });

    const outcome = await deleteContact(ADA.id);

    expect(outcome.ok === false && outcome.formErrors[0]).toMatch(
      /delete can’t be confirmed/
    );
  });
});
