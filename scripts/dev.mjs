// Custom dev server script that avoids Vite's stdin shortcut binding
// (which causes immediate exit in VSCode PowerShell terminal)
import { createServer } from 'vite'

const server = await createServer()
await server.listen()
server.printUrls()

process.on('SIGINT', async () => {
  await server.close()
  process.exit(0)
})
