import js from '@eslint/js'
import globals from 'globals'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
  // 1. 基礎 JavaScript 推薦設定 (Flat Config 格式)
  js.configs.recommended,

  // 2. Prettier 推薦設定 (這會自動將 Prettier 規則注入並關閉 ESLint 衝突規則)
  eslintPluginPrettierRecommended,

  // 3. 自定義規則與環境設定
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node, // 讓 code 讀懂 process, __dirname 等 Node.js 全域變數
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
      // 確保 Prettier 的格式問題會顯示為 ESLint Error
      'prettier/prettier': 'error',
    },
  },
]
