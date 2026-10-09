## Strict parsing for `ms`

Add `ms(value, { strict: true })` so unparseable strings throw a plain `Error` whose message contains the offending input string. Calls without strict mode retain their current behavior.

## Implementation

- In `index.js`, capture the result of `parse(val)` in the exported function. If `options.strict` is truthy and the result is `undefined`, throw `new Error('Cannot parse time value: ' + val)`.
- Check specifically for `undefined`, so valid values such as `'0'` and `'0ms'` still return zero.
- Preserve the parser’s grammar and 100-character limit. Strict mode covers both malformed strings and strings rejected by that limit.
- Keep existing validation errors for empty strings, unsupported input types, and nonfinite numbers. Numeric formatting continues to honor `long`, regardless of `strict`.
- Document the option in the existing API documentation and add README examples showing valid strict parsing, a strict parsing error, and default `undefined` behavior.

## Validation

Extend `tests.js` using the existing Mocha and expect.js conventions:

- Invalid syntax, unknown units, whitespace-only strings, and strings longer than 100 characters throw a plain `Error` in strict mode; assert that its message contains the original input.
- The same inputs return exactly `undefined` with strict mode omitted or set to `false`.
- Valid strings, including zero, negative values, decimals, and case-insensitive units, return their existing results with strict mode enabled.
- A syntactically valid 100-character string parses; a 101-character string throws in strict mode.
- Numeric formatting works with `{ strict: true }` and `{ strict: true, long: true }`; existing invalid-input errors remain unchanged.

Run `npm test` after implementation.

## Recorded decisions

- Enable strict mode through the existing options argument.
- Follow the existing `long` option’s truthiness convention.
- Throw a plain `Error` whose message includes the offending input string directly.
- Limit implementation changes to `index.js`, `tests.js`, and `readme.md`.
