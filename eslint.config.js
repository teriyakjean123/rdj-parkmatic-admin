import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // ZONE 1: Ignore these folders entirely
  {
    ignores: ["dist", "node_modules"],
  },

  // ZONE 2: Rules for your Firebase Functions (Backend)
  {
    files: ["functions/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs", // Allows 'require' and 'module.exports'
      globals: {
        ...globals.node, // Defines Node.js globals like 'process'
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off",
    },
  },

  // ZONE 3: Rules for your React App (Frontend)
  {
    files: ["src/**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },
]);
