# RnD React Integration

This is an R&D project on **Salesforce Multi-Framework**, which lets you build React apps and deploy them to Salesforce as UI bundles. It contains two apps, both built from Salesforce's React UI bundle template. They run in a Trailhead Developer Edition org.

| App | What it does | Where it runs |
|---|---|---|
| [Contact Manager](force-app/main/default/uiBundles/ContactManager/README.md) | Lets you search, create, edit and delete Contacts | Its own Lightning app (App Launcher → **Contact Manager**) |
| [Contact Card](force-app/main/default/uiBundles/ContactCard/README.md) | Shows a read-only card with one Contact's details | Embedded on the Contact record page |

Development stopped after these two apps (2026-11-12). [HANDOFF.md](HANDOFF.md) describes the current state and the open items.

## Contents

- [What the project contains](#what-the-project-contains)
- [Prerequisites](#prerequisites)
- [Connect the org](#connect-the-org)
- [One-time org setup](#one-time-org-setup)
- [Build and deploy](#build-and-deploy)
- [Tests](#tests)
- [Documentation map](#documentation-map)
- [Git](#git)

## What the project contains

This project owns the following metadata:

| Path (under `force-app/main/default/`) | Metadata type | Purpose |
|---|---|---|
| `uiBundles/ContactManager/` | UIBundle | The Contact Manager React app |
| `uiBundles/ContactCard/` | UIBundle | The Contact Card React app |
| `applications/ContactManager.app-meta.xml` | CustomApplication | The Lightning app that opens the ContactManager bundle (`<uiBundle>c__ContactManager</uiBundle>`) |
| `applications/ContactCard.app-meta.xml` | CustomApplication | The Lightning app for the ContactCard bundle (`<uiBundle>c__ContactCard</uiBundle>`) |
| `permissionsets/ContactManager_Access.permissionset-meta.xml` | PermissionSet | Makes both apps visible and grants API Enabled. It grants no object or field permissions. |
| `lwc/contactCardHost/` | LightningComponentBundle | Embeds the Contact Card on Contact record pages with `lightning-ui-embedding` |

Everything else under `force-app/` came from the org: standard apps, objects, StandardValueSets and so on. It was retrieved as a baseline for reference and is not part of the apps.

The following are configured in the org and are **not in source control**:
- The `Contact_Record_Page` Lightning page, edited in Lightning App Builder.
- The `Phone_Required_With_Title` validation rule on Contact.
- The Trusted URLs.
- The Setup settings listed below.

## Prerequisites

- **Salesforce CLI** (`sf`). This machine has two installs: 2.144.6 (under nvm) and 2.157.8 (Program Files). Run `sf --version` to see which one your shell uses. Version 2.108.6 was too old: it has no `sf template generate project` for UI bundles.
- **Node.js 22.** The bundles were built and tested with v22.19.0.
- **An org on Hyperforce with Multi-Framework available.**

## Connect the org

```bash
sf org login web --alias "Servier - RnD React" --instance-url https://wise-moose-5sthg6-dev-ed.trailblaze.my.salesforce.com --set-default
```

To use another org:
- Change the alias and the URL in the command above.
- Change the hardcoded app-domain URL in [contactCardHost.js](force-app/main/default/lwc/contactCardHost/contactCardHost.js).

## One-time org setup

These are manual Setup steps. They are already done in the current org.

1. **Salesforce app domain.** Setup → Quick Find "Multi-Framework" → **Enable Salesforce App Domain**. It serves the bundles from `*.my.salesforce.app`.
2. **Trusted URLs** (Setup → Trusted URLs). Each entry needs CSP context **All** and the **frame-src** directive. Add:
   - `https://*.salesforce.app`
   - The org's Lightning domain (`https://wise-moose-5sthg6-dev-ed.trailblaze.lightning.force.com`)
   - The org's app domain (`https://wise-moose-5sthg6-dev-ed--c.trailblaze.my.salesforce.app`)

   The Contact Card iframe is blocked without these.
3. **My Domain → Routing and Policies.**
   - Turn **Salesforce Edge Network** on.
   - Turn **Require first-party use of Salesforce cookies** off.
4. **Permission set.** Run `sf org assign permset --name ContactManager_Access --target-org "Servier - RnD React"` for each user.
5. **Record page.** In Lightning App Builder, add **Contact Card Host** to the Contact record page, then save and activate.
6. **Validation rule** (only needed for the manual error tests):
   - Name: `Phone_Required_With_Title` on Contact
   - Formula: `AND(NOT(ISBLANK(Title)), ISBLANK(Phone))`
   - Error location: the Phone field

## Build and deploy

A UI bundle deploys whatever is in its `dist/` folder, and `dist/` is not in git. **Always build before you deploy**, or a fresh clone deploys a bundle with no app in it.

Run these from the project root, one command per line. They work in PowerShell and in bash.

```bash
# Contact Manager
npm --prefix force-app/main/default/uiBundles/ContactManager install
npm --prefix force-app/main/default/uiBundles/ContactManager run build
sf project deploy start --source-dir force-app/main/default/uiBundles/ContactManager --target-org "Servier - RnD React"

# Contact Card: the bundle plus its host LWC
npm --prefix force-app/main/default/uiBundles/ContactCard install
npm --prefix force-app/main/default/uiBundles/ContactCard run build
sf project deploy start --source-dir force-app/main/default/uiBundles/ContactCard --source-dir force-app/main/default/lwc/contactCardHost --target-org "Servier - RnD React"

# The apps and the permission set
sf project deploy start --metadata CustomApplication:ContactManager --metadata CustomApplication:ContactCard --metadata PermissionSet:ContactManager_Access --target-org "Servier - RnD React"
```

Notes:
- **`sf project deploy start` with no arguments deploys all of `force-app`.** It succeeds, but it also redeploys the whole retrieved org baseline. Deploy only the folders you changed.
- [.forceignore](.forceignore) excludes five empty StandardValueSets. The Metadata API rejects an empty set ("Required field is missing: standardValue").
- [.forceignore](.forceignore) also excludes every `__tests__` folder, so unit tests are never deployed.

## Tests

Each bundle has Vitest unit tests that use a mocked Salesforce SDK, so they need no org.

```bash
cd force-app/main/default/uiBundles/ContactManager
npx vitest run
```

| Bundle | Test files | Tests |
|---|---|---|
| ContactManager | 8 | 65 |
| ContactCard | 4 | 21 |

The root [package.json](package.json) is the SFDX template's tooling for LWC and Aura: Jest, ESLint and Prettier. The host LWC has no Jest tests.

The manual test checklist for Contact Manager is in [AGENT_REPORT.md](AGENT_REPORT.md#manual-test-checklist).

## Documentation map

| File | What it covers |
|---|---|
| [README.md](README.md) | This overview: setup, build, deploy |
| [HANDOFF.md](HANDOFF.md) | Current state, decisions, gotchas and open items, for whoever picks the project up next |
| [AGENT_REPORT.md](AGENT_REPORT.md) | The build report: the manual test checklist, the error-shape research and the Contact Card follow-up |
| [ContactManager README](force-app/main/default/uiBundles/ContactManager/README.md) | The Contact Manager app: features, error handling, code map, development |
| [ContactCard README](force-app/main/default/uiBundles/ContactCard/README.md) | The Contact Card app: embedding, record context, frame height, development |

The `CHANGELOG.md` in each bundle is the template's upstream changelog, not this project's history.

## Git

- `main` holds all the work and is in sync with `origin` (https://github.com/Adrien-Comforth/Servier---RnD-React).
- The feature branches `feature/contact-crud` and `feature/contact-card` are merged into `main`.
- The commits are split by stage of development. `git log --oneline` reads as the project history.
