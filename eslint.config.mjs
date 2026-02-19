import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactCompiler from 'eslint-plugin-react-compiler';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-compiler': reactCompiler,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-compiler/react-compiler': 'error',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'no-console': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]',
          message:
            'Avoid "as unknown as" assertions. Use runtime validation (Zod) instead.',
        },
      ],
    },
  },
  // Scripts (CLI tools) - console is the primary output mechanism
  {
    files: ['scripts/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
  // Supabase Edge Functions - server-side, console is appropriate
  {
    files: ['supabase/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
  eslintConfigPrettier
);
