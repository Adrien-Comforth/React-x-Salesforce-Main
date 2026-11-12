/**
 * Thin GraphQL client: createDataSDK + sdk.graphql with centralized error
 * handling. Mutations are routed to sdk.graphql.mutate and everything else to
 * sdk.graphql.query (the SDK rejects an operation sent to the wrong method).
 * Use with gql-tagged queries and generated operation types for type-safe calls.
 *
 * Every failure throws a GraphQLRequestError. It keeps the raw `errors` array the
 * SDK returned, so callers can inspect it (for example, to map mutation errors to
 * form fields).
 */
import {
  createDataSDK,
  type CacheControl,
  type GraphQLError,
} from '@salesforce/platform-sdk';

/**
 * Why a GraphQL call failed:
 * - `unavailable`: the SDK exposes no `graphql` namespace in this environment.
 * - `errors`: the response carried a non-empty `errors` array.
 * - `no-data`: no errors, but no `data` either.
 */
export type GraphQLFailureKind = 'unavailable' | 'errors' | 'no-data';

export class GraphQLRequestError extends Error {
  readonly kind: GraphQLFailureKind;
  /** The raw errors returned by the SDK (empty unless `kind` is `errors`). */
  readonly errors: readonly GraphQLError[];

  constructor(
    message: string,
    kind: GraphQLFailureKind,
    errors: readonly GraphQLError[] = []
  ) {
    super(message);
    this.name = 'GraphQLRequestError';
    this.kind = kind;
    this.errors = errors;
  }
}

export interface ExecuteGraphQLOptions {
  /**
   * Cache policy for a query, e.g. `'no-cache'` to bypass the SDK's query cache.
   * Ignored for mutations: the SDK never caches them.
   */
  cacheControl?: CacheControl;
}

/**
 * True when the operation's first definition is a `mutation`. Strips GraphQL
 * comments first so a leading `# ...` line can't mask the keyword. Queries
 * (named or anonymous `{ ... }` shorthand) and subscriptions fall through to
 * query().
 */
function isMutation(operation: string): boolean {
  return /^\s*mutation\b/.test(operation.replace(/#[^\n\r]*/g, ''));
}

export async function executeGraphQL<TData, TVariables>(
  operation: string,
  variables?: TVariables,
  options?: ExecuteGraphQLOptions
): Promise<TData> {
  const sdk = await createDataSDK();
  const graphql = sdk.graphql;
  if (!graphql) {
    throw new GraphQLRequestError(
      'GraphQL data access is not available in this environment.',
      'unavailable'
    );
  }

  const result = isMutation(operation)
    ? await graphql.mutate<TData, TVariables>({
        mutation: operation,
        variables,
      })
    : await graphql.query<TData, TVariables>({
        query: operation,
        variables,
        ...(options?.cacheControl
          ? { cacheControl: options.cacheControl }
          : {}),
      });

  if (result.errors?.length) {
    const msg = result.errors.map(e => e.message).join('; ');
    throw new GraphQLRequestError(`GraphQL Error: ${msg}`, 'errors', result.errors);
  }

  if (result.data == null) {
    throw new GraphQLRequestError('GraphQL response data is null', 'no-data');
  }

  return result.data;
}
