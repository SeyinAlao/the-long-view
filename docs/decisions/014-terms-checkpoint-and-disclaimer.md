# 014 — Terms checkpoint, publish confirmation and disclaimer

## Decision

People agree to the Terms of Service and the Privacy Policy before they
write anything, and confirm what publishing means each time they
publish. Everyone sees what a thesis is. Reading never needs any of it.

- **The disclaimer:** "Each thesis is its author's own opinion, not the
  operator's recommendation, and is not investment advice." In every
  page's footer, under the title of every thesis page, on the thesis
  form and in the sign-up checkbox's label (`frontend/lib/legal.ts`).
- **Sign-up:** a required, unticked checkbox linking both documents.
  Since `2026-10-08` the same box declares the person is **18 or
  older**: a self-declaration, not verification (whether that is enough
  under the NDPA is a question for the lawyer).
  The API refuses a sign-up without `acceptedTerms: true` (400) and
  stores `User.termsVersion` and `User.termsAcceptedAt`.
- **Accepting later:** `/welcome/terms` (`POST /auth/accept-terms`) for
  a new Google account, an account from before this change, and
  everyone after the version changes. Signing in with a password or
  Google, and every page for writing (the desk, the thesis form, My
  research, editing), send such a person there first and then on to
  where they were going (`requireWritingUser`, `safeNextPath`).
- **The API enforces it, not only the pages:** `TermsAcceptedGuard` on
  every write (create, edit, publish, counter, discard) answers 403
  `terms_not_accepted`. `/auth/me` reports `termsAccepted`, never the
  version.
- **Publishing:** an unticked checkbox above the buttons: "I understand
  this is published as my own opinion, not investment advice, and that
  a published thesis can't be edited or deleted." The API refuses a
  publish without `{ confirmed: true }` (400).
- **The version** is one constant, `TERMS_VERSION` in
  `backend/src/auth/terms.ts`: the date the current text took effect.
  Changing it makes everyone accept again. Change it in the same PR as
  the documents, and only for a change people need to agree to.
- **The documents** are rendered at build time from `docs/legal/*.md`
  (`/terms`, `/privacy`), so the pages can't drift from the files a
  reviewer will read. **Not yet reviewed by a qualified person:** both
  stay headed "DRAFT - not legal advice - needs review by a qualified
  person" until one has, and that review is a launch-gate item before
  the public stage.
- **A footer slot** for "Source: NGX, prices as of <date>"
  (`SiteFooter`'s `priceSource`), not yet filled (backlog).

## Interface and accessibility

Real checkboxes with their labels, never pre-ticked. The buttons stay
enabled: pressing one unticked shows an error tied to the box
(`aria-describedby`), announced (`role="alert"`), and moves focus to
the box, which a disabled button can't explain to a screen-reader user.
axe checks sign-up, the accept step and the publish form, each with its
error showing, and the two documents.

## Not done, deliberately

- **No wall for anonymous readers.** Shared links are the point of a
  public record; the footer and the thesis pages carry the disclaimer.
  A wall would also have to be client-side to keep the Ledger cached
  (ADR 013), and it would need browser storage to remember the choice.
- **Non-commercial** until a qualified person has reviewed the legal
  drafts: no ads, fees, sponsorship or affiliate links (Terms, section 1).

## Dependencies

`react-markdown` and `remark-gfm` (frontend), to render the two
documents. Server Components only, at build time, so no client
JavaScript; react-markdown escapes everything and renders no raw HTML,
so a document can't inject markup. The production `npm audit` count
didn't change (8 before and after).
