import eslint from '@eslint/js'
import globals from 'globals'

const config = [
  // Global ignores
  {
    ignores: [
      '__config/',
      '__scripts/',
      '__services/',
      '.github/',
      '.husky/',
      '.vscode/',
      'api/',
      'admin/',
      'frontend/',
      'mobile/',
      'packages/',
    ]
  },
  // Main configuration
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    plugins: {},
    rules: {
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

      // Include rules from preset configurations
      ...eslint.configs.recommended.rules,
    },
  }
]

export default config
