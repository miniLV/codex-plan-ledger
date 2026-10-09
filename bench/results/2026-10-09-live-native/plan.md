## Add multilingual greetings to hello.js

Support English, Spanish, and French, selected with `--lang en|es|fr`.

- Update argument parsing to accept `node hello.js [name] --lang <code>`, allowing the flag before or after the name.
- Default to English and the name `world`, preserving existing invocations.
- Print `Hello, <name>!`, `¡Hola, <name>!`, or `Bonjour, <name> !` for the selected language.
- If `--lang` has no value or an unsupported code, print a clear error with supported codes and exit with a nonzero status.
- Update README usage and add one example per language.

Verify existing default and named greetings, all three language codes, both flag positions, and missing or unsupported language values using direct Node invocations.
