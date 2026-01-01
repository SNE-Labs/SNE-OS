// ============================================
// SNE RADAR - ESLINT CONFIG v2.2
// Configuração strict para TypeScript
// ============================================

module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
    'react-hooks',
    'react-refresh'
  ],
  rules: {
    // TypeScript strict rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/prefer-as-const': 'error',
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // React rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

    // General rules
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prefer-const': 'error',
    'no-var': 'error',

    // Custom rules for SNE Radar
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'axios',
            message: 'Use @/services/api instead for consistent error handling'
          }
        ]
      }
    ]
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.config.js',
    '*.config.ts',
    'vite.config.ts'
  ],

  // Allow axios import in api.ts since it's the base service
  overrides: [
    {
      files: ['src/services/api.ts'],
      rules: {
        'no-restricted-imports': 'off'
      }
    }
  ]
}
