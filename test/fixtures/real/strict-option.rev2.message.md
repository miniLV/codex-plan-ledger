<proposed_plan>
# Add opt-in strict parsing to `ms`

## Summary

Support `ms(value, { strict: true })` so an unparseable string throws a plain `Error` whose message contains the offending input. Preserve existing parsing rules and default behavior.

## Implementation

- In `index.js`, call `parse(val)` once in the existing string branch. If `options.strict === true` and the result is `undefined`, throw `new Error('Unable to parse time string. val=' + JSON.stringify(val))`; otherwise return the result.
- Preserve valid zero, negative, and decimal results. Numeric formatting and existing invalid-input errors remain unchanged.
- Update the public function’s JSDoc to describe the `strict` option, its default, and parse-failure errors.
- Update `readme.md` with successful strict parsing, a strict failure, and the default `undefined` behavior.

## Validation

- Do not add or modify test files.
- Run the existing suite with `npm test` when existing development dependencies are available.
- Run temporary, in-memory Node assertions covering strict failures for malformed strings, unsupported units, whitespace-only strings, and strings exceeding 100 characters; verify errors are plain `Error` instances and contain the offending input.
- Check default and `{ strict: false }` failures still return `undefined`; valid zero, negative, decimal, and 100-character strings still parse.
- Check only literal `true` enables strict mode, numeric formatting still supports `long`, and existing invalid-input errors remain unchanged.

## Recorded Decisions

- Use `{ strict: true }` on the existing `ms()` call; add no new function.
- Throw a plain `Error` containing the offending input. Use the message defined above.
- Change only `index.js` and `readme.md`. Do not add or change test files or dependencies.
</proposed_plan>