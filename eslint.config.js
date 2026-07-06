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

  // ── レイヤー規約: pages/components は共通層（composables/stores/types）経由のみ ──
  // テストコードは対象外（vue-query のテストセットアップ等で低レイヤーに触るため）
  {
    files: ['src/pages/**/*.{ts,vue}', 'src/components/**/*.{ts,vue}'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/api', '@/api/*'],
              message: '@/api は直接使わず、@/composables の useXxx() と @/types/api の型を使ってください（docs/guides/team-guide.md 参照）。',
            },
            {
              group: ['@tanstack/vue-query'],
              message: 'vue-query は composables 層専用です。@/composables の useXxx() を使ってください（docs/guides/team-guide.md 参照）。',
            },
            {
              group: ['axios', '@/plugins/axios'],
              message: 'axios は直接使わず、@/composables の useXxx() を使ってください（docs/guides/team-guide.md 参照）。',
            },
          ],
        },
      ],
    },
  },

  // ── Prettier と競合するルールを無効化（必ず最後に置く） ────────────────
  eslintConfigPrettier,
)
