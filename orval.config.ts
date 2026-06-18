import { defineConfig } from 'orval'

export default defineConfig({
  // OpenAPI spec を追加したらここに定義する
  // 例:
  // products: {
  //   input: './openapi/products.yaml',
  //   output: {
  //     target: './src/api/products.ts',
  //     client: 'vue-query',          // useGetProducts() などの hook を自動生成
  //     override: {
  //       query: {
  //         useQuery: true,
  //         useMutation: true,
  //       },
  //     },
  //   },
  // },
})
