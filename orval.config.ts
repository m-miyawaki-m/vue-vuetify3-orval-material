import { defineConfig } from 'orval'

export default defineConfig({
  // ① vue-query composable + TS 型
  api: {
    input: './openapi/api.yaml',
    output: {
      target: './src/api/index.ts',
      // 型定義は src/types/api/ に分離生成（ページは @/types/api から型を import する）
      schemas: './src/types/api',
      client: 'vue-query',
      // httpClient を省略すると fetch 用のラップ型 ({data,status,headers}) が生成され mutator と非互換になるため必須
      httpClient: 'axios',
      override: {
        mutator: {
          path: './src/plugins/axios.ts',
          name: 'customAxiosInstance',
        },
      },
    },
  },
  // ② zod スキーマ
  apiZod: {
    input: './openapi/api.yaml',
    output: {
      target: './src/api/index.zod.ts',
      client: 'zod',
    },
  },
})
