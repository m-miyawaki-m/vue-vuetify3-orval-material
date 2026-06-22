import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: './openapi/api.yaml',
    output: {
      target: './src/api/index.ts',
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
