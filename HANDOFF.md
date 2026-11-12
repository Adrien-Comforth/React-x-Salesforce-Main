# HANDOFF

This hand-over is for the next agent on this project. It covers the work done, the state of the repo and the org as of **2026-11-12**, the rules the user set, and what is still open. All org facts below were checked read-only on 2026-11-12 unless a line says otherwise.

## TL;DR

- **Two React apps (Salesforce UI bundles) are built, deployed and working** in a Trailhead Developer Edition org:
  - **ContactManager:** full CRUD on Contact, with error handling as the R&D focus.
  - **ContactCard:** a read-only card embedded on the Contact record page.
- **Development is stopped.** The user moved the project to documentation. Don't start new features unless the user asks.
- **Git:** `main` holds everything and is in sync with `origin/main`. The documentation pass (this file, the three READMEs and the `AGENT_REPORT.md` updates) is **uncommitted**, unless the user has committed it since.
- **Biggest open item:** nobody has captured real GraphQL error responses, so the inline field-error mapping in ContactManager is unverified. See [Open items](#open-items).

## Environment

| Item | Value |
|---|---|
| Project root | `C:\Xtra\Servier\Servier - RnD React` |
| OS and shells | Windows 11. PowerShell 5.1 is the primary shell (no `&&`; use `;` or `if ($?)`). Git Bash is also available. |
| Org alias | `Servier - RnD React`. The alias `product-dev` points to the same user. **Always pass `--target-org "Servier - RnD React"`.** |
| Username | `lucadrien.noel@wise-moose-5sthg6.com` |
| My Domain | `https://wise-moose-5sthg6-dev-ed.trailblaze.my.salesforce.com` |
| Lightning | `https://wise-moose-5sthg6-dev-ed.trailblaze.lightning.force.com` |
| App domain (UI bundles) | `https://wise-moose-5sthg6-dev-ed--c.trailblaze.my.salesforce.app` |
| Org type | Developer Edition (Trailhead), Hyperforce. UI bundles need Hyperforce. |
| API version | 68.0 (`sfdx-project.json`) |
| Salesforce CLI | Two installs. Git Bash resolves to 2.144.6 (`/c/nvm4w/nodejs/sf`). `C:\Program Files\sf` has 2.157.8. 2.108.6 was too old (no `template generate project`). |
| Node | v22.19.0 |
| Remote | `https://github.com/Adrien-Comforth/Servier---RnD-React.git` |

## Rules the user set

These come from the user's prompts. Keep following them unless the user changes them.

- **Scope:**
  - Do NOT create Apex, custom objects, custom fields, flows, Experience Cloud sites, or any metadata the template doesn't already generate.
  - Do NOT change org-wide settings, security, profiles, sharing or any Setup configuration. **If a Setup change is needed, STOP and write it down for the user.**
  - Do NOT configure or extend the Agentforce Conversation Client or any AI features.
  - Do NOT install npm packages beyond the template's own dependencies.
  - Work only inside this project folder.
- **Org changes:** the only allowed ones are deploying this project's metadata and assigning the `ContactManager_Access` permission set to the authenticated user only. No object or field permission changes.
- **Records:** don't create, edit or delete org records. The user tests by hand.
- **Fixes:** don't invent commands or APIs. Make at most 2 fix attempts per problem, then STOP and report.
- **Git:** commit only when asked. If you're on `main`, branch first. The user likes commits split by stage of development.
- **Secrets:** never print or log access tokens. Redact `sf org display` output.

## What was built

| Piece | Path (under `force-app/main/default/`) | Notes |
|---|---|---|
| ContactManager UI bundle | `uiBundles/ContactManager/` | Search, create, edit and delete. See its [README](force-app/main/default/uiBundles/ContactManager/README.md). |
| ContactCard UI bundle | `uiBundles/ContactCard/` | Read-only card. See its [README](force-app/main/default/uiBundles/ContactCard/README.md). |
| Host LWC | `lwc/contactCardHost/` | `lightning-ui-embedding` with a **hardcoded** app-domain URL plus `?recordId=`. The record-page target is limited to Contact. |
| Apps | `applications/ContactManager.app-meta.xml`, `applications/ContactCard.app-meta.xml` | `<uiBundle>c__…</uiBundle>` |
| Permission set | `permissionsets/ContactManager_Access.permissionset-meta.xml` | Makes both apps visible and grants ApiEnabled |
| Deploy fix | `.forceignore` | Excludes 5 empty StandardValueSets that the Metadata API rejects |

The rest of `force-app/` is the org baseline the user retrieved. It is not part of the apps. Don't deploy all of `force-app` unless the user asks.

**Who did what:**
- The user scaffolded both bundles, the apps, the permission set and the first version of the LWC.
- The agent built the CRUD, the card logic, the host LWC changes, the `.forceignore` fix, the resize fix and the docs.

## Current state

| Item | State | How it was checked |
|---|---|---|
| Git | On `main`, equal to `origin/main`. `feature/contact-crud` and `feature/contact-card` are merged and pushed. Docs pass uncommitted. | `git status -sb`, `git rev-list` |
| ContactManager tests | 65 passing, 8 files | `npx vitest run` |
| ContactCard tests | 21 passing, 4 files. Lint clean, build OK. | `npx vitest run`, `npx eslint src`, `npm run build` |
| ContactManager deploy | Succeeded, `0AfQy00000eEFszKAG` | Deploy result |
| ContactCard and LWC deploy | Succeeded, `0AfQy00000ePVUbKAO`. Resize fix: `0AfQy00000ePRXSKA4` (latest). | Deploy result, `sf project deploy report` |
| Contact Card on record page | Works, with no endless growth | The user said so, 2026-11-12 |
| `UIBundleSettings.salesforceAppDomain` | Reads **`false`** in metadata, yet the card loads from the app domain. Not explained. | `sf project retrieve start --metadata Settings:UIBundle` into the scratchpad |
| Trusted URLs (all active, frame-src, context All) | `SF_App_Serve` = `https://*.salesforce.app`. `SF_LWC_Domain` = the Lightning domain. `SF_My_Domain` = the **app domain** URL (despite the name). Also `Product_App_Localhost`, `Product_App_Vercel` and `TrailheadHerokuBaseURL`. | SOQL on `CspTrustedSite` |
| My Domain | Edge Network on (`useEdge=true`). First-party cookie requirement off. | Settings retrieve, earlier in the session |
| Validation rule | `Phone_Required_With_Title`, active, error on Phone, "Phone is required when a Title is set." **Not in source.** | Tooling SOQL on `ValidationRule` |
| Permission set | `ContactManager_Access` assigned to `lucadrien.noel@wise-moose-5sthg6.com` only | SOQL on `PermissionSetAssignment` |
| `Contact_Record_Page` | Exists (RecordPage, Contact). Last modified 2026-11-12T06:36Z. Holds `contactCardHost`. **Not in source.** | Tooling SOQL on `FlexiPage` and `MetadataComponentDependency` |

## Commit history by stage

| Commit | Stage |
|---|---|
| `06ae27c`, `6393728` | Initial commit and the org baseline retrieve |
| `d11ea1f` | User: bundle, app and permission set scaffold |
| `75dcb23` | Baseline before CRUD (README schema section) |
| `fb50404` | ContactManager CRUD implementation |
| `2e2c332` | User: embedded app configuration (ContactCard scaffold and LWC) |
| `7d10514` … `a7af87c` | ContactCard, one commit per step: LWC move, data access, host record Id, view and route, LWC record Id, cleanups |
| `ed9ff66` | AGENT_REPORT follow-up |
| `daa1b75` | Resize fix (the endlessly growing iframe) |

## How to work on it

Run these from the project root unless noted. Full details are in the [README](README.md).

```bash
# In a bundle folder: install, test, lint, build
npm install
npx vitest run
npm run lint
npm run build          # tsc -b, then vite build into dist/

# Refresh the GraphQL schema (written to the project root, gitignored)
npm run graphql:schema

# Deploy only what changed, after building
sf project deploy start --source-dir force-app/main/default/uiBundles/ContactManager --target-org "Servier - RnD React"
sf project deploy start --source-dir force-app/main/default/uiBundles/ContactCard --source-dir force-app/main/default/lwc/contactCardHost --target-org "Servier - RnD React"
```

## Findings and gotchas

These cost time. Read them before changing anything.

1. **`dist/` is gitignored but is what gets deployed.** A bundle deployed without a build has no app in it.
2. **SDK calls never reject.** `sdk.graphql.query()` and `mutate()` resolve with `{ data, errors }`. `{ data: undefined, errors: [] }` is possible, so success checks must also require the expected record or Id. See `graphqlClient.ts` and `contacts.ts`.
3. **The SDK query cache lasts 300 seconds, keyed by query and variables, and mutations don't clear it.** After the first mutation, ContactManager reads with `cacheControl: 'no-cache'`.
4. **No documented field reference on GraphQL errors.** The SDK's `GraphQLError.extensions` is free-form, and the SDK only ever sets `extensions.code = "CACHE_MISS"`. The payloads (`ContactCreatePayload { Record }`, `ContactUpdatePayload { Record, success }`, `RecordDeletePayload { Id }`) have no error fields.
5. **Codegen typing.** With codegen's nullable edges, `NodeOfConnection` resolves to `unknown`. Use indexed-access types instead.
6. **Generated types are committed.** `src/api/graphql-operations-types.ts` is committed because `tsc -b` runs before the Vite codegen plugin.
7. **Tests import from `vitest`.** They import `describe`, `it` and `vi` explicitly, because ESLint's `no-undef` applies to test files. Tests must sit in `__tests__` folders so `.forceignore` keeps them out of deploys.
8. **Empty StandardValueSets fail deploys** ("Required field is missing: standardValue"). Five are excluded in `.forceignore`.
9. **Frame height loop.** The embedding bridge (`@salesforce/sf-embedding-bridge`, `EmbeddingResizer`) auto-reports `document.body` height to the host. Any `min-h-screen`, `h-screen` or `100vh` on `html`, `body` or `#root` makes the iframe grow forever. Don't add a custom resize hook either: the bridge already does it.
10. **Record Id path.** The card gets the record Id from the `?recordId=` URL parameter, which is known to work. The UI-state props path (`getViewSDK().getUiState().state.props.recordId`) is also read but unverified.
11. **developer.salesforce.com returns HTTP 403 to automated fetches.** Use instead:
    - The SDK's local docs and types: `node_modules/@salesforce/platform-sdk/docs`, `dist/**/*.d.ts`
    - The bridge's source: `node_modules/@salesforce/sf-embedding-bridge/dist/index.esm.js`
    - `schema.graphql`
    - Web search
    - The `trailheadapps/multiframework-recipes` repo
12. **Vite config.** `vite.config.ts` points Vitest at a missing `src/test/setup.ts`, but `vitest.config.ts` (with `vitest.setup.ts`) is what Vitest uses. This is harmless.

## Open items

None of these are in progress. Ask the user before acting on any.

1. **Capture the real GraphQL error shapes.**
   - The user was asked to run the manual checklist ([AGENT_REPORT.md](AGENT_REPORT.md#manual-test-checklist), tests 3, 4, 5 and 7) and send back the `[ContactManager] … returned errors:` console JSON. It has not been received.
   - Next step: if the JSON shows a consistent structured field reference, adjust `parseGraphQLErrors` in `uiBundles/ContactManager/src/api/contactErrors.ts`.
2. **Explain `salesforceAppDomain = false`.** The card works on the app domain anyway. Possibly the metadata read is stale, or the setting doesn't gate internal embedding. If it needs changing, that's a Setup change: write it down for the user.
3. **Version the org-only configuration?** `Contact_Record_Page` and `Phone_Required_With_Title` are not in source. Retrieving them only changes local files, but ask first:
   `sf project retrieve start --metadata FlexiPage:Contact_Record_Page --metadata "ValidationRule:Contact.Phone_Required_With_Title" --target-org "Servier - RnD React"`.
4. **Hardcoded embed URL** in `contactCardHost.js`. It must be changed for any other org.
5. **Template leftovers:**
   - ContactManager's top bar says "React App".
   - ContactCard keeps unused `appLayout.tsx`, `navigationMenu.tsx`, `pages/NotFound.tsx`, `components/layouts/` and `assets/`.
6. **Repo hygiene:**
   - `tsconfig.tsbuildinfo` and `build/vite.config.*` are tracked in git and change on builds. Consider ignoring them.
   - `node_modules/` appears twice in `.gitignore`.
   - `.husky/` is gitignored, so the pre-commit hook isn't shared.
7. **Not covered by tests:**
   - No end-to-end tests: Playwright is template scaffolding, with no `e2e/` folder.
   - The LWC has no Jest tests.
   - The Vitest coverage thresholds have never been run.
   - The Vite dev server (`npm run dev`) was not exercised against the org during this work.
8. **Chunk-size warning.** Vite warns about a JS chunk over 500 kB: about 518 kB for ContactManager, 457 kB for ContactCard. It is a warning only.

## Documentation map

| File | Purpose |
|---|---|
| [README.md](README.md) | Project overview, org setup, build, deploy, tests |
| [AGENT_REPORT.md](AGENT_REPORT.md) | Historical build report: the manual test checklist, the error-shape research, the Contact Card follow-up and the resize fix |
| [ContactManager README](force-app/main/default/uiBundles/ContactManager/README.md) | Features, error handling, data access, code map |
| [ContactCard README](force-app/main/default/uiBundles/ContactCard/README.md) | Embedding chain, record Id, states, frame height, moving to another org |
| `uiBundles/*/CHANGELOG.md` | The template's upstream changelog (not project history) |
