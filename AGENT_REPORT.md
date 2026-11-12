# AGENT_REPORT: ContactManager full CRUD

## STATUS: SUCCESS

- Full CRUD on Contact is built in the `ContactManager` UI bundle. Type-check and lint pass, and **65 unit tests pass** (mocked Data SDK).
- `npm run build` succeeded. `dist/` holds 3 files (`index.html`, one CSS file, one JS file).
- Only the bundle folder was deployed: **Succeeded**, Deploy ID `0AfQy00000eEFszKAG`, 84/84 components, 0 errors.
- Git: the baseline is committed as `75dcb23 baseline before CRUD` on the new branch **`feature/contact-crud`**. All feature work is on that branch, **uncommitted**. Nothing was pushed.
- **Main R&D finding:** nothing in the SDK types, the SDK docs, the schema or Salesforce's recipes says which field an error belongs to. So **server errors are expected to show in the banner**. They go inline only if Salesforce turns out to put a field reference in `extensions` (details in [Error shapes](#error-shapes-found)). Every failed mutation logs its raw `errors` JSON to the browser console. Send me those logs after your tests.

## How to open the app

App Launcher → search **"ContactManager"**. The `ContactManager_Access` permission set is assigned to you.

## Manual test checklist

**Before you start**

1. **Create your validation rule.** None exists on Contact yet (I checked with a read-only Tooling API query). Formula: `AND(NOT(ISBLANK(Title)), ISBLANK(Phone))`, error location: the **Phone** field. For example, use the message "Phone is required when Title is set."
2. Open the browser DevTools console (F12). Every failed save or delete logs `[ContactManager] <Operation> returned errors:` followed by the raw JSON.
3. For test 4 you need text over 128 characters. In the DevTools console, run `copy('x'.repeat(130))`, then paste into Title.

In the "Expected" column, **inline** means under the field and **banner** means the red box at the top of the form.

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Create succeeds | **New Contact**. First Name `Test`, Last Name `Agent CRUD`, Title `QA`, Phone `555-0101`, Email `test.agent@example.com`. **Save**. | The form closes. A green message says `Contact "Test Agent CRUD" was created.` The list refreshes and shows the contact. |
| 2 | Last Name required (browser check) | **New Contact**, leave Last Name empty, **Save**. | `Last Name is required.` appears under Last Name. Nothing is sent: no console log, no network call. |
| 3 | Invalid email | **New Contact**. Last Name `Email Test`, Email `not-an-email`. **Save**. | The form stays open and keeps what you typed. The Salesforce error shows **inline under Email** if it carries a field reference, otherwise in the **banner** "Salesforce couldn't save this contact." Fix the email and **Save**: it should succeed (then delete it, as in test 8). |
| 4 | Title over 128 characters | Open **Test Agent CRUD**, paste the 130 characters into Title, **Save**. | Same as test 3: the form stays open, the error shows **inline under Title** or in the **banner**, and your input is kept. |
| 5 | Validation rule (Title set, Phone blank) | Open **Test Agent CRUD**. Title `Manager`, clear Phone, **Save**. | Your rule's message shows **inline under Phone** or in the **banner**, and your input is kept. |
| 6 | Edit succeeds | Open **Test Agent CRUD**. Title `QA Lead`, Phone `555-0102`, **Save**. | The form closes. A green message says `Contact "Test Agent CRUD" was saved.` The new Title shows in the list. |
| 7 | Delete refused (Contact linked to a Case) | Search `Barr`, then **Delete** on the **Tim Barr** row (Cases 00001007 and 00001008), then confirm. | The dialog **stays open** with the banner "Salesforce couldn't delete this contact." plus Salesforce's message (expected to mention the related cases). Nothing is deleted. Click **Cancel**. |
| 8 | Delete succeeds (from the row) | Search `Agent`, **Delete** on **Test Agent CRUD**, confirm. | Both dialogs close. A green message says `Contact "Test Agent CRUD" was deleted.` The row is gone. |
| 9 | Delete succeeds (from the form, optional) | Create another contact, open it, click **Delete** inside the form, confirm. | Both dialogs close, the success message shows, and the list refreshes. |
| 10 | Search and empty states | Type `an` in the search box, then `zzzz`. | The list filters after a short pause (server-side `like`). With no matches it shows `No contacts match "zzzz".` |

**Please send me back:** the console JSON from tests 3, 4, 5 and 7. It shows the real error shape and whether the inline mapping should fire.

Other contacts linked to Cases, if you need more for test 7: John Bond, Lauren Boyle, Liz D'Cruz, Josh Davis.

## Error shapes found

The developer.salesforce.com pages refuse automated fetches (HTTP 403), so I used these sources instead:
- The SDK's type definitions (`node_modules/@salesforce/platform-sdk/dist/core/data.d.ts`)
- The SDK's docs (`node_modules/@salesforce/platform-sdk/docs/data/*.md`)
- The org's GraphQL schema
- Salesforce's recipes (`trailheadapps/multiframework-recipes`)

**1. The SDK's error type** (`GraphQLError`):

```ts
interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: Record<string, unknown>; // free-form, passed through from the server unchanged
}
```

The SDK itself only ever sets `extensions.code = "CACHE_MISS"`, and only for `only-if-cached` queries. Every other failure the SDK creates itself has no code, so only its `message` tells them apart.

**2. Results never throw.** `query()` and `mutate()` always resolve and put failures in `result.errors`. A mutation result is `{ data: T | undefined; errors?: GraphQLError[] }`. The docs warn that a degenerate `{ data: undefined, errors: [] }` is possible, so "no errors" alone doesn't mean the save worked.

**3. Failures the SDK creates itself** (docs table):

| Failure | What `errors[0]` looks like |
|---|---|
| Wrong operation kind | `…requires a GraphQL query, received <kind>.` |
| Syntax error | `Syntax Error: …` |
| Non-serializable variables | `…must be JSON-serializable. …` |
| Network failure | The fetch error's message, verbatim |
| Server error | Whatever the server sent: `message`, plus `path`, `locations` and `extensions` when present |

**4. Schema.** The mutation payloads have no error fields:
- `ContactCreatePayload { Record }`
- `ContactUpdatePayload { Record, success }`
- `RecordDeletePayload { Id }`

So errors only come back in the top-level `errors` array.

`Email` and `Phone` are custom scalars (`Email`, `PhoneNumber`) in the input types. An invalid email might therefore be rejected while GraphQL checks the request variables, before the record is ever saved. The message would then look different from a normal save error.

**5. Recipes.** They only ever read `message`. `ServerErrorHandling.tsx` states that missing-required-field errors come back as top-level errors, not field-level ones. No recipe maps an error to a field. Their test mocks look like `{ message: 'REQUIRED_FIELD_MISSING: Last Name' }`, but those are hand-written, not captured from a real server.

**Conclusion: no source documents which field an error belongs to.** Per your rule, server errors fall back to the banner.

The code still checks `extensions` for the field formats that Salesforce's REST and UI APIs use. These are **unverified for GraphQL**, and an error goes inline only if one of them is present:

| `extensions` key | Comes from | Mapped to |
|---|---|---|
| `fieldErrors: { <ApiName>: [{ message }] }`, also under `output.fieldErrors` | UI API (REST) record errors | Each entry's `message`, under that field |
| `fields: ['<ApiName>', …]` | REST API DML errors | The error's `message`, under each listed field |
| `field: '<ApiName>'` | Single-field form | The error's `message`, under that field |

- Field names are matched case-insensitively against FirstName, LastName, Title, Email and Phone. Fields that aren't on the form go to the banner.
- `path` is **not** used, because it points into the response (for example `uiapi.ContactCreate`), not at an input field.
- Message text is **not** parsed, so `Email: invalid email address: …` stays in the banner. Parsing it would be fragile and depend on the org's language.

If your console logs show a consistent structured field reference, the mapping is a small change in [contactErrors.ts](force-app/main/default/uiBundles/ContactManager/src/api/contactErrors.ts).

## How errors are handled

- **Browser checks:** only "Last Name is required". Email is `type="text"` (with `inputMode="email"`), no field has `maxLength`, and the form is `noValidate`, so format and length errors come from Salesforce.
- **What's sent:** values exactly as typed. The only change is that an empty field becomes `null`, so it's cleared on edit or left unset on create.
- **Success** requires no errors **and** the expected data:
  - Create: `ContactCreate.Record.Id`
  - Update: `ContactUpdate.Record.Id`, and `success` is not `false`
  - Delete: `ContactDelete.Id`

  Every other outcome produces a visible message:

  | Outcome | What you see |
  |---|---|
  | `errors` present (even if data also came back) | Field messages inline, the rest in the banner |
  | No errors, but no record or Id | "Salesforce did not return … so the … can't be confirmed." |
  | Update with `success: false` | "Salesforce reported that the update did not succeed." |
  | No data and no errors | "Salesforce returned no data for <Operation>, so the change can't be confirmed." |
  | SDK has no GraphQL support | "GraphQL data access is not available in this environment." |
  | SDK call rejects (shouldn't happen, but handled) | The exception's message |

- **After a failed save,** the form stays open, keeps your values, and Save is enabled again.
- **Delete errors** show inside the confirmation dialog, which stays open.
- **If the list can't load,** a banner says "Couldn't load contacts." with the error. It never shows a misleading "No contacts found."
- **Raw errors** are logged with `console.error` as formatted JSON on every failure.

## Cache handling

The SDK caches each query for 300 seconds, keyed by query plus variables. Mutations don't touch that cache.

- **As approved:** after a create, update or delete, the list reloads with `cacheControl: 'no-cache'`, using the new `reload()` in `useAsyncData`.
- **One addition:** each search term has its own cache entry, and those can be stale after a change. So from the first change on, every later list read (including new searches) also uses `no-cache`. Before any change, the normal cache is used. Without this, searching for a contact you just edited could show its old values for up to 5 minutes.

## Files

**Created** (all in `force-app/main/default/uiBundles/ContactManager/src/`):

| File | What it is |
|---|---|
| `api/contacts.ts` | The 4 GraphQL documents; fetch, create, update and delete; the success checks |
| `api/contactErrors.ts` | Splits errors into field and banner messages |
| `api/graphql-operations-types.ts` | **Generated** by codegen. Commit it: `tsc -b` runs before Vite regenerates it |
| `hooks/useDebouncedValue.ts` | 300 ms debounce for the search box |
| `components/contacts/ContactList.tsx` | The list, with loading and empty states |
| `components/contacts/ContactForm.tsx` | The one form for create and edit |
| `components/contacts/DeleteContactDialog.tsx` | The delete confirmation |
| `components/contacts/ErrorBanner.tsx` | The error banner |
| `pages/ContactsPage.tsx` | The page that ties it together |

Tests (in `__tests__` folders, so the root `.forceignore` rule `**/__tests__/**` keeps them out of the deployed bundle; the deploy confirmed 0 test files):
- `__tests__/fixtures.ts`, `__tests__/mockDataSdk.ts` (helpers)
- `api/__tests__/contacts.test.ts` (19), `api/__tests__/contactErrors.test.ts` (10)
- `hooks/__tests__/useAsyncData.test.ts` (3)
- `components/contacts/__tests__/ContactList.test.tsx` (8), `ContactForm.test.tsx` (10), `DeleteContactDialog.test.tsx` (3), `ErrorBanner.test.tsx` (3)
- `pages/__tests__/ContactsPage.test.tsx` (9)

**Changed:**

| File | Change |
|---|---|
| `src/api/graphqlClient.ts` | `cacheControl` option for queries. A `GraphQLRequestError` that keeps the raw `errors` and a `kind` (`unavailable` / `errors` / `no-data`). A guard instead of `sdk.graphql!` |
| `src/hooks/useAsyncData.ts` | Added `reload()` |
| `src/routes.tsx` | The index route is the Contacts page; nav label "Contacts" |
| `README.md` | (before the baseline) the `npm run graphql:schema` section. (after) fixed paths: `base-react-app` → `ContactManager`, `ui-bundles` → `uiBundles/ContactManager` |
| `ContactManager.uibundle-meta.xml` | Description is now "Contact Manager: search, create, edit and delete Contacts." |

**Deleted:** `src/pages/Home.tsx`, the template's placeholder page, now replaced by the Contacts page.

**Also changed by the build:** `tsconfig.tsbuildinfo` (tracked in git) and `dist/` (ignored by git).

Outside the bundle: only this report. The `.gitignore` entries were already present.

## Commands run against the org

Org changes, both allowed by your rules:

1. `sf org assign permset --name ContactManager_Access --target-org "Servier - RnD React"`: assigned to `lucadrien.noel@wise-moose-5sthg6.com`.
2. `sf project deploy start --source-dir force-app/main/default/uiBundles/ContactManager --target-org "Servier - RnD React"`: Succeeded (`0AfQy00000eEFszKAG`). 11 files created, 7 changed, 63 unchanged and 3 deleted (the 2 old `dist` assets and `Home.tsx`; UI bundles support partial deletes).

Read-only:

- `sf data query --query "SELECT Name, Account.Name, (SELECT CaseNumber FROM Cases LIMIT 3) FROM Contact WHERE Id IN (SELECT ContactId FROM Case) ORDER BY LastName LIMIT 5"`
- `sf data query --use-tooling-api --query "SELECT ValidationName, Active, ErrorDisplayField, ErrorMessage FROM ValidationRule WHERE EntityDefinition.DeveloperName = 'Contact'"` returned 0 rules.
- `sf sobject describe --sobject Contact` (field lengths: Title 128, LastName 80, Email 80, Phone 40)

**No records were created, edited or deleted.** No object, field, security or Setup changes were made.

Local only: `git switch -c feature/contact-crud`, `git commit` (baseline), `npm run graphql:codegen`, `npx tsc -b`, `npm run lint`, `npx vitest run`, `npm run build`.

## Decisions

1. **Branch.** `main` is the default branch and is in sync with `origin/main`, so the baseline commit went on a new branch, `feature/contact-crud`. To put it on `main` instead: `git switch main && git merge --ff-only feature/contact-crud`.
2. **Baseline content.** You had already committed the bundle, app, permission set and `.gitignore` (`d11ea1f`), so `baseline before CRUD` only adds the README schema section.
3. **Home page.** The Contacts page is the app's home page and the template's `Home.tsx` was removed. The top bar still says "React App" (template layout, outside the requested cleanups).
4. **Edit form data.** The form is pre-filled from the list row, with no extra query. After any change the list reloads fresh, so the rows are current.
5. **Success messages** use the template's green `StatusAlert` on the page rather than a toast, because it's simpler and easy to test.
6. **No `sdk.graphql!`.** A guard gives a readable error instead of a crash if GraphQL isn't available. The SDK docs only allow `!` for WebApp-only bundles.
7. **Tests import `describe`/`it`/`vi` from `vitest`** instead of using globals. The ESLint config runs `no-undef` on test files, so globals would fail lint.
8. **Field mapping is structured only** (see Error shapes). Message text is never parsed.

## Problems and how they were resolved

| Problem | Resolution |
|---|---|
| `tsc`: `Property 'Id' does not exist on type '{}'`. The SDK's `NodeOfConnection` resolves to `unknown` with codegen's nullable edges (`Array<{ node } \| null>`). | One fix: plain indexed-access types instead. Noted in the code. |
| Vite warning: JS chunk 518 kB, over its 500 kB hint. | Warning only, and the build succeeded. Code-splitting would remove it (out of scope). |
| Earlier: developer.salesforce.com docs return HTTP 403 to automated fetches. | I used the SDK's local docs and type definitions, the org schema and the recipes repo. |

## Not verified and possible follow-ups

- **The real error shapes** weren't checked live, because I wasn't allowed to write records. Your manual tests plus the console JSON will settle this.
- `tsconfig.tsbuildinfo` is tracked and changes on every build. Consider adding it (and `build/`) to `.gitignore`.
- `node_modules/` appears twice in `.gitignore` (lines 25 and 58). It's harmless.

---

## Follow-up (2026-11-12): Contact Card embedded app

**Status:** built, tested (22 tests), built (`dist/` has 3 files), and deployed together with the host LWC: Deploy ID `0AfQy00000ePVUbKAO`, 81/81 components, 0 errors. Uncommitted on `feature/contact-crud`.

**What it does:** a read-only card for one Contact (name, title, account, email, phone), embedded on `Contact_Record_Page` through the `contactCardHost` LWC.

**How it gets the record:**
1. A `recordId` in the host's UI-state props (`getViewSDK().getUiState()`), followed when the host pushes a new one.
2. Otherwise the `?recordId=` query parameter, which the host LWC now adds to the embed URL from its `@api recordId`.

I couldn't verify how `lightning-ui-embedding` sets props: it's a platform component with no local type definitions. So the URL parameter is the path that is known to work.

**Other behavior:**
- Asks the host to fit the frame height to the card (`view.resize`). This is feature-detected.
- States: loading, no record ("open from a Contact record page"), not a Contact Id, not found or no access, load error, card.

**Files:**
- New in the bundle: `src/api/contactCard.ts`, `src/embedding.ts`, `src/components/ContactCardView.tsx`, `src/pages/ContactCardPage.tsx`, and tests under `__tests__`.
- Changed in the bundle: `graphqlClient.ts` (same hardened version as ContactManager), `routes.tsx` (one catch-all route with no navigation chrome), `index.html` title, bundle description, README paths, and the generated types.
- Removed: `src/pages/Home.tsx`.
- LWC: moved from `lwc/force-app/main/default/lwc/contactCardHost` to `lwc/contactCardHost`. It now passes the record Id, and its record-page target is limited to Contact.

**Blocking the embedded card:** `UIBundleSettings.salesforceAppDomain` is still `false` (re-checked read-only), and the embed URL is on the app domain (`*.my.salesforce.app`). Turning it on is your Setup change.

**Org commands:** one deploy, plus read-only checks: retrieve of `Settings:UIBundle` to the scratchpad, and Tooling queries on `LightningComponentBundle` and `MetadataComponentDependency`.
