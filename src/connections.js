import { MongoClient } from 'mongodb'
import { createServer as createViteServer } from 'vite'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const envPath = path.join(projectRoot, '.env')

async function loadEnv() {
  try {
    const contents = await fs.readFile(envPath, 'utf8')
    return contents.split(/\r?\n/).reduce((acc, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return acc
      const [key, ...rest] = trimmed.split('=')
      acc[key] = rest.join('=').trim()
      return acc
    }, {})
  } catch {
    return {}
  }
}

async function ensureEnv() {
  const env = await loadEnv()
  Object.entries(env).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value
    }
  })
}

function getMongoPassword() {
  const password = process.env.MONGODB_PASSWORD
  if (!password) {
    throw new Error('Missing MONGODB_PASSWORD in .env')
  }
  return password
}

function getMongoUri() {
  const password = getMongoPassword()
  return `mongodb+srv://mainUser:${encodeURIComponent(password)}@hackathoncluster.spemcti.mongodb.net/?appName=HackathonCluster`
}

async function connectMongoDB() {
  await ensureEnv()
  const uri = getMongoUri()
  const client = new MongoClient(uri)
  await client.connect()
  console.log('Connected to MongoDB Atlas')
  return client
}

export async function allParts() {
  await ensureEnv()
  const uri = getMongoUri()
  const client = new MongoClient(uri)

  try {
    await client.connect()
    const db = client.db('vehicle_parts')
    return await db.collection('parts').findOne({})
  } finally {
    await client.close()
  }
}

async function startViteServer() {
  const server = await createViteServer({
    root: projectRoot,
    server: {
      port: 8080,
      strictPort: true,
    },
    plugins: [
      {
        name: 'api-all-parts',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url || !req.url.startsWith('/api/allParts')) {
              return next()
            }

            try {
              const parts = await allParts()
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(parts))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Unable to load parts' }))
            }
          })
        },
      },
    ],
  })

  await server.listen()
  console.log('Server running at http://localhost:8080')
  return server
}

async function start() {
  const mongoClient = await connectMongoDB()
  const viteServer = await startViteServer()

  const shutdown = async () => {
    await mongoClient.close()
    await viteServer.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})