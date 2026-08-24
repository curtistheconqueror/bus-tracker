import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Client routes intentionally restore versioned browser state after mount.
      "react-hooks/set-state-in-effect": "off",
      // Full document navigation rehydrates shared LocalStorage across app surfaces.
      "@next/next/no-html-link-for-pages": "off",
      // Photo review uses local Blob URLs that are not compatible with next/image.
      "@next/next/no-img-element": "off",
      // Operational labels and mechanic-facing copy use ordinary apostrophes.
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    ".vinext/**",
    "dist/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
