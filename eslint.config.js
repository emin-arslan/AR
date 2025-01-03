import js from '@eslint/js'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    plugins: {},
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      // React Three Fiber özel kuralları
      'react/no-unknown-property': ['error', { 
        ignore: [
          'object',
          'position',
          'intensity',
          'angle',
          'penumbra',
          'args',
          'attach',
          'scale'
        ] 
      }]
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  }
]
