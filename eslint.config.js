import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import json from "@eslint/json";
import css from "@eslint/css";

export default [
  // Base JS rules
  js.configs.recommended,

  // React rules (flat configs)
  ...react.configs.flat.recommended,
  ...react.configs.flat["jsx-runtime"],

  // Your project rules for JS/JSX files
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: { jsx: true },
      globals: { ...globals.browser, ...globals.node }
    },
    settings: { react: { version: "detect" } },
    rules: {
      //  Enforce on-demand icon imports
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@ant-design/icons",
          importNames: ["default"],
          message: "Import specific icons, e.g. { InfoCircleFilled }."
        }],
      }],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'ImportDeclaration[source.value="@ant-design/icons"] ImportNamespaceSpecifier',
          message: "Avoid `import * as Icons`; import specific icons instead."
        }
      ]
    }
  },

  // JSON files
  ...json.configs.recommended,
  { files: ["**/*.json"], language: "json/json" },

  // CSS files
  ...css.configs.recommended,
  { files: ["**/*.css"], language: "css/css" }
];
