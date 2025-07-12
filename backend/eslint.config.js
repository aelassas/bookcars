import eslint from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'
import jestPlugin from 'eslint-plugin-jest'

const config = [
  // Global ignores
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      'logs/',
    ]
  },
  // Main configuration
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'jest': jestPlugin
    },
    rules: {
      // Include rules from preset configurations
      ...eslint.configs.recommended.rules,
      ...tseslint.configs['eslint-recommended'].rules,
      ...tseslint.configs.recommended.rules,
      ...jestPlugin.configs.recommended.rules,

      // ESLint core rules
      'linebreak-style': 'off',
      'no-underscore-dangle': 'off',
      'no-restricted-syntax': 'off',
      'max-len': 'off',
      'indent': 'off',
      'no-await-in-loop': 'off',
      'no-console': 'off',
      'object-curly-newline': 'off',
      'semi': ['error', 'never'],
      'brace-style': ['error', '1tbs'],
      'curly': 'error',
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'no-multiple-empty-lines': 'error',
      'no-multi-spaces': 'error',
      'padded-blocks': ['error', 'never'],
      'no-irregular-whitespace': 'error',

      // Import plugin rules
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/prefer-default-export': 'off',

      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',

      // jest rules
      'jest/no-conditional-expect': 'off',
    },
  }
]

export default config
