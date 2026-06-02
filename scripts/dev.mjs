import { createServer } from 'vite'

process.on('uncaughtException', (err) => {
  console.error('[dev] uncaughtException:', err.message)
  console.error(err.stack)
})

process.on('unhandledRejection', (reason) => {
  console.error('[dev] unhandledRejection:', reason)
})

const server = await createServer()
await server.listen()
server.printUrls()

process.on('SIGINT', async () => {
  await server.close()
  process.exit(0)
})
