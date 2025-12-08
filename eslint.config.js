import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // Strict typing rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',

      // Code quality
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-case-declarations': 'off',
      'no-useless-escape': 'warn',

      // Allow empty catch blocks
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    ignores: ['build/**', 'coverage/**', 'node_modules/**', '*.js', '*.cjs', '*.mjs', 'scripts/**'],
  }
);
