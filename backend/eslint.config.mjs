import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Node globals for plain .js files specifically - every other file
    // in this project is .ts, where typescript-eslint's own config
    // already turns off the base no-undef rule (TypeScript's compiler
    // catches undefined variables more reliably than ESLint can). A
    // plain .js file gets no such treatment from the base recommended
    // config, so it needs these listed explicitly. Scoped to *.js only,
    // not applied project-wide, so this doesn't loosen anything for the
    // existing .ts files.
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        URL: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      // This rule makes sense for .ts files, steering toward ES import
      // syntax - but a plain .js file here is genuinely CommonJS
      // (sourceType above), where require() is correct, not a habit to
      // discourage.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    ignores: ['dist/**', 'generated/**', 'node_modules/**'],
  },
);
