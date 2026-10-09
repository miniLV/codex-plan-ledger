<proposed_plan>
# Add opt-in strict parsing to `ms`

## Summary

Support `ms(value, { strict: true })` so an unparseable string throws an `Error` instead of returning `undefined`. Preserve existing parsing rules and default behavior.

## Implementation

- In `index.js`, call `parse(val)` once in the existing string branch. If `options.strict === true` and the result is `undefined`, throw `new Error('Unable to parse time string. val=' + JSON.stringify(val))`; otherwise return the result.
- Keep valid zero values, negative values, and decimals accepted. Strict mode does not affect numeric formatting or existing input-validation errors.
- Update the public function’s JSDoc to describe `strict`, its default, and parse-failure errors.
- In `readme.md`, add examples of successful strict parsing, a failed strict parse, and the default `undefined` result.

## Test Plan

Extend `tests.js` using its existing Mocha and expect.js patterns:

- Verify malformed strings, unsupported units, and whitespace-only strings return `undefined` by default and with `{ strict: false }`, but throw with `{ strict: true }`.
- Assert the strict error’s type and exact message for a representative failed parse.
- Verify valid zero, negative, decimal, and unit-bearing strings still parse in strict mode.
- Use syntactically valid strings of exactly 100 and 101 characters to verify the existing length boundary: accept 100; return `undefined` or throw for 101 depending on strict mode.
- Verify a truthy non-boolean `strict` value does not enable strict mode.
- Verify numeric formatting works with `strict`, including `{ strict: true, long: true }`, and existing invalid-input errors remain unchanged.
- Install existing locked development dependencies if needed, then run `npm test`.

## Decisions and Defaults

- **D1 resolved:** Use the existing options argument; only literal `true` enables strict mode.
- **D2 resolved:** Throw a standard `Error` with the message defined above.
- Limit changes to `index.js`, `tests.js`, and `readme.md`; add no dependencies or new exports.
</proposed_plan>