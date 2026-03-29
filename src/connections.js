import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'
import { createServer as createViteServer } from 'vite'
import { productCatalog as seededProductCatalog } from './productCatalog.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(projectRoot, '.env') })

const port = Number(process.env.PORT || 5173)
const host = process.env.HOST || 'localhost'
const defaultMongoConfig = {
  username: process.env.MONGODB_USERNAME || 'mainUser',
  clusterHost: process.env.MONGODB_CLUSTER_HOST || 'hackathoncluster.spemcti.mongodb.net',
  appName: process.env.MONGODB_APP_NAME || 'HackathonCluster',
  dbName: process.env.MONGODB_DB_NAME || 'thewconverts',
  collectionName: process.env.MONGODB_PRODUCTS_COLLECTION || 'products',
}

let mongoClientPromise = null

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

const resolveMongoUri = () => {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI
  }

  if (!process.env.MONGODB_PASSWORD) {
    throw new Error('Missing MONGODB_URI or MONGODB_PASSWORD in .env')
  }

  const password = encodeURIComponent(process.env.MONGODB_PASSWORD)
  const appName = encodeURIComponent(defaultMongoConfig.appName)

  return `mongodb+srv://${defaultMongoConfig.username}:${password}@${defaultMongoConfig.clusterHost}/${defaultMongoConfig.dbName}?retryWrites=true&w=majority&appName=${appName}`
}

const getMongoClient = async () => {
  if (!mongoClientPromise) {
    const client = new MongoClient(resolveMongoUri(), {
      serverSelectionTimeoutMS: 10000,
    })

    mongoClientPromise = client.connect().catch((error) => {
      mongoClientPromise = null
      throw error
    })
  }

  return mongoClientPromise
}

const normaliseString = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback

  const trimmed = value.trim()
  return trimmed || fallback
}

const normaliseNumber = (value, fallback = 0) => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.max(Math.round(parsed), 0)
}

const normaliseTags = (value) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const normaliseProductRecord = (document, index) => {
  const title = normaliseString(document.title, `OEM Part ${index + 1}`)
  const make = normaliseString(document.make, 'Unknown')
  const model = normaliseString(document.model, 'Platform')
  const category = normaliseString(document.category, 'OEM Upgrade')

  return {
    id: normaliseString(document.id, String(document._id || `mongo-product-${index + 1}`)),
    sku: normaliseString(document.sku, `SKU-${index + 1}`),
    title,
    make,
    model,
    years: normaliseString(document.years, 'Fitment in progress'),
    category,
    stock: normaliseNumber(document.stock, 0),
    image: normaliseString(document.image, '/logo.png'),
    description: normaliseString(
      document.description,
      `${title} for ${make} ${model}.`,
    ),
    tags: normaliseTags(document.tags),
  }
}

const readMongoProducts = async () => {
  const client = await getMongoClient()
  const collection = client
    .db(defaultMongoConfig.dbName)
    .collection(defaultMongoConfig.collectionName)

  const documents = await collection
    .find({})
    .sort({ make: 1, model: 1, category: 1, title: 1 })
    .toArray()

  if (!documents.length) {
    throw new Error(
      `No products were found in ${defaultMongoConfig.dbName}.${defaultMongoConfig.collectionName}.`,
    )
  }

  return documents.map(normaliseProductRecord)
}

const getCatalogPayload = async () => {
  try {
    const products = await readMongoProducts()

    return {
      source: 'mongodb',
      products,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown MongoDB error'
    console.warn(`[MongoDB catalog] ${message}`)

    return {
      source: 'seed',
      products: seededProductCatalog,
      error: message,
    }
  }
}

const createDevServer = async () => {
  const vite = await createViteServer({
    root: projectRoot,
    appType: 'mpa',
    server: {
      middlewareMode: true,
    },
  })

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`)

    if (request.method === 'GET' && url.pathname === '/api/products') {
      const payload = await getCatalogPayload()
      sendJson(response, 200, payload)
      return
    }

    vite.middlewares(request, response, (error) => {
      if (error) {
        response.statusCode = 500
        response.end(error instanceof Error ? error.message : 'Server error')
        return
      }

      response.statusCode = 404
      response.end('Not found')
    })
  })

  server.listen(port, host, () => {
    console.log(`Dev server running at http://${host}:${port}`)
    console.log(
      `Products API available at http://${host}:${port}/api/products using ${defaultMongoConfig.dbName}.${defaultMongoConfig.collectionName}`,
    )
  })

  const closeServer = async () => {
    server.close()
    await vite.close()

    if (mongoClientPromise) {
      const client = await mongoClientPromise
      await client.close()
      mongoClientPromise = null
    }
  }

  process.once('SIGINT', () => {
    void closeServer().finally(() => process.exit(0))
  })

  process.once('SIGTERM', () => {
    void closeServer().finally(() => process.exit(0))
  })
}

createDevServer().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
