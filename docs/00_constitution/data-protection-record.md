# Data Protection Record

```yaml
id: IPS-DATA-PROTECTION-SCHOOL-COMMITTEE
status: draft
owner: ssfskype@gmail.com
created: 2026-07-19
last_updated: 2026-07-19
completeness_level: partial
upstream:
  - BUSINESS.md
  - SYSTEM.md
  - CLAUDE.md
  - docs/00_constitution/constitution.md
  - docs/00_constitution/sensitive-data-policy.md
  - prisma/schema.prisma
downstream: []
related_adrs: []
```

## Purpose and status

Internal record of processing activities for the strilkove.cz parent-committee
platform. It is the operator-facing counterpart to the public `/gdpr` page
(`app/(public)/gdpr/page.tsx`), which is parent-facing copy and is **not** a
record of processing.

`status: draft` and `completeness_level: partial` are deliberate. This document
carries unresolved `[MISSING: ...]` and `[UNKNOWN: ...]` markers, which the IPS
readiness gate treats as blocking (`docs/00_constitution/operational-gates.md`).
It becomes `approved` / `validated` once the owner answers the questions in
[Open questions for the owner](#open-questions-for-the-owner).

Every claim below is traceable to a schema model, a route file, or an explicit
owner decision recorded in `BUSINESS.md`. Where nothing was traceable, the gap
is marked rather than filled.

This document contains no real parent, child, teacher or payment records, per
`docs/00_constitution/sensitive-data-policy.md`.

---

## 1. Controller

`[MISSING: legal identity of the controller for strilkove.cz — registered name and IČ of the zapsaný spolek]`

What is established:

- `BUSINESS.md` → *Legal context*: the committee funds are owned by a
  registered `zapsaný spolek` (Czech civil association), and there is no
  personal bank account for committee funds. The spolek is therefore the
  probable controller.
- The public page names the controller as "Školní výbor ZŠ Střílky ·
  strilkove.cz" (`app/(public)/gdpr/page.tsx`, contact section). That is a
  description, not a legal entity with an IČ.
- `components/ConsentBanner.tsx` states in its own comment that "the data
  controller here is the school committee, not Alfares".

What must not be assumed: **Alfares s.r.o. (IČ 27138038) is the controller for
the other ecosystem sites, not automatically for this one.** Alfares operates
the infrastructure this platform runs on and is, on the current evidence, a
**processor** here (see §5). Recording Alfares as controller would misdirect
every subject-access request.

`[MISSING: whether a joint-controller arrangement (Art. 26) exists between the spolek and Alfares s.r.o., and if so its allocation of responsibilities]`

`[MISSING: DPO appointment — whether one is required and, if so, who]` — Art. 37
is unlikely to compel appointment at this scale, but the decision is the
owner's, not the agent's.

---

## 2. Categories of data subjects

| Subject | How they enter the system | Account? |
|---|---|---|
| Parents / guardians | Self-registration through `auth-microservice`, then `app/api/onboarding/*` | Yes — `profiles` |
| Children | Entered **by their parent** via `app/api/onboarding/children/route.ts` and `app/api/profile/children/route.ts` | No — ADR-005 |
| Teachers | `classes.teacher_user_id`; also hold profiles when they register | Yes, when registered |
| School staff | Domain role `school_staff`; approve registrations (`app/api/admin/approvals/*`) | Yes |
| Committee members / admins | Domain roles `committee`, `admin` | Yes |
| Website enquirers | `app/api/leads/submit/route.ts` — forwarded off-platform (§5) | No |

Children are the sensitive case and are treated separately in §6.

---

## 3. Processing activities, data categories and lawful basis

Lawful bases below are **proposed from the code**, not legally settled. The
public page currently claims consent + legitimate interest only; that is
narrower than what the code actually does (see §9).

`[MISSING: owner/counsel confirmation of the lawful basis per row]`

### 3.1 Account and membership administration

- **Data:** `profiles` — `user_id`, `email`, `first_name`, `last_name`,
  `title_before`, `title_after`, `phone` (optional), `bio` (optional),
  `language`, `participation_type`, `avatar_file_key`, `onboarding_status`,
  `approval_status`, `approved_by`, `approved_at`, `rejection_reason`.
- **Also:** `families`, `family_members`, `user_roles`,
  `role_upgrade_requests` (`reason`, `rejection_reason` are free text).
- **Source:** `prisma/schema.prisma`; `app/api/onboarding/profile/route.ts`,
  `app/api/profile/route.ts`, `app/api/admin/users/*`.
- **Proposed basis:** Art. 6(1)(b) — membership relationship with the spolek.
- **Note:** identity credentials (password, sessions, tokens) are **not** held
  here. Authentication is delegated to `auth-microservice` (INV-001, ADR-001);
  this platform stores only `user_id` and a mirrored `email`.

### 3.2 Consent capture

- **Data:** `termsAccepted`, `privacyPolicyAccepted`,
  `parentCommitteeParticipation`, `version`, `timestamp`, `autoApproved` —
  written to `audit_logs.metadata` under action `onboarding.consent_recorded`.
- **Source:** `app/api/onboarding/consent/route.ts`.
- **Proposed basis:** Art. 7(1) — this is the record of consent itself, and
  Art. 5(2) accountability for retaining it.
- **Note:** consent is stored **only** as an audit event. There is no
  dedicated consent table and no withdrawal endpoint. See §9.

### 3.3 Child registration

Covered in §6.

### 3.4 Financial contributions (QR bank payments)

- **Data:** `payment_intents` — `user_id`, `family_id`, `amount_czk`,
  `currency`, `variable_symbol` (unique), `message`, `status`, `school_year`,
  `semester`, `expires_at`, `paid_at`.
- **Reconciliation:** `payment_reconciliation_events` — `source`,
  `amount_czk`, `variable_symbol`, `bank_transaction_id`, `raw_reference`,
  `matched_by`, `created_by`.
- **Source:** `app/api/payments/qr/route.ts`, `app/api/payments/status/route.ts`,
  `app/api/admin/payments/route.ts`, `app/api/admin/payments/[id]/confirm/route.ts`.
- **Proposed basis:** Art. 6(1)(b) for the contribution itself; Art. 6(1)(c)
  for the accounting retention that follows.
- **No card data is processed.** QR codes are server-generated (ADR-004,
  Critical Rule 6); the parent pays in their own banking app. But payment
  *records* — amounts, variable symbols, bank transaction references — are
  stored here. The public page's phrasing on this point is misleading (§9).

### 3.5 Expense transparency

- **Data:** `expenses` — `title`, `description`, `category`, `amount_czk`,
  `spent_at`, `receipt_file_id`, `public_visible`, `created_by`, `approved_by`.
- **Source:** `app/api/admin/expenses/route.ts`, `app/api/public/report/route.ts`.
- **Proposed basis:** Art. 6(1)(f) — transparency toward the membership.
- Only `public_visible = true` expenses reach the public endpoint. Receipt
  files themselves are not exposed there.

### 3.6 Volunteer task coordination

- **Data:** `tasks` (`created_by`, `assigned_to`, `verified_by`,
  `raw_transcript`, `ai_draft_meta`, `audio_file_id`), `task_assignments`,
  `task_comments`, `task_status_events` (`actor_user_id`, `reason`),
  `task_photos`, `task_videos`.
- **Source:** `app/api/tasks/**`.
- **Proposed basis:** Art. 6(1)(f).
- `raw_transcript` and `ai_draft_meta` come from voice input and are
  free-text: they can contain anything a parent said, including child names.
  Treat as unstructured personal data.

`[UNKNOWN: which component performs voice transcription for tasks and ideas, and whether audio leaves the alfares host — no transcription call was found in this repo's routes]`

### 3.7 Feedback and ideas

- **Data:** `feedback_items` and `ideas` — `user_id` / `submitted_by`
  (nullable), `is_anonymous`, `text` / `description`, `voice_file_key`,
  `voice_transcript`, `categories`, `moderated_by`, `assigned_to`; plus
  `idea_votes`, `idea_comments`, `idea_comment_likes`, `idea_photos`,
  `idea_videos`.
- **Source:** `app/api/feedback/**`, `app/api/ideas/**`.
- **Proposed basis:** Art. 6(1)(f), or (a) where a parent volunteers content
  beyond what the purpose needs.
- **Anonymity is presentational, not structural.** `is_anonymous = true` does
  not null out `user_id` / `submitted_by` in the schema. The submitter remains
  identifiable to anyone with database access. A parent told their feedback is
  anonymous may reasonably expect otherwise.
  `[MISSING: owner decision — either strip the author id on anonymous submission, or correct the wording shown to parents]`

### 3.8 Messages

- **Data:** `messages` — `from_user_id`, `body`, `parent_id`,
  `is_from_committee`, `read_at`.
- **Source:** `app/api/messages/route.ts`, `app/api/messages/[id]/reply/route.ts`.
- **Proposed basis:** Art. 6(1)(f).
- Free text; may contain anything, including child-identifying detail.

### 3.9 Events

- **Data:** `events` (`created_by`, `location`, `capacity`),
  `event_registrations` (`user_id`, `status`).
- **Source:** `app/api/events/route.ts`, `app/api/events/[id]/register/route.ts`.
- **Proposed basis:** Art. 6(1)(b) / (f).

### 3.10 Recognition and gamification

- **Data:** `user_achievements` (`user_id`, `achievement_key`, `awarded_at`,
  `metadata`), surfaced by `app/api/hall-of-fame/route.ts`.
- **Proposed basis:** Art. 6(1)(f).

### 3.11 Public transparency report

- **Data exposed without authentication** by `app/api/public/report/route.ts`:
  aggregate collected/spent totals, `public_visible` expenses, all tasks for a
  school, and for each task a **`responsibleName` resolved from
  `profiles.first_name` + `profiles.last_name`** (route lines 43–56).
- **Proposed basis:** Art. 6(1)(f).
- INV-006 / Critical Rule 4 (no public individual payment status) **is**
  respected — payments appear only as `_sum` aggregates.
- But adult volunteers' full names are published to unauthenticated visitors.
  That is lawful only if volunteers were told. No consent flag governs it.
  `[MISSING: owner decision — is publishing volunteer full names on the public report intended, and were volunteers informed?]`
- No child data is reachable through this endpoint.

### 3.12 Audit logging

- **Data:** `audit_logs` — `tenant_id`, `school_id`, `actor_user_id`,
  `action`, `entity_type`, `entity_id`, `metadata` (JSON), `request_id`,
  `ip_hash`.
- **Source:** `lib/db/audit.ts`; written on every mutation in the same
  transaction (INV-007).
- **Proposed basis:** Art. 6(1)(f) / Art. 5(2) accountability.
- IP addresses are stored **hashed** (`ip_hash`), never raw — a genuine
  minimisation measure worth keeping.
- `metadata` is free-form JSON and does carry personal data: the
  account-deletion event records the departing user's email
  (`app/api/account/delete-request/route.ts`), and the consent event records
  the full consent payload. Audit logs are therefore in scope for erasure
  balancing, not exempt from it.

### 3.13 Website enquiries

- `app/api/leads/submit/route.ts` forwards the submitted body verbatim to
  `LEADS_SERVICE_URL`, defaulting to **`https://leads.alfares.cz`** — an
  Alfares-operated service outside this platform's database.
- Nothing is stored locally.
- `[MISSING: controller/processor status for leads.alfares.cz in relation to strilkove.cz enquiries, and the retention applied there]`

---

## 4. Storage of files

Uploaded media (`avatar_file_key`, `receipt_file_id`, `task_photos.file_id`,
`task_videos.file_id`, `idea_photos.file_id`, `idea_videos.file_id`,
`voice_file_key`, `audio_file_id`) live in MinIO, reached through presigned
URLs (`app/api/storage/upload-url/route.ts`, `lib/storage/client.ts`; presign
TTL 300s).

The database stores keys, not bytes. **Deleting a database row does not delete
the object in MinIO** — no deletion path to storage exists in this repo.

---

## 5. Processors and sub-processors

Derived from the Infrastructure Integrations table in `CLAUDE.md` and the Vault
paths recorded there.

| Processor | Role | Data reaching it | Location |
|---|---|---|---|
| `auth-microservice` (`:3370`) | Identity, JWT, roles | Email, credentials, sessions | alfares host, `statex-apps` |
| `db-server-postgres` (`:5432`) | Primary datastore, DB `school_committee_platform` | All categories in §3 | alfares host, `statex-apps` |
| `logging-microservice` (`:3367`) | Structured logs | `request_id`, `route`, `user_id`, error text — see caution below | alfares host, `statex-apps` |
| `notifications-microservice` (`:3368`) | Transactional email | Recipient address, user name + email in `new_user_pending_approval` payload | alfares host, `statex-apps` |
| MinIO (`:9000`) | Object storage | Avatars, receipts, task/idea photos and video, voice recordings | alfares host, `statex-apps` |
| Internal QR generator | Czech QR payment strings | Amount, variable symbol, account details | In-process, no third party |
| `leads.alfares.cz` | Enquiry intake | Whatever the enquiry form submits | Alfares-operated, external to this app |

**Operator of all of the above:** the services run on the alfares Kubernetes
host under Alfares s.r.o. operation. If the controller is the spolek (§1), then
Alfares s.r.o. is a **processor** and an Art. 28 processing agreement is
required.

`[MISSING: Art. 28 data-processing agreement between the spolek and Alfares s.r.o. — does one exist?]`

**Sub-processors:**

- **Email delivery.** `SMTP_HOST` for this service resolves to `localhost` —
  mail is handed to a local MTA on the alfares host rather than to a named
  ESP. `[UNKNOWN: the upstream relay/smarthost the local MTA forwards to — not readable from this environment. If it is an external provider (e.g. an SMTP relay service), that provider is a sub-processor and must be listed here.]`
- **Hosting / datacentre.** `[MISSING: the hosting provider and physical location of the alfares server. The public page asserts "encrypted servers in the EU" — that claim is currently unverified in this repo.]`
- **No analytics, advertising or tag-management vendor is present.** Confirmed
  by `components/ConsentBanner.tsx` (§7).

---

## 6. Children's data

ADR-005 / INV-005: **no child user accounts exist and none may be created.**
Children are not users. Child-identifying data nonetheless exists.

### What is stored

`children` table (`prisma/schema.prisma`):

| Field | Nullable | Notes |
|---|---|---|
| `first_name` | **No — required** | |
| `last_name` | **No — required** | |
| `birth_year` | Yes | Year only. No full date of birth, no rodné číslo anywhere in the schema. |
| `class_id` | No | FK to `classes` |
| `school_id` | No | |
| `parent_user_id` | No | The registering parent |
| `family_id` | Yes | |
| `display_label` | Yes | Intended as the non-identifying alternative |
| `notes` | Yes | Free text |
| `parent_consent` | No — **defaults to `true`** | |

### Why

Contributions and volunteer coordination are organised per class and per
family, so a child must be linked to a class and to a paying parent
(`app/api/onboarding/children/route.ts`).

### Who can see it

Child records are reachable only through authenticated, role-checked routes
(`app/api/profile/children/route.ts`, admin routes). The BFF enforces
authorization; frontend role checks are UX only (INV-009). `/api/public/report`
exposes no child data (§3.11).

### Three findings the owner should see

1. **Names are mandatory, not optional.** `first_name` and `last_name` are
   `NOT NULL`. `display_label` exists as a gentler alternative but nothing
   requires its use and nothing prevents the real name being stored alongside
   it. The public page tells parents the opposite (§9).
2. **`parent_consent` defaults to `true`.** A child row created without any
   explicit parental act is recorded as consented. A default is not consent.
   Since the parent is the one entering the data, the practical risk is low,
   but the field cannot be used as evidence of consent in its current form.
3. **Free-text fields elsewhere may contain child names** — `children.notes`,
   `tasks.raw_transcript`, `messages.body`, feedback and idea text, voice
   transcripts. These are not covered by any structural control.

### Cross-reference

`docs/00_constitution/sensitive-data-policy.md` forbids child-identifying data
in documentation, prompts, tests, logs, screenshots, plans and reports, and
requires every task to carry a sensitive-data classification (`child-safety`
applies to anything touching the `children` table or the free-text fields
above). That policy governs how this data is *handled by agents and
documentation*; this section governs how it is *processed by the product*.
Both apply.

`[MISSING: retention period for child records — see §8]`
`[MISSING: whether a DPIA has been carried out. Processing children's data at scale is an Art. 35 trigger worth assessing even for one school.]`

---

## 7. Cookies and browser storage

Strictly necessary only.

- **Authentication/session cookies** — set by the platform via
  `lib/auth/session.ts`; required to keep a parent signed in. Includes an
  onboarding-status cookie.
- **`alfares.consent`** — records the acknowledgement of the cookie notice
  together with a version string (`alfares-consent-v1`), so that changed
  wording re-prompts. Set by `components/ConsentBanner.tsx`, which mounts the
  shared banner vendored from `shared/packages/consent`.

There are **no analytics, advertising, or cross-site tracking cookies**, and no
third-party tags. The banner is therefore a disclosure with a single
acknowledgement, not a preference centre — there is nothing to toggle. Under
§89 ZoEK / the ePrivacy rules, strictly necessary storage does not require
consent; the notice serves the transparency duty.

The banner's policy link points at this platform's own `/gdpr` page, not at an
Alfares policy — correct, given §1.

---

## 8. Retention

**No retention is implemented.** A search of `lib/`, `app/` and `scripts/` for
retention, cleanup, purge or anonymisation logic returned nothing. Nothing in
this platform expires, ages out, or is anonymised on a schedule. Every period
below is therefore a decision the owner still has to make and then someone has
to build.

| Category | Retention |
|---|---|
| `profiles` | `[MISSING: retention after membership ends]` |
| `children` | `[MISSING: — likely tied to the child leaving the school]` |
| `families`, `family_members` | `[MISSING: ...]` |
| `payment_intents`, `payment_reconciliation_events` | `[MISSING: — constrained below by Czech accounting law, see note]` |
| `expenses` and receipt files | `[MISSING: — same accounting constraint]` |
| `tasks` and task media | `[MISSING: ...]` |
| `feedback_items` | `[MISSING: ...]` |
| `ideas`, votes, comments, media | `[MISSING: ...]` |
| `messages` | `[MISSING: ...]` |
| `events`, `event_registrations` | `[MISSING: ...]` |
| `audit_logs` | `[MISSING: ...]` |
| Consent records (inside `audit_logs`) | `[MISSING: — must outlive the processing it authorises]` |
| MinIO objects | `[MISSING: — note that no deletion path to storage exists at all, §4]` |
| `user_achievements` | `[MISSING: ...]` |

**Note on the accounting floor:** Czech accounting and VAT law impose minimum
retention on accounting records, which sets a floor under the payment and
expense rows regardless of what a parent requests. The exact period and which
rows qualify as accounting records is a question for the owner's accountant —
this document does not assert a number.

The public page already states specific periods to parents (12–24 months for
feedback, 24–60 months for audit logs, "per accounting rules" for payments).
Those are commitments made without an implementation behind them. See §9.

---

## 9. Divergences from the public `/gdpr` page

Per the task's definition of done, these are **stated, not quietly
reconciled**. Source: `app/(public)/gdpr/page.tsx`.

| # | The public page says | The code says | Severity |
|---|---|---|---|
| 1 | "Neukládáme jméno … dětí" — we do not store children's names | `children.first_name` and `children.last_name` are `NOT NULL` (§6) | **Direct contradiction** |
| 2 | "Vedeme pouze přiřazení ke třídě a volitelný identifikátor" — only class assignment and an optional identifier | Class assignment *and* mandatory names, plus optional `birth_year` and free-text `notes` | **Direct contradiction** |
| 3 | "Platební data nejsou ukládána — zpracovává je banka přímo" — payment data is not stored | No card data, true — but `payment_intents` and `payment_reconciliation_events` store amounts, variable symbols, statuses, `bank_transaction_id` and `raw_reference` (§3.4) | **Misleading as written** |
| 4 | "ani fotografie dětí bez samostatného souhlasu" — no photographs of children without separate consent | No separate photo-consent mechanism exists. Task and idea photo upload has no child-consent gate. | **Unenforced commitment** |
| 5 | Retention: profile until membership ends; feedback 12–24 months; audit logs 24–60 months | No retention implementation exists at all (§8) | **Unenforced commitment** |
| 6 | "Data vymažeme nebo anonymizujeme do 30 dnů" — deleted or anonymised within 30 days | `deleteUserFromApp` (`lib/db/users.ts:88`) is immediate, but partial — see below | **Partially met** |
| 7 | Basis is "souhlas … a oprávněný zájem" — consent and legitimate interest | Contract (membership, contributions) and legal obligation (accounting) also apply (§3) | Incomplete |
| 8 | "Přístup mají pouze oprávnění členové výboru" — only authorised committee members have access | True for child and payment data; but volunteer full names are published to unauthenticated visitors by `/api/public/report` (§3.11) | Incomplete |
| 9 | "Data jsou uložena na šifrovaných serverech v EU" | Not verifiable from this repo; hosting provider and location unrecorded (§5) | Unverified |
| 10 | "Souhlas můžete kdykoli odvolat" — consent can be withdrawn at any time | No withdrawal endpoint exists. Consent lives only as an `audit_logs` entry (§3.2); the only available action is full account deletion. | **Unimplemented** |

### On #6 — what account deletion actually does

`deleteUserFromApp` (`lib/db/users.ts:88–111`) runs one transaction that
revokes roles and deletes: `user_achievements`, `idea_comment_likes`,
`idea_comments`, `idea_votes`, `task_comments`, `event_registrations`,
`role_upgrade_requests`, **`children`** (by `parent_user_id`), and finally the
`profile`.

It does **not** touch:

- `feedback_items.user_id`
- `ideas.submitted_by`
- `messages.from_user_id` and message bodies
- `payment_intents.user_id` and `payment_reconciliation_events`
- `task_assignments.user_id`, `tasks.created_by` / `assigned_to` / `verified_by`
- `tasks.raw_transcript` and voice transcripts
- `family_members` rows
- `audit_logs` (including the deletion event, which records the departing
  user's email)
- **any MinIO object** — avatar, receipts, photos, video, voice recordings all
  survive (§4)

Some of these retentions are defensible (accounting obligation over payments;
accountability over audit logs). Others look like oversights rather than
decisions — orphaned `user_id` values in feedback, ideas, messages and task
assignments, and every uploaded file. The distinction matters: a defensible
retention should be recorded here as such, and the rest should be fixed.

`[MISSING: owner decision per row above — retain under legal obligation, anonymise, or delete]`

**Recommendation:** the public page should not be edited to match the code
until the owner has decided which side is wrong. In several rows the *page* is
the better commitment and the *code* should be brought up to it — particularly
#1, #4 and #10.

---

## 10. Subject rights

| Right | Current mechanism | Gap |
|---|---|---|
| Access (Art. 15) | No export endpoint | `[MISSING: process — who assembles the export, from which tables, in what format]` |
| Rectification (Art. 16) | Self-service via `app/api/profile/route.ts` and `app/api/profile/children/route.ts` | Adequate for profile and child data |
| Erasure (Art. 17) | `POST /api/account/delete-request` — immediate and partial (§9) | Coverage gaps listed above |
| Restriction (Art. 18) | None | `[MISSING: process]` |
| Portability (Art. 20) | None | `[MISSING: process]` |
| Objection (Art. 21) | None | `[MISSING: process — relevant to the Art. 6(1)(f) activities in §3]` |
| Withdraw consent (Art. 7(3)) | None — see §9 #10 | `[MISSING: mechanism]` |
| Complain to a supervisory authority | Public page correctly names Úřad pro ochranu osobních údajů (uoou.cz) | Adequate |

**Who responds:** `[MISSING: named contact and response process. This follows directly from §1 — until the controller is identified, there is no one accountable for answering a subject-access request.]` The public page tells parents to
"log in or contact us by email" without giving an address.

`[MISSING: personal-data-breach notification process — who assesses, who notifies ÚOOÚ within 72 hours, and who informs affected parents]`

---

## Open questions for the owner

Answer these in one pass and this document can move to `approved` /
`validated`.

**Blocking — legal identity**

1. Who is the controller for strilkove.cz? Registered name and IČ of the
   spolek. (§1)
2. Is there an Art. 28 processing agreement with Alfares s.r.o.? (§5)
3. Is a DPO required, and if so who? (§1)
4. Is a DPIA needed for the children's data? (§6)
5. Named contact and process for subject requests and for breach
   notification. (§10)

**Blocking — retention**

6. A period for each row in the §8 table, including the accountant's answer on
   the accounting floor for payments and expenses.

**Product decisions with a legal consequence**

7. For each item account deletion currently leaves behind (§9): retain under
   legal obligation, anonymise, or delete? Note that no deletion path to MinIO
   exists yet in any case.
8. Should anonymous feedback and ideas actually be anonymous in the database,
   or should parents be told they are attributable? (§3.7)
9. Is publishing volunteer full names on the public transparency report
   intended, and were volunteers told? (§3.11)
10. Should child names remain mandatory, or should `display_label` become the
    primary identifier as the public page already promises? (§6, §9 #1)
11. Is a separate photo consent needed, as the public page states? (§9 #4)
12. Should consent withdrawal exist as an action short of account deletion?
    (§9 #10)

**Facts to supply**

13. Hosting provider and physical location of the alfares server. (§5)
14. The SMTP relay behind the local MTA, if it is an external provider. (§5)
15. Controller/processor status and retention for `leads.alfares.cz`. (§3.13)
16. Which component transcribes voice input, and whether audio leaves the
    alfares host. (§3.6)

---

## Maintenance

Update this record whenever a migration under `prisma/migrations/` adds or
removes a personal-data field, an integration in the `CLAUDE.md` table changes,
or the `/gdpr` page is reworded. A change to any of those without a
corresponding change here puts the two documents back out of step — which is
the condition §9 exists to prevent.
