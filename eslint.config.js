import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '.shots/**', '.tmp-*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // plain scripts the page loads as they are (the theme, before first paint)
    files: ['apps/web/public/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
  },
  {
    files: ['scripts/**/*.mjs', '**/*.config.{js,ts}', 'apps/server/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // game logic stays pure: no browser or node globals
    files: ['packages/game-logic/src/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'use the seeded rng in rng.ts' },
        { object: 'Date', property: 'now', message: 'game logic is time-free' },
      ],
    },
  },
);
