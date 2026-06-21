import { defineConfig } from 'orval'

export default defineConfig({
  products: {
    input: './openapi/products.yaml',
    output: {
      target: './src/api/products.ts',
      client: 'axios',
      override: {
        mutator: {
          path: './src/plugins/axios.ts',
          name: 'customAxiosInstance',
        },
      },
    },
  },
})
