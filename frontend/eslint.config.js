import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactRefreshPlugin from 'eslint-plugin-react-refresh'
import reactCompilerPlugin from 'eslint-plugin-react-compiler'

const config = [
  { ...reactPlugin.configs.flat.recommended, settings: { react: { version: "detect" } } },
  reactCompilerPlugin.configs.recommended, 
  {
    ignores: [
      'node_modules/',
      'build/',
      'vite.config.d.ts',
    ]
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      // 'react-compiler': reactCompilerPlugin,
    },
    rules: {
      'semi': ['error', 'never'],
      'brace-style': ['error', '1tbs'],
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/jsx-filename-extension': ['warn', { extensions: ['.tsx', '.ts'] }],
      'react/function-component-definition': ['warn', { namedComponents: 'arrow-function' }],
      'curly': 'error',
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
      'func-names': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'no-param-reassign': 'off',
      'react/require-default-props': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/display-name': 'off',
      'no-nested-ternary': 'off',
      'react/jsx-no-useless-fragment': 'off',
      'object-curly-newline': 'off',
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'react/prop-types': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'import/no-extraneous-dependencies': 'off',
      // 'react-compiler/react-compiler': 'error',
    },
  }
]

export default config
