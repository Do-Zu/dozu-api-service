const globals = require('globals');
const pluginJs = require('@eslint/js');
const tseslint = require('typescript-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    // Only include files in the src directory
    files: ['src/**/*.{js,mjs,cjs,ts}'],
    ignores: [
      // Specific folders to ignore within src
      'src/models/**',
      'src/middleware/handler/**',
    ],
    languageOptions: {
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    // Apply rules to files that aren't ignored
    rules: {
      // Add any custom rules here
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Apply standard configurations to the files we're linting
  {
    files: ['src/**/*.{js,mjs,cjs,ts}'],
    ignores: ['src/models/**', 'src/middleware/handler/**'],
    ...pluginJs.configs.recommended,
  },
  {
    files: ['src/**/*.{js,mjs,cjs,ts}'],
    ignores: ['src/models/**', 'src/middleware/handler/**'],
    ...tseslint.configs.recommended[0],
  },
  {
    files: ['src/**/*.{js,mjs,cjs,ts}'],
    ignores: ['src/models/**', 'src/middleware/handler/**'],
    ...eslintConfigPrettier,
  },
];
