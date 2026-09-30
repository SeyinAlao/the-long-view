// One date format for the whole app: "30 Sep 2026".
//
// Day-first with the month as a word, so it can't be misread - "9/3/2026"
// means 3 September to an American reader and 9 March to a Nigerian one.
// Always in Lagos time: pages are rendered on a server running in UTC,
// so without this, a thesis published at 12:30am in Lagos would show the
// previous day's date. Built from parts rather than a locale's own style
// because en-GB now writes September as "Sept".
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Lagos',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatDate(value: string | Date): string {
  const p = Object.fromEntries(parts.formatToParts(new Date(value)).map((x) => [x.type, x.value]));
  return `${p.day} ${p.month} ${p.year}`;
}
