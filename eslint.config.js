"use strict";

const globals = require("globals");
const js = require("@eslint/js");

const nodePlugin = require("eslint-plugin-n");
const configPrettier = require("eslint-config-prettier");

// https://eslint.org/docs/latest/use/configure/configuration-files
// https://eslint.org/docs/rules/
module.exports = [
  {
    ignores: ["**/node_modules/", "**/temp/", "**/reports/"],
  },
  js.configs.recommended,
  nodePlugin.configs["flat/recommended-script"],
  configPrettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        window: false,
        socket: false,
        sap: false,
        cds: false,
        SELECT: false,
        INSERT: false,
        UPDATE: false,
        UPSERT: false,
        DELETE: false,
        CREATE: false,
        DROP: false,
        STREAM: false,
      },
    },
    rules: {
      strict: ["error"],
      curly: ["error"],
      "no-unused-vars": ["error", { argsIgnorePattern: "err|req|res|next|event|data|headers", caughtErrors: "none" }],
      "no-restricted-modules": ["off"],
      "no-eval": ["error"],
      "no-implied-eval": ["error"],
      "no-console": ["error"],
      "no-throw-literal": ["error"],
      "no-control-regex": ["off"],
      "no-constant-binary-expression": ["off"],
      "prefer-promise-reject-errors": ["error"],
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-var": ["error"],
      "n/no-extraneous-require": ["off"],
      "n/no-unpublished-require": ["off"],
      "n/no-unsupported-features/node-builtins": ["off"],
      "n/no-deprecated-api": ["off"],
    },
  },
  {
    // Vitest globals for test files and their helpers
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        vi: false,
        describe: false,
        it: false,
        test: false,
        expect: false,
        beforeAll: false,
        afterAll: false,
        beforeEach: false,
        afterEach: false,
        suite: false,
      },
    },
  },
];
