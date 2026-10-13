# 012 — Prices come from NGX's equities JSON, not its web page

## Decision

The daily refresh reads closing prices from the JSON endpoint that
NGX's public price-list page itself uses:

`https://doclib.ngxgroup.com/REST/api/statistics/equities/?market=&sector=&orderby=&pageSize=300&pageNo=0`

- **One plain `GET` per run.** It sends `Accept: application/json;odata=verbose`
  and a User-Agent that names the app (`TheLongView/1.0 (+site URL)`)
  instead of posing as a browser. There is a 30 s timeout, no retry and
  no Chromium.
- **One adapter.** `ngx-equities-source.ts` is the only file that knows
  the source. It turns the response into `MarketPrice` (ticker, close
  price, percent change, trade date). A future source change replaces
  that file and its fixture, nothing else.
- **The fields we depend on**, per row:
  - `Symbol`: the ticker. It must match `^[A-Z][A-Z0-9]{1,14}$`.
  - `ClosePrice`: a number above 0.
  - `PercChange`: a number, or null, which is read as 0.
  - `TradeDate`: a string starting `YYYY-MM-DD`.

  A row missing a usable symbol, price or date is skipped and counted.
  The body must be a JSON array.
- **Checks before anything is written** (`feed-checks.ts`). The
  trading-hours guard still runs first. Then the refresh refuses on:
  - an HTTP status other than 200
  - fewer than 100 usable prices
  - a newest `TradeDate` more than 5 calendar days before today in
    Lagos. A frozen feed must not stamp old prices as fresh, because
    publishing trusts the newest price row (ADR 004). Five days allows
    a long weekend.
- **What a refusal reports:** only numbers and short labels: status,
  content type, body length, rows, valid, invalid, trade dates and the
  Lagos time. It never includes any of the response's content.
- **`npm run market-data:check`** (backend) runs the same fetch and
  checks with no database and no `.env`, and prints three closes to
  compare with NGX's official list.

## Why

On 5 and 6 October the refresh parsed 0 prices. The page still loads
(541,924 characters, title "Equities Price List - Nigerian Exchange
Limited"). But its table now arrives empty, and an inline jQuery script
fills it from the endpoint above. Our Chromium fetch blocked every
request except the HTML document, so the table stayed empty. The
endpoint answers a plain request: HTTP 200, 146 equities, all dated
that day.

## Risks, stated plainly

- **The endpoint is undocumented.** NGX can change or remove it
  without notice, as it changed the page. The refusals above make a
  change fail safe: nothing is written, and the failed run emails.
  Publishing then stops 7 days after the last success (ADR 009, "When
  a day is missed").
- **NGX's terms.** NGX's Terms & Conditions (ngxgroup.com/terms-and-conditions,
  read 6 October 2026) say: "You shall not conduct any systematic or
  automated data collection activities (including scraping, data mining,
  data extraction and data harvesting) on or in relation to the Website
  without NGX Group's/its Affiliates' express written consent". They
  also say NGX content may not be used without its prior written
  permission.
  - This applied equally to the old page scraper.
  - One scheduled request per weekday (plus occasional manual test runs
    during development) keeps the load minimal, but it doesn't make the
    access permitted.
  - Neither host serves a `robots.txt` (404 on both, 6 October). For
    `ngxgroup.com`, which blocks plain requests, that 404 may come from
    its bot protection rather than proving none exists.
  - **What NGX's market data documents say** (Pricelist, Market Data
    Policy, End User and Distributors agreements, Historical Data
    Policy, Usage Form; read 13 October 2026, not legal advice):
    - None of them mentions this endpoint. The licences cover data
      received from an authorised distributor; the only rule that
      reaches our collection is the website terms above.
    - No free, non-commercial or educational licence exists. Paid
      ones are annual plus 7.5% VAT: Website/Mobile End of Day licence
      NGN 120,000 or US$1,000; distributor End of Day licence
      NGN 1,500,000 or US$10,000; external distribution NGN 400,000 or
      US$1,500 per firm (Pricelist 1.1, 1.2, 3.2). How an end-of-day
      licence is delivered is not stated.
    - Showing closes on a public site takes NGX's usage form and
      approval before display, and a signed Market Data Agreement
      (Policy 8.2.1); a website notice against copying and scraping
      (8.2.7); and NGX's acknowledgement (End User Agreement 11.13).
    - Derived data (our percentage moves and graded outcomes) counts
      as Market Data if the underlying close can be worked out from it
      (Policy 6.2).
    - These documents are about display and redistribution, which the
      four conditions below do not cover. Whether they apply to a free
      site that takes nothing from NGX's feeds is a question for a
      lawyer, and for NGX.
  - **Asked 7 October 2026**, by email to NGX's contact centre; no
    reply by 13 October. A follow-up to the market data desks follows.
  - **Decided 6 October 2026 (Seyin):** ask NGX in writing for
    permission (non-commercial use, one request per weekday on a
    schedule, plus occasional manual test runs during development). Until NGX
    answers, accept the risk in writing, on these conditions:
    - one request per run, no retry
    - an honest User-Agent naming the app
    - "Source: NGX, prices as of <date>" on the site before any public
      stage of the rollout
    - no republishing of NGX's full price list: the site shows a price
      only where a thesis needs it.

    Before the public stage there must be either NGX's written consent
    or this acceptance with all four conditions met. A refusal from NGX
    reopens the decision: a licence under NGX's Market Data Agreement
    (above; any spending needs Seyin's explicit approval, because of the
    no-spend rule) or another source. NGX's price list files its Market
    Data Portal under dealing members, so X-DataPortal is not assumed to
    be a way to show prices on a website.
- **GitHub's runners** might be refused where a laptop isn't. Plan B
  is below.

## Plan B (not built)

If the runners get a 403, a challenge page or a timeout from the plain
request, Chromium loads the page without blocking the page's own
requests, and we read the JSON the page fetches. The page fills its
table from that endpoint.

- **The change:** in a new `ngx-page-source.ts`, launch Puppeteer
  (still installed). Allow `document`, `script` and `xhr` requests and
  abort images, fonts and styles. Listen with
  `page.waitForResponse(url => url.startsWith(NGX_EQUITIES_URL))` and
  pass that response's status, type, length and JSON to the same
  `assessFeed`. The parser, checks, tests and everything after them
  stay the same.
- **The cost:** about 40 lines and a test with a fake page. Each run
  takes about 10-30 s longer and needs Chromium again on the runner.
- **The time:** about half a day, including a manual run to confirm.

## Follow-ups

- Remove Puppeteer once this source has run cleanly for a week: the
  dependency, `PUPPETEER_SKIP_DOWNLOAD` in `ci.yml`, `render.yaml` and
  the Playwright config, `ci.yml`'s comment about the old fetch, and
  the private workflow's comment. Keep it until then for Plan B.
- On the site: "Source: NGX, prices as of <date>", and an alert when
  the newest price is more than 2 days old (docs/backlog.md).
