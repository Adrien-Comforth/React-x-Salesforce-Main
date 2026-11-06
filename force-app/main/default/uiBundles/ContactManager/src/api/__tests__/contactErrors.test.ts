import { describe, expect, it } from 'vitest';
import type { GraphQLError } from '@salesforce/platform-sdk';
import {
  allErrorMessages,
  MISSING_ERROR_MESSAGE,
  parseGraphQLErrors,
} from '../contactErrors';

const RULE = 'Phone is required when Title is set.';

describe('parseGraphQLErrors', () => {
  it('puts an error with no field reference in the banner', () => {
    expect(parseGraphQLErrors([{ message: RULE }])).toEqual({
      fieldErrors: {},
      formErrors: [RULE],
    });
  });

  it('ignores path, which points into the response rather than at a field', () => {
    const errors: GraphQLError[] = [
      { message: RULE, path: ['uiapi', 'ContactCreate'] },
    ];

    expect(parseGraphQLErrors(errors).formErrors).toEqual([RULE]);
  });

  it('maps REST-style extensions.fields to the field', () => {
    const errors: GraphQLError[] = [
      { message: RULE, extensions: { fields: ['Phone'] } },
    ];

    expect(parseGraphQLErrors(errors)).toEqual({
      fieldErrors: { Phone: [RULE] },
      formErrors: [],
    });
  });

  it('maps UI-API-style fieldErrors, using each entry’s own message', () => {
    const errors: GraphQLError[] = [
      {
        message: 'An error occurred while trying to update the record.',
        extensions: {
          fieldErrors: {
            Email: [{ message: 'Email: invalid email address: x' }],
            Title: [{ message: 'Title: data value too large' }],
          },
        },
      },
    ];

    expect(parseGraphQLErrors(errors)).toEqual({
      fieldErrors: {
        Email: ['Email: invalid email address: x'],
        Title: ['Title: data value too large'],
      },
      formErrors: [],
    });
  });

  it('maps fieldErrors nested under extensions.output', () => {
    const errors: GraphQLError[] = [
      {
        message: 'Record error',
        extensions: { output: { fieldErrors: { Phone: [{ message: RULE }] } } },
      },
    ];

    expect(parseGraphQLErrors(errors).fieldErrors).toEqual({ Phone: [RULE] });
  });

  it('maps a single extensions.field, ignoring case', () => {
    const errors: GraphQLError[] = [
      { message: RULE, extensions: { field: 'phone' } },
    ];

    expect(parseGraphQLErrors(errors).fieldErrors).toEqual({ Phone: [RULE] });
  });

  it('puts errors for fields that are not on the form in the banner', () => {
    const errors: GraphQLError[] = [
      { message: 'Bad account', extensions: { fields: ['AccountId'] } },
    ];

    expect(parseGraphQLErrors(errors)).toEqual({
      fieldErrors: {},
      formErrors: ['Bad account'],
    });
  });

  it('never drops an error that has no message', () => {
    const errors = [{ message: '' }, { message: '   ' }] as GraphQLError[];

    expect(parseGraphQLErrors(errors).formErrors).toEqual([
      MISSING_ERROR_MESSAGE,
    ]);
  });

  it('shows each message once', () => {
    const errors: GraphQLError[] = [
      { message: 'Same' },
      { message: 'Same' },
      { message: RULE, extensions: { fields: ['Phone'], field: 'Phone' } },
    ];

    expect(parseGraphQLErrors(errors)).toEqual({
      fieldErrors: { Phone: [RULE] },
      formErrors: ['Same'],
    });
  });
});

describe('allErrorMessages', () => {
  it('lists banner messages first, then field messages', () => {
    expect(
      allErrorMessages({
        fieldErrors: { Email: ['Bad email'], Phone: ['Bad phone'] },
        formErrors: ['General'],
      })
    ).toEqual(['General', 'Bad email', 'Bad phone']);
  });
});
