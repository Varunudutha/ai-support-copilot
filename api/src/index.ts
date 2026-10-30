import { app } from './app.js'
import { connectDatabase } from './config/database.js'
import { env } from './config/env.js'

async function start(): Promise<void> {
  await connectDatabase()
  const server = app.listen(env.PORT, () => {
    console.info(`AI Support Copilot API listening on http://localhost:${env.PORT}`)
  })

  const shutdown = (signal: string) => {
    console.info(`${signal} received. Shutting down API...`)
    server.close(() => {
      process.exit(0)
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start().catch((error: unknown) => {
  console.error('API failed to start:', error)
  process.exit(1)
})
