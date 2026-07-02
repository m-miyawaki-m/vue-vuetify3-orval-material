import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  // ── 対象外ディレクトリ ──────────────────────────────────────────────────
  { ignores: ['dist/**', 'android/**', 'ios/**', 'node_modules/**', 'html/**', 'coverage/**', 'playwright-report/**', 'test-results/**', '.superpowers/**'] },

  // ── TypeScript 推奨ルール（.ts ファイル向け） ──────────────────────────
  ...tseslint.configs.recommended,

  // ── Vue 3 推奨ルール（.vue ファイルのパーサーを上書きするため後に置く） ─
  ...pluginVue.configs['flat/strongly-recommended'],

  // ── .vue 内の <script lang="ts"> を TypeScript パーサーで処理 ──────────
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // ── プロジェクト固有ルール ──────────────────────────────────────────────
  {
    rules: {
      // ページコンポーネント（HomePage.vue など）で single-word 名を許可
      'vue/multi-word-component-names': 'off',

      // semi:false（セミコロンなし）運用時の ASI 危険パターンをエラーにする
      // 行頭が ( [ ` で始まる場合、前行と結合して誤解釈される可能性がある
      'no-unexpected-multiline': 'error',

      // ── ここにカスタムルールを追加 ──────────────────────────────────
      // 例: 'vue/component-definition-name-casing': ['error', 'PascalCase'],
      // 例: '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // ── Prettier と競合するルールを無効化（必ず最後に置く） ────────────────
  eslintConfigPrettier,
)
