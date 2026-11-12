# Contact Manager

Contact Manager is a React app, deployed to Salesforce as a UI bundle, that lets users search, create, edit and delete Contacts. It is built from Salesforce's React UI bundle template (Vite, TypeScript, Tailwind, shadcn/ui). It reads and writes data with the Salesforce Platform SDK (`@salesforce/platform-sdk`), through the UI API GraphQL endpoint.

**Open it:** App Launcher → **Contact Manager**. You need the `ContactManager_Access` permission set. Org setup and the project-wide deploy steps are in the [root README](../../../../../README.md).

## Contents

- [Features](#features)
- [Error handling](#error-handling)
- [Data access and caching](#data-access-and-caching)
- [Code map](#code-map)
- [Develop](#develop)
- [Test](#test)
- [Build and deploy](#build-and-deploy)
- [Known limitations](#known-limitations)

## Features

- **List.** Shows up to 50 Contacts, sorted by Last Name. The columns are Name, Title, Email, Phone and Account Name.
- **Search.** Matches on Name on the server (`like '%term%'`) and starts 300 ms after the user stops typing.
- **Create and edit.** One form handles both. Its fields are First Name, Last Name (required), Title, Email and Phone. Account Name appears in the list only, read-only.
- **Delete.** Available from a row or from inside the edit form. Every delete asks for confirmation first.
- **Feedback.** A green message confirms each successful create, save or delete. After every change the list reloads from the server.

## Error handling

Error handling was the main R&D topic of this app. The full research is in [AGENT_REPORT.md](../../../../../AGENT_REPORT.md#error-shapes-found).

- **In the browser, only Last Name is validated.** All other rules are left to Salesforce: email format, field lengths and validation rules. The form is `noValidate`, Email is a text input and no field has a `maxLength`.
- **Where errors show:**
  - Field errors show under their field.
  - Any other save error shows in a banner at the top of the form.
  - Delete errors show inside the confirmation dialog, which stays open.
  - A list that fails to load shows "Couldn't load contacts." It never shows a misleading empty list.
- **Nothing fails silently.**
  - A save counts as a success only when there are no errors **and** Salesforce returns the expected record or Id.
  - Every other outcome shows a message, including an update that returns `success: false` and a response with no data and no errors.
- **Input is kept.** After a failed save the form stays open, keeps what the user typed, and Save is enabled again.
- **Raw errors are logged.** Each failure logs its raw GraphQL `errors` array to the browser console as JSON, prefixed `[ContactManager] <Operation> returned errors:`.
- **Field mapping is unverified.** [contactErrors.ts](src/api/contactErrors.ts) maps an error to a field only when `extensions` carries a structured field reference (`fieldErrors`, `fields` or `field`). No documentation confirms that the UI API GraphQL sends any of these. So until real error responses are checked, expect server errors in the banner. Message text is never parsed.

## Data access and caching

All GraphQL operations are in [contacts.ts](src/api/contacts.ts):

| Operation | GraphQL |
|---|---|
| `SearchContacts` | `uiapi.query.Contact(first, where: { Name: { like } }, orderBy: { LastName: ASC })` |
| `CreateContact` | `uiapi.ContactCreate(input: { Contact })` → `Record` |
| `UpdateContact` | `uiapi.ContactUpdate(input: { Id, Contact })` → `Record`, `success` |
| `DeleteContact` | `uiapi.ContactDelete(input: { Id })` → `Id` |

Empty form fields are sent as `null`, so on edit they clear the value and on create they leave it unset.

[graphqlClient.ts](src/api/graphqlClient.ts) wraps the SDK:
- The SDK's `query()` and `mutate()` never reject. Failures arrive in `result.errors`.
- The wrapper turns those failures into a `GraphQLRequestError`. It keeps the raw `errors` and a `kind`: `unavailable`, `errors` or `no-data`.

**Caching.** The SDK caches each query for 300 seconds, keyed by query and variables, and mutations don't clear that cache. So after the first create, edit or delete in a session, every list read uses `cacheControl: 'no-cache'`. That includes new searches. Without it, a search could show stale values for up to 5 minutes.

## Code map

| Path (under `src/`) | What it is |
|---|---|
| `api/contacts.ts` | The GraphQL documents, the fetch, create, update and delete functions, and the success checks |
| `api/contactErrors.ts` | Splits GraphQL errors into field messages and banner messages |
| `api/graphqlClient.ts` | The SDK wrapper and `GraphQLRequestError` |
| `api/graphql-operations-types.ts` | **Generated** operation types. Committed, because `tsc -b` runs before Vite regenerates it. |
| `hooks/useAsyncData.ts` | Async state with `reload()` |
| `hooks/useDebouncedValue.ts` | The 300 ms debounce for search |
| `components/contacts/` | `ContactList`, `ContactForm`, `DeleteContactDialog`, `ErrorBanner` |
| `pages/ContactsPage.tsx` | The page that ties them together. It is the index route. |
| `routes.tsx`, `appLayout.tsx` | Routing and the template's top bar |
| `components/ui/` | shadcn/ui components from the template |

## Develop

Run these from this folder (`force-app/main/default/uiBundles/ContactManager`):

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite dev server. `npm run dev:design` starts it in design mode.

**GraphQL schema.** `schema.graphql` is downloaded from the org into the SFDX project root and is not committed. Download it with:

```bash
npm run graphql:schema
```

It uses your default org. To use another org, set `SF_TARGET_ORG` first:
- bash: `SF_TARGET_ORG=<alias> npm run graphql:schema`
- PowerShell: `$env:SF_TARGET_ORG = "<alias>"`, then the command

When the schema exists:
- `npm run dev` and `npm run build` regenerate `src/api/graphql-operations-types.ts`.
- `npm run graphql:codegen` regenerates it on its own.
- `npm run lint` also lints the GraphQL operations.

## Test

```bash
npx vitest run
```

This runs 65 tests in 8 files. They use a mocked Data SDK ([src/\_\_tests\_\_/mockDataSdk.ts](src/__tests__/mockDataSdk.ts)), so they need no org. `npm run test` starts Vitest in watch mode.

Tests live in `__tests__` folders. The root `.forceignore` excludes these folders, so tests are never deployed. Tests import `describe`, `it` and `vi` from `vitest` rather than relying on globals, because ESLint's `no-undef` rule applies to test files.

The manual test checklist against the org is in [AGENT_REPORT.md](../../../../../AGENT_REPORT.md#manual-test-checklist).

## Build and deploy

```bash
npm run build
```

`tsc -b` runs first, then `vite build` writes the app to `dist/`. `dist/` is not in git but **is** what gets deployed, so build before every deploy. Then, from the SFDX project root:

```bash
sf project deploy start --source-dir force-app/main/default/uiBundles/ContactManager --target-org "Servier - RnD React"
```

## Known limitations

- **Unconfirmed error mapping.** The real GraphQL error shapes were never captured, so inline field errors are unconfirmed (see [Error handling](#error-handling)).
- **Template label.** The top bar still shows the template's "React App" label.
- **No end-to-end tests.** `playwright.config.ts` and `npm run build:e2e` are template scaffolding: there is no `e2e/` folder and no `test:e2e` script.
- **Chunk-size warning.** Vite warns that the JS chunk is over 500 kB (about 518 kB). It is a warning only.
- **Changing build file.** `tsconfig.tsbuildinfo` is tracked in git and changes on every build.
- `CHANGELOG.md` is the template's upstream changelog, not this app's history.
