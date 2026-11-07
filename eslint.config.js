import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Match tsconfig's noUnusedParameters/noUnusedLocals convention: a leading
      // underscore marks an intentionally-unused parameter or binding (used throughout
      // the engine's stub modules and handler signatures).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
