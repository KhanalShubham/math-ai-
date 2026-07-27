const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'mongoose',
              message:
                'mongoose must only be imported inside infrastructure/persistence/mongoose/ — services depend on repository interfaces, not the ODM (ARCHITECTURE.md §21.2).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/infrastructure/persistence/mongoose/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // Jest's asymmetric matchers (expect.stringContaining, etc.) and raw
      // supertest response bodies (typed `any`) aren't precise enough to
      // satisfy these — reaching into res.body.* is the normal shape of an
      // integration test, not a design smell.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // Fake/in-memory test doubles implement async repository interfaces
      // synchronously by design — the interface, not the implementation, is
      // what needs to be async.
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // Integration tests own their own MongoMemoryServer connection lifecycle
    // directly — the mongoose-import boundary is a rule for application code
    // (services must go through repositories), not test setup/teardown.
    files: ['tests/integration/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  eslintConfigPrettier,
);
