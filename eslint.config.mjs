import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  // CRITICAL: ESLint v9 flat config — ignores must be first element.
  // Never add .eslintignore — it is silently ignored in v9 flat config.
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'plugin:jsx-a11y/recommended'),
  {
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'jsx-a11y/anchor-is-valid': 'error',
    },
  },
]

export default eslintConfig
