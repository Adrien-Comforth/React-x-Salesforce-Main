# Contact Card

Contact Card is a React app, deployed to Salesforce as a UI bundle. It shows a read-only card for one Contact, embedded on the Contact record page. It is built from Salesforce's React UI bundle template (Vite, TypeScript, Tailwind, shadcn/ui). It reads data with the Salesforce Platform SDK (`@salesforce/platform-sdk`), through the UI API GraphQL endpoint.

The card shows:
- An avatar with the Contact's initials
- Name, Title, Account, Email and Phone

An empty value shows as "—".

Org setup (app domain, Trusted URLs, record page) and the project-wide deploy steps are in the [root README](../../../../../README.md).

## Contents

- [How it is embedded](#how-it-is-embedded)
- [Which record it shows](#which-record-it-shows)
- [What the user sees](#what-the-user-sees)
- [Frame height](#frame-height)
- [Code map](#code-map)
- [Develop](#develop)
- [Test](#test)
- [Build and deploy](#build-and-deploy)
- [Moving to another org](#moving-to-another-org)
- [Known limitations](#known-limitations)

## How it is embedded

```
Contact record page (Contact_Record_Page, Lightning App Builder)
└─ Contact Card Host LWC (force-app/main/default/lwc/contactCardHost)
   └─ <lightning-ui-embedding src="…/app/c__ContactCard?recordId=<Id>">   (iframe)
      └─ this app, served from the org's app domain (*.my.salesforce.app)
```

- The LWC gets `recordId` from Lightning and adds it to the embed URL.
- Its `js-meta.xml` limits the record-page target to Contact.
- The iframe sandbox is `allow-scripts allow-same-origin allow-forms allow-modals`.

## Which record it shows

[embedding.ts](src/embedding.ts) (`useHostRecordId`) reads the record Id in this order:

1. **`recordId` in the host's UI-state props.** It reads them with `getViewSDK().getUiState()` and follows the value when the host pushes a new one.
2. **The `?recordId=` query parameter** that the host LWC adds.

The URL parameter is the path known to work. Whether `lightning-ui-embedding` also passes props is unverified: it is a platform component with no local type definitions.

Before querying, [contactCard.ts](src/api/contactCard.ts) checks the Id with `isContactId`: it must have the `003` prefix and 15 or 18 characters. An Id for any other object is refused without a query.

The query is `ContactCard($recordId: ID!)`: `uiapi.query.Contact(where: { Id: { eq: $recordId } }, first: 1)`. If no row comes back, the Contact is missing or the user can't see it.

## What the user sees

| State | Message |
|---|---|
| Loading | "Loading contact…" with a spinner |
| No record Id | "Open this card from a Contact record page. To try it on its own, add ?recordId=<Contact Id> to the URL." |
| Not a Contact Id | "This card only works on Contact records." |
| Missing or no access | "This contact doesn't exist, or you don't have access to it." |
| Load error | "Couldn't load this contact." plus the error message |
| Success | The card |

## Frame height

The iframe sizes itself to the card with no code in this app. The embedding bridge that the SDK loads (`@salesforce/sf-embedding-bridge`) watches `document.body` with a `ResizeObserver` and sends its height to the host.

**Never give `html`, `body` or `#root` a viewport-based height** (`min-h-screen`, `h-screen`, `100vh`). The template had `min-h-screen` on all three. A body that is at least as tall as the frame can never report a smaller height, so the frame grew endlessly. [global.css](src/styles/global.css) has a comment explaining this.

## Code map

| Path (under `src/`) | What it is |
|---|---|
| `api/contactCard.ts` | The `ContactCard` query, `isContactId` and `fetchContactCard` (returns the data, or `null` if not found) |
| `api/graphqlClient.ts` | The SDK wrapper and `GraphQLRequestError`. Same file as in ContactManager. |
| `api/graphql-operations-types.ts` | **Generated** operation types. Committed, because `tsc -b` runs before Vite regenerates it. |
| `embedding.ts` | `useHostRecordId`: reads the record Id from the host |
| `components/ContactCardView.tsx` | The read-only card |
| `pages/ContactCardPage.tsx` | Chooses which state to show |
| `routes.tsx` | One catch-all route (`*`) to the card, with no navigation bar, whatever path the host serves the bundle under |
| `hooks/useAsyncData.ts` | Async state for the query |

`appLayout.tsx`, `navigationMenu.tsx`, `pages/NotFound.tsx`, `components/layouts/` and `assets/` are left over from the template and are not used.

## Develop

Run these from this folder (`force-app/main/default/uiBundles/ContactCard`):

```bash
npm install
npm run dev
```

Outside Lightning there is no host. Add `?recordId=<Contact Id>` to the URL to choose a Contact. Without it, the app shows the "Open this card from a Contact record page" message.

The GraphQL schema and codegen work the same way as in Contact Manager: `npm run graphql:schema` writes `schema.graphql` to the SFDX project root, and the dev and build steps then regenerate the types. See the [ContactManager README](../ContactManager/README.md#develop).

## Test

```bash
npx vitest run
```

This runs 21 tests in 4 files. [src/\_\_tests\_\_/mockSdk.ts](src/__tests__/mockSdk.ts) mocks both the Data SDK and the View SDK, including a host that pushes new props, so the tests need no org. The root `.forceignore` excludes `__tests__` folders, so tests are never deployed.

## Build and deploy

```bash
npm run build
```

`dist/` is not in git but **is** what gets deployed, so build before every deploy. Then, from the SFDX project root, deploy the bundle and its host LWC:

```bash
sf project deploy start --source-dir force-app/main/default/uiBundles/ContactCard --source-dir force-app/main/default/lwc/contactCardHost --target-org "Servier - RnD React"
```

After deploying, hard-refresh the record page (Ctrl+Shift+R) to load the new build.

## Moving to another org

1. In [contactCardHost.js](../../lwc/contactCardHost/contactCardHost.js), change `CONTACT_CARD_URL` to the new org's app domain: `https://<my-domain>--c.<…>.my.salesforce.app/app/c__ContactCard`.
2. In Setup, enable the Salesforce app domain and add the Trusted URLs, both with frame-src. The steps are in the [root README](../../../../../README.md#one-time-org-setup).
3. Add **Contact Card Host** to the Contact record page in Lightning App Builder, then activate the page.

## Known limitations

- **Hardcoded URL.** The embed URL in the host LWC is hardcoded for this org.
- **Props path unverified.** Whether the host passes the record Id through UI-state props has not been confirmed (see [Which record it shows](#which-record-it-shows)).
- **Setting reads false.** In metadata, `UIBundleSettings.salesforceAppDomain` reads `false` (checked 2026-11-12), but the card loads from the app domain. Nobody has checked why.
- **No end-to-end or LWC tests.** There are no end-to-end tests (`playwright.config.ts` is template scaffolding), and the host LWC has no Jest tests.
- `CHANGELOG.md` is the template's upstream changelog, not this app's history.
