const typescriptPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')
const reactPlugin = require('eslint-plugin-react')
const reactHooksPlugin = require('eslint-plugin-react-hooks')

const config = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser, // Reference the parser here
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // Custom rules
      'linebreak-style': 'off',
      'no-underscore-dangle': 'off',
      'no-restricted-syntax': 'off',
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'max-len': 'off',
      'indent': 'off',
      'import/prefer-default-export': 'off',
      'no-await-in-loop': 'off',
      'comma-dangle': 'off',
      'implicit-arrow-linebreak': 'off',
      'no-use-before-define': 'off',
      'import/no-extraneous-dependencies': 'off',
      'no-param-reassign': 'off',
      'no-alert': 'off',
      'global-require': 'off',
      'func-names': 'off',
      'no-nested-ternary': 'off',
      'object-curly-newline': 'off',
      'semi': ['error', 'never'],
      'brace-style': ['error', '1tbs'],
      'react/prop-types': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react/function-component-definition': [
        'warn',
        { namedComponents: 'arrow-function' },
      ],
      'no-console': 'off',
      'curly': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]

module.exports = config
