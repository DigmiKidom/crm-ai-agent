import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // `t` is the translator, bound once per component via useT() (or destructured
    // from getServerT()). Anything else named `t` in a nested scope silently
    // shadows it, and the failure is a runtime "t is not a function" that only
    // fires when that branch renders — a map callback named `(t)` in the landing
    // page editor shipped exactly that bug. Shadowing is an error, not a style
    // preference, so it's caught at lint time instead.
    files: ["app/**/*.js", "components/**/*.js", "lib/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
    },
    rules: {
      "no-shadow": ["error", { allow: [] }],
      // Catches a missing import or an out-of-scope variable at lint time
      // rather than as a 500 in the browser. A `const t = useT()` whose import
      // never landed, and a `locale` referenced in a function that doesn't take
      // it, both shipped as runtime ReferenceErrors — `next build` compiles
      // them happily because neither is a syntax or type error.
      "no-undef": "error",
    },
  },
]);

export default eslintConfig;
