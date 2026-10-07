# DRAFT - not legal advice - needs review by a qualified person

# Privacy Policy

Version: DRAFT (to be dated when published). Not yet in force.

This explains what personal data The Long View collects, why, who
handles it, how long it is kept, and your rights under the Nigeria
Data Protection Act 2023 (NDPA) and the Nigeria Data Protection
Commission's General Application and Implementation Directive 2025
(GAID).

> Notes for the reviewer are in quote blocks like this one. Open
> questions are listed at the end, not guessed. Placeholders are
> [like this].

## 1. Who is responsible

The data controller is [operator's legal name], [address]. Contact for
anything in this policy: [contact email] (parked until stage 1).

## 2. What we collect

| Data | When | Why |
|---|---|---|
| Email address | Sign-up, or from Google | Your account and sign-in; essential messages |
| Name and username | Sign-up, or name from Google | Shown with what you publish |
| Password, stored only as a one-way hash (bcrypt) | Email sign-up | Signing in. We can't read your password |
| Google account id | Google sign-in | Linking your Google sign-in to your account |
| Theses, counter-theses and drafts | When you write them | The service itself. Published ones are public |
| The terms version you accepted, and when | Sign-up, or the next sign-in after a change | A record of what you agreed to |
| Security logs | When you sign in, fail to sign in, or hit a limit | Protecting accounts and the service. Our own logs hold keyed references (one-way codes), never your email, password, IP address or tokens. Our hosts (Vercel, Render) may keep their own request logs, which can include IP addresses [reviewer: their retention] |
| Page view counts (Vercel Web Analytics, when added) | Visiting a page | Counting visits. No cookies. Vercel says a visitor is identified by a hash of the request, discarded after 24 hours |

We don't collect payment details, identity documents, phone numbers
or your trading accounts. Please don't put personal information about
yourself or anyone else in a thesis.

## 3. Why we may use it (lawful basis)

> Reviewer: confirm each basis under NDPA s. 25.

- **To provide the service you signed up for** (contract): your
  account, signing in, publishing.
- **Legitimate interests:** security logs; keeping published theses
  as a permanent public record; counting visits in aggregate.
- **Legal obligation:** when the law requires us to keep or disclose
  data.

We don't sell personal data, use it for advertising, or make automated
decisions about you that have legal or similar effects.

## 4. Who handles it for us (processors)

| Provider | What it does | Where |
|---|---|---|
| Vercel | Hosts the website; page view counts (when added) | United States and its global network |
| Render | Runs the server (API) | United States (Ohio) |
| Neon | Hosts the database | United States (AWS us-east-2, Ohio) |
| GitHub | Runs the nightly backup and stores it encrypted (age); we hold the only key, offline | United States |
| Google | Google sign-in, only if you choose it | Google's own locations |

> Reviewer: data processing terms with each; NDPA s. 29.

## 5. Transfers outside Nigeria

All of the providers above process data outside Nigeria, mainly in the
United States.

> Reviewer: which transfer basis under NDPA Part VIII (ss. 41-43)
> applies, and whether the GAID requires the Commission's approval for
> the transfer instrument used. See open question 5.

## 6. How long we keep it

| Data | Kept |
|---|---|
| Account details | While your account exists; see section 8 for deletion |
| Drafts | Until you discard them or close your account |
| Published theses and counter-theses | Permanently, as the public record (see section 8) |
| Security logs | [90 days] |
| Encrypted backups | 90 days, then deleted automatically |
| Page view counts | Aggregated; visitor hashes discarded after 24 hours (Vercel) |
| An unsaved draft in your browser | Until you publish, discard, sign in or sign out |

## 7. Cookies and browser storage

| Name | Type | Purpose | Lifetime |
|---|---|---|---|
| `session_token` | Cookie (HttpOnly, SameSite=Lax, Secure) | Keeps you signed in | 7 days |
| `oauth_state` | Cookie (signed) | Protects Google sign-in and returns you to your page | 10 minutes |
| `thesis-draft-in-progress` | Your browser's local storage | Keeps your unsaved writing on your own device | Until cleared |

All are needed for things you ask the site to do. There are no
advertising or tracking cookies.

> Reviewer: whether GAID art. 7's "cookie notice" needs more than this
> table, and whether the analytics hash needs consent.

## 8. Your rights

Under the NDPA you can ask us to:

- tell you what data we hold about you, and give you a copy;
- correct it;
- delete it (see the limits below);
- restrict or object to some uses;
- give you your data in a portable format;
- withdraw consent, where we rely on consent.

Write to [contact email]. We'll answer within [30 days].

**Deleting your account.** We delete your email, name, password hash,
Google id and drafts, and replace your username with an anonymous
label. **Published theses and counter-theses stay**, without your name,
because the site's purpose is a record that can't be rewritten, which
you agreed to when publishing.

> Open question 1: is this enough for an erasure request when the text
> itself might identify the author?

You can also complain to the Nigeria Data Protection Commission
(ndpc.gov.ng).

## 9. Security and breaches

- Passwords are hashed; sessions use signed, HttpOnly cookies; all
  traffic is encrypted (HTTPS); backups are encrypted; logs never hold
  emails, IP addresses or tokens.
- If a breach puts your data at risk, we'll tell the Commission within
  72 hours of becoming aware of it, and tell you without delay if the
  risk to you is high (NDPA s. 40; GAID art. 33, as summarised by
  secondary sources; confirm).

## 10. Children

You must be **18 or older** to use an account on The Long View. You
confirm this yourself when you sign up or accept these terms; we don't
verify ages. If we learn an account belongs to someone under 18, we
close it and delete its personal data.

> Lawyer: is a self-declaration enough? What does the NDPA require for
> children's data (for example consent from a parent and an appropriate
> way to verify age)? See open question 8.

## 11. Changes

When this policy changes, the new version is dated, and you're asked
to accept it at your next sign-in if the change affects you.

---

## Open questions for the reviewer

1. Account deletion with published theses that can't be deleted:
   is removing the author's identity (section 8) enough?
2. Registration as a data controller of major importance: the 2024
   guidance's lowest tier covers more than 200 data subjects in six
   months. Is registration needed before the public stage, and from
   when does the count run?
3. The lawful basis for keeping published theses after account
   deletion: contract or legitimate interest?
4. Is a contact email enough for rights requests, or is a named Data
   Protection Officer required at this size?
5. The transfer basis for the US providers, and whether it needs the
   Commission's approval under the GAID.
6. Retention: 90 days for security logs and backups, acceptable?
7. Vercel Web Analytics: is a notice enough, or is consent needed?
8. Age: is a self-declared "18 or older" checkbox enough, and what does
   the NDPA require for children's data (parental consent, verifying
   age)? Is closing an under-18 account and deleting its data the right
   response?

## Sources (read 7 October 2026)

- Nigeria Data Protection Act 2023 and the GAID 2025 (published 20
  March 2025, in force 19 September 2025), via DLA Piper's guide and
  LawPavilion's summary. The NDPC's own PDF link returned 404, so
  article numbers are secondary and must be checked.
- NDPC Guidance Notice on registration of data controllers and
  processors of major importance (2024), via Afriwise and Mondaq.
- Vercel, "Privacy and Compliance" for Web Analytics (last updated
  26 June 2026).
- The app's own code, for the cookies, storage and logging.
