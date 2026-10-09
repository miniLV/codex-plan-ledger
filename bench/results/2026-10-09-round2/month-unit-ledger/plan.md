## Add month parsing to `ms`

### Summary

Support `month`, `months`, and `mo` in duration strings. Define a month as one twelfth of the existing 365.25-day year: **30.4375 days, or 2,629,800,000 milliseconds**.

### Implementation

- In `index.js`, add a descriptive month-duration constant derived from `y / 12`. Extend the parser’s unit regex and switch to recognize the three month aliases.
- Use the existing parsing behavior for case, spaces, decimals, and negative values. Keep `m` as minutes.
- Preserve number-to-string formatting; month-sized durations continue to format as days.
- In `readme.md`, add examples for `ms('1 month')` and `ms('2mo')`, and explain the fixed month duration.
- Keep the exported function signature unchanged.

### Validation

- Add tests in `tests.js` for all three aliases, plural quantities, uppercase/mixed-case units, and multiple spaces.
- Verify fractional and negative months, including `.5mo`, `1.5 months`, and `-.5mo`.
- Assert that `12 months` equals `1y`, and that `1m` still equals 60,000 milliseconds.
- Check that unsupported spellings and trailing text return `undefined`.
- Run `npm test` to validate new cases and existing parsing and formatting behavior.

### Chosen defaults

The answers supplied selected `year / 12` and the aliases `month`, `months`, and `mo`. Month parsing uses fixed-duration arithmetic without calendar dates.
