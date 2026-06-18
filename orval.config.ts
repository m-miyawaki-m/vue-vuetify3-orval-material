import { defineConfig } from 'orval'

export default defineConfig({
  products: {
    input: './openapi/products.yaml',
    output: {
      target: './src/api/products.ts',
      client: 'vue-query',
      override: {
        mutator: {
          path: './src/plugins/axios.ts',
          name: 'customAxiosInstance',
        },
        query: {
          useQuery: true,
        },
      },
    },
  },
})
