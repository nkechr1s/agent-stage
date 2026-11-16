import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default ts.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '.idea/**', '.husky/_/**', 'artifacts/**'] },
  js.configs.recommended,
  { files: ['**/*.{js,mjs,ts,tsx}'], languageOptions: { globals: globals.node }, rules: { 'no-duplicate-imports': ['error', { includeExports: true, allowSeparateTypeImports: true }], 'no-unreachable': 'error' } },
  { files: ['examples/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser } },
  ...ts.configs.recommended.map(config => ({ ...config, files: ['**/*.{ts,tsx}'] })),
  { files: ['**/*.{ts,tsx}'], rules: { '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }], '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }] } },
  { files: ['src/react/**/*.{ts,tsx}', 'examples/**/*.tsx', 'tests/react/**/*.tsx', 'tests/integration/**/*.tsx', 'tests/compatibility/**/*.tsx'], plugins: { 'react-hooks': hooks }, rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' } },
);
