import checkFilePlugin from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import jestDomPlugin from 'eslint-plugin-jest-dom';
import playwrightPlugin from 'eslint-plugin-playwright';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import testingLibraryPlugin from 'eslint-plugin-testing-library';
import vitestPlugin from '@vitest/eslint-plugin';
import typescriptEslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import eslint from '@eslint/js';
import { fixupPluginRules } from '@eslint/compat';
import pluginQuery from '@tanstack/eslint-plugin-query';

const fixUnsupportedPlugins = {
  'react-hooks': fixupPluginRules(reactHooksPlugin),
  'testing-library': fixupPluginRules({
    rules: testingLibraryPlugin.rules,
  }),
  import: importPlugin, // This should be unsupported according to eslint issues, but somehow, it works
};

export default [
  prettierConfig,
  eslint.configs.recommended,
  ...pluginQuery.configs['flat/recommended'],
  ...typescriptEslint.configs.recommended,
  ...tailwindcssPlugin.configs['flat/recommended'],
  {
    ignores: [
      'node_modules/*',
      'public/mockServiceWorker.js',
      'generators/*',
      'src/generated/*',
      '*.cjs',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        lib: ['dom', 'dom.iterable', 'esnext'],
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
    plugins: {
      ...fixUnsupportedPlugins,
      'check-file': checkFilePlugin,
      'jest-dom': jestDomPlugin,
      playwright: playwrightPlugin,
      prettier: prettierPlugin,
      react: reactPlugin,
      tailwindcss: tailwindcssPlugin,
      vitest: vitestPlugin,
      '@typescript-eslint': typescriptEslint.plugin,
    },
    settings: {
      'import/resolver': {
        typescript: {},
      },
      tailwindcss: {
        callees: ['clsx', 'cn'],
        config: 'tailwind.config.cjs',
        whitelist: [
          'navbar', 'btn', 'card', 'indicator', 'avatar', 'dropdown', 'menu', 'badge', 'tooltip', 'modal', 'input', 'select', 'form', 'btn-primary', 'btn-secondary', 'bg-base-100', 'base-200'
        ],
      },
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      ...testingLibraryPlugin.configs.react.rules,
      'no-console': ['error', { allow: ['warn', 'error', 'log'] }],
      'react/jsx-key': 'error',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // src/app can import from src/features but not the other way around
            {
              target: './src/features',
              from: './src/app',
            },

            // e.g src/features and src/app can import from these shared modules but not the other way around
            {
              target: [
                './src/assets',
                './src/common',
                './src/config',
                './src/components',
                './src/hooks',
                './src/lib',
                './src/types',
                './src/utils',
              ],
              from: ['./src/features', './src/app'],
            },
          ],
        },
      ],
      'import/no-cycle': 'error',
      'react/prop-types': 'off',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-named-as-default': 'off',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': ['off'],
      '@typescript-eslint/explicit-module-boundary-types': ['off'],
      '@typescript-eslint/no-empty-function': ['off'],
      '@typescript-eslint/no-explicit-any': ['off'],
      'check-file/filename-naming-convention': [
        'error',
        {
          'src/**/*.{ts,tsx}': '*([-~$_])[a-z]+*(-[a-z0-9]+)',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
      'check-file/folder-naming-convention': [
        'error',
        {
          'src/**/!(__tests__)/': '*([-~$_])[a-z0-9]+*(-[a-z0-9]+)',
          'src/**/__tests__/**/': '*([-~$_])[a-z0-9]+*(-[a-z0-9]+)',
        },
      ],
      'tailwindcss/classnames-order': 'error',
      'tailwindcss/enforces-negative-arbitrary-values': 'error',
      'tailwindcss/enforces-shorthand': 'error',
      'tailwindcss/no-custom-classname': 'error',
      'tailwindcss/no-contradicting-classname': 'error',
      'tailwindcss/no-unnecessary-arbitrary-value': 'error',
    },
  },
];
