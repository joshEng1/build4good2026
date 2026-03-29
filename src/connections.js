import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promises as fs } from 'node:fs'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import formidable from 'formidable'
import { MongoClient } from 'mongodb'
import { createServer as createViteServer } from 'vite'
import {
  createCompatibilitySummary,
  createPrimaryVehicleSummary,
  createYearsSummary,
  productCatalog as seededProductCatalog,
} from './productCatalog.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(projectRoot, '.env') })

const port = Number(process.env.PORT || 5173)
const host = process.env.HOST || 'localhost'
const uploadsDir = path.join(projectRoot, 'public', 'uploads', 'products')
const managerCookieName = 'twc_manager'
const managerSessionTtlSeconds = 60 * 60 * 12
const maxImageSizeBytes = 5 * 1024 * 1024
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const mongoConfig = {
  username: process.env.MONGODB_USERNAME || 'mainUser',
  clusterHost: process.env.MONGODB_CLUSTER_HOST || 'hackathoncluster.spemcti.mongodb.net',
  appName: process.env.MONGODB_APP_NAME || 'HackathonCluster',
  dbName: process.env.MONGODB_DB_NAME || 'vehicle_parts',
  partsCollectionName: process.env.MONGODB_PARTS_COLLECTION || 'parts',
  vehiclesCollectionName: process.env.MONGODB_VEHICLES_COLLECTION || 'vehicle',
  fitmentCollectionName: process.env.MONGODB_FITMENT_COLLECTION || 'vehicle_to_part',
  countersCollectionName: process.env.MONGODB_COUNTERS_COLLECTION || 'counters',
}

let mongoClientPromise = null

const sendJson = (response, statusCode, payload, extraHeaders = {}) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

const sendEmpty = (response, statusCode, extraHeaders = {}) => {
  response.writeHead(statusCode, extraHeaders)
  response.end()
}

const parseCookies = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce((accumulator, pair) => {
      const separatorIndex = pair.indexOf('=')

      if (separatorIndex === -1) {
        return accumulator
      }

      const key = pair.slice(0, separatorIndex).trim()
      const value = pair.slice(separatorIndex + 1).trim()

      if (key) {
        accumulator[key] = value
      }

      return accumulator
    }, {})

const readRequestBody = async (request, maxBytes = 1024 * 1024) => {
  const chunks = []
  let totalLength = 0

  for await (const chunk of request) {
    totalLength += chunk.length

    if (totalLength > maxBytes) {
      throw new Error('Request body is too large.')
    }

    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf8')
}

const readJsonBody = async (request, maxBytes = 1024 * 1024) => {
  const rawBody = await readRequestBody(request, maxBytes)

  if (!rawBody.trim()) {
    return {}
  }

  return JSON.parse(rawBody)
}

const resolveMongoUri = () => {
  const rawPassword = process.env.MONGODB_PASSWORD

  if (rawPassword) {
    const password = encodeURIComponent(rawPassword)

    return `mongodb+srv://mainUser:${password}@hackathoncluster.spemcti.mongodb.net/?appName=HackathonCluster`
  }

  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI.trim()
  }

  throw new Error('Missing MONGODB_PASSWORD or MONGODB_URI in .env')
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

const getDatabase = async () => {
  const client = await getMongoClient()
  return client.db(mongoConfig.dbName)
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

const normaliseCurrency = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normaliseStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(','))
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return []
}

const dedupeStrings = (values) => Array.from(new Set(values.filter(Boolean)))

const parseVehicleDocument = (document) => {
  const year = normaliseString(document?.Year, String(document?.Year || ''))
  const make = normaliseString(document?.Make, 'Unknown')
  const model = normaliseString(document?.Model, 'Vehicle')

  return {
    id: String(document?._id ?? ''),
    year,
    make,
    model,
    label: [year, make, model].filter(Boolean).join(' '),
  }
}

const buildCatalogRecord = (partDocument, linkedVehicles) => {
  const vehicles = linkedVehicles
    .map(parseVehicleDocument)
    .filter((vehicle) => vehicle.id)
    .sort((left, right) => left.label.localeCompare(right.label))

  const years = createYearsSummary(vehicles)
  const primaryVehicle = createPrimaryVehicleSummary(vehicles)
  const positions = normaliseStringArray(partDocument?.Positions)
  const otherNames = normaliseStringArray(partDocument?.['Other Names'])
  const stock = normaliseNumber(partDocument?.stock, 0)
  const title = normaliseString(partDocument?.Name, `Part ${partDocument?._id ?? ''}`)
  const category = normaliseString(partDocument?.Type, 'OEM Upgrade')
  const description = normaliseString(partDocument?.Description, 'OEM part details coming soon.')
  const manufacturer = normaliseString(partDocument?.Manufacturer, 'OEM')
  const price = normaliseCurrency(partDocument?.Cost)
  const image = normaliseString(partDocument?.image, '/logo.png')
  const sku = normaliseString(partDocument?.sku, `PART-${partDocument?._id ?? '0'}`)
  const makes = dedupeStrings(vehicles.map((vehicle) => vehicle.make))
  const models = dedupeStrings(vehicles.map((vehicle) => vehicle.model))
  const tags = dedupeStrings([
    title,
    category,
    manufacturer,
    ...positions,
    ...otherNames,
    ...makes,
    ...models,
  ]).map((entry) => entry.toLowerCase())

  return {
    id: String(partDocument?._id ?? ''),
    sku,
    title,
    make: primaryVehicle.make,
    model: primaryVehicle.model,
    years,
    category,
    stock,
    image,
    description,
    tags,
    vehicles,
    makes,
    models,
    compatibility: createCompatibilitySummary(vehicles),
    manufacturer,
    price,
    positions,
    otherNames,
    replaces: normaliseString(partDocument?.Replaces, ''),
  }
}

const fetchMongoCatalog = async () => {
  const database = await getDatabase()
  const partsCollection = database.collection(mongoConfig.partsCollectionName)
  const vehiclesCollection = database.collection(mongoConfig.vehiclesCollectionName)
  const fitmentCollection = database.collection(mongoConfig.fitmentCollectionName)

  const [partDocuments, vehicleDocuments, fitmentDocuments] = await Promise.all([
    partsCollection.find({}).sort({ Name: 1 }).toArray(),
    vehiclesCollection.find({}).sort({ Make: 1, Model: 1, Year: -1 }).toArray(),
    fitmentCollection.find({}).toArray(),
  ])

  if (!partDocuments.length) {
    throw new Error(
      `No products were found in ${mongoConfig.dbName}.${mongoConfig.partsCollectionName}.`,
    )
  }

  const vehicleById = new Map(vehicleDocuments.map((vehicle) => [String(vehicle._id), vehicle]))
  const fitmentIdsByPartId = fitmentDocuments.reduce((accumulator, fitmentDocument) => {
    const partId = String(fitmentDocument.partID)
    const vehicleId = String(fitmentDocument.vehicleID)

    if (!accumulator.has(partId)) {
      accumulator.set(partId, [])
    }

    accumulator.get(partId).push(vehicleId)
    return accumulator
  }, new Map())

  return partDocuments.map((partDocument) => {
    const linkedVehicleIds = fitmentIdsByPartId.get(String(partDocument._id)) || []
    const linkedVehicles = linkedVehicleIds
      .map((vehicleId) => vehicleById.get(vehicleId))
      .filter(Boolean)

    return buildCatalogRecord(partDocument, linkedVehicles)
  })
}

const fetchManagerParts = async () => fetchMongoCatalog()

const fetchManagerVehicles = async () => {
  const database = await getDatabase()
  const vehiclesCollection = database.collection(mongoConfig.vehiclesCollectionName)
  const vehicleDocuments = await vehiclesCollection.find({}).sort({ Make: 1, Model: 1, Year: -1 }).toArray()

  return vehicleDocuments.map(parseVehicleDocument)
}

const getCatalogPayload = async () => {
  try {
    const products = await fetchMongoCatalog()

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

const ensureCounter = async (database, counterName, collectionName) => {
  const countersCollection = database.collection(mongoConfig.countersCollectionName)
  const existingCounter = await countersCollection.findOne({ _id: counterName })

  if (existingCounter) {
    return
  }

  const targetCollection = database.collection(collectionName)
  const latestDocument = await targetCollection.find({}).sort({ _id: -1 }).limit(1).next()
  const initialValue = Number(latestDocument?._id) || 0

  await countersCollection.updateOne(
    { _id: counterName },
    { $setOnInsert: { value: initialValue } },
    { upsert: true },
  )
}

const getNextNumericId = async (database, counterName, collectionName) => {
  await ensureCounter(database, counterName, collectionName)
  const countersCollection = database.collection(mongoConfig.countersCollectionName)
  const result = await countersCollection.findOneAndUpdate(
    { _id: counterName },
    { $inc: { value: 1 } },
    { returnDocument: 'after' },
  )

  return Number(result.value?.value || 1)
}

const signManagerToken = (payload) => {
  if (!process.env.MANAGER_SESSION_SECRET) {
    throw new Error('Missing MANAGER_SESSION_SECRET in .env')
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', process.env.MANAGER_SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url')

  return `${encodedPayload}.${signature}`
}

const verifyManagerToken = (token) => {
  if (!token || !process.env.MANAGER_SESSION_SECRET) {
    return false
  }

  const [encodedPayload, signature] = token.split('.')

  if (!encodedPayload || !signature) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.MANAGER_SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url')

  if (signature !== expectedSignature) {
    return false
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    return Number(payload.exp) > Date.now()
  } catch {
    return false
  }
}

const createManagerCookie = () => {
  const token = signManagerToken({
    role: 'manager',
    exp: Date.now() + (managerSessionTtlSeconds * 1000),
  })

  return `${managerCookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${managerSessionTtlSeconds}`
}

const createExpiredManagerCookie = () =>
  `${managerCookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`

const isManagerAuthenticated = (request) => {
  const cookies = parseCookies(request.headers.cookie)
  return verifyManagerToken(cookies[managerCookieName])
}

const requireManagerAuth = (request, response) => {
  if (!isManagerAuthenticated(request)) {
    sendJson(response, 401, { error: 'Manager authentication required.' })
    return false
  }

  return true
}

const normaliseVehiclePayload = (payload) => {
  const year = normaliseString(String(payload.year || payload.Year || ''))
  const make = normaliseString(payload.make || payload.Make)
  const model = normaliseString(payload.model || payload.Model)

  if (!year || !make || !model) {
    throw new Error('Vehicle year, make, and model are required.')
  }

  return {
    Year: year,
    Make: make,
    Model: model,
  }
}

const normaliseManagerPartPayload = (payload) => {
  const title = normaliseString(payload.title || payload.Name)
  const category = normaliseString(payload.category || payload.Type)
  const description = normaliseString(payload.description || payload.Description)

  if (!title) {
    throw new Error('Part title is required.')
  }

  if (!category) {
    throw new Error('Part category is required.')
  }

  if (!description) {
    throw new Error('Part description is required.')
  }

  return {
    Name: title,
    sku: normaliseString(payload.sku, ''),
    Manufacturer: normaliseString(payload.manufacturer || payload.Manufacturer, 'OEM'),
    Cost: normaliseCurrency(payload.price ?? payload.Cost),
    Positions: normaliseStringArray(payload.positions || payload.Positions),
    'Other Names': normaliseStringArray(payload.otherNames || payload['Other Names']),
    Description: description,
    Replaces: normaliseString(payload.replaces || payload.Replaces, ''),
    Type: category,
    stock: normaliseNumber(payload.stock, 0),
    image: normaliseString(payload.image, ''),
    vehicleIds: Array.isArray(payload.vehicleIds) ? payload.vehicleIds.map((entry) => Number(entry)).filter(Number.isFinite) : [],
    newVehicles: Array.isArray(payload.newVehicles) ? payload.newVehicles : [],
  }
}

const syncPartFitmentLinks = async (database, partId, vehicleIds) => {
  const fitmentCollection = database.collection(mongoConfig.fitmentCollectionName)
  const existingFitments = await fitmentCollection.find({ partID: partId }).toArray()
  const existingVehicleIdSet = new Set(existingFitments.map((fitment) => Number(fitment.vehicleID)))
  const desiredVehicleIdSet = new Set(vehicleIds.map((vehicleId) => Number(vehicleId)))
  const vehicleIdsToCreate = Array.from(desiredVehicleIdSet).filter((vehicleId) => !existingVehicleIdSet.has(vehicleId))
  const vehicleIdsToRemove = Array.from(existingVehicleIdSet).filter((vehicleId) => !desiredVehicleIdSet.has(vehicleId))

  if (vehicleIdsToRemove.length) {
    await fitmentCollection.deleteMany({
      partID: partId,
      vehicleID: { $in: vehicleIdsToRemove },
    })
  }

  for (const vehicleId of vehicleIdsToCreate) {
    const nextFitmentId = await getNextNumericId(
      database,
      mongoConfig.fitmentCollectionName,
      mongoConfig.fitmentCollectionName,
    )

    await fitmentCollection.insertOne({
      _id: nextFitmentId,
      vehicleID: vehicleId,
      partID: partId,
    })
  }
}

const createVehicleRecord = async (database, payload) => {
  const vehiclesCollection = database.collection(mongoConfig.vehiclesCollectionName)
  const vehicleDocument = normaliseVehiclePayload(payload)
  const existingVehicle = await vehiclesCollection.findOne(vehicleDocument)

  if (existingVehicle) {
    return {
      id: String(existingVehicle._id),
      year: vehicleDocument.Year,
      make: vehicleDocument.Make,
      model: vehicleDocument.Model,
      label: [vehicleDocument.Year, vehicleDocument.Make, vehicleDocument.Model].join(' '),
    }
  }

  const nextVehicleId = await getNextNumericId(
    database,
    mongoConfig.vehiclesCollectionName,
    mongoConfig.vehiclesCollectionName,
  )

  await vehiclesCollection.insertOne({
    _id: nextVehicleId,
    ...vehicleDocument,
  })

  return {
    id: String(nextVehicleId),
    year: vehicleDocument.Year,
    make: vehicleDocument.Make,
    model: vehicleDocument.Model,
    label: [vehicleDocument.Year, vehicleDocument.Make, vehicleDocument.Model].join(' '),
  }
}

const createPartRecord = async (database, payload) => {
  const partsCollection = database.collection(mongoConfig.partsCollectionName)
  const normalisedPayload = normaliseManagerPartPayload(payload)
  const createdVehicleIds = []

  for (const newVehiclePayload of normalisedPayload.newVehicles) {
    const createdVehicle = await createVehicleRecord(database, newVehiclePayload)
    createdVehicleIds.push(Number(createdVehicle.id))
  }

  if (!normalisedPayload.vehicleIds.length && !createdVehicleIds.length) {
    throw new Error('At least one linked vehicle is required for each part.')
  }

  const partId = await getNextNumericId(
    database,
    mongoConfig.partsCollectionName,
    mongoConfig.partsCollectionName,
  )

  await partsCollection.insertOne({
    _id: partId,
    Name: normalisedPayload.Name,
    sku: normalisedPayload.sku || `PART-${partId}`,
    Manufacturer: normalisedPayload.Manufacturer,
    Cost: normalisedPayload.Cost,
    Positions: normalisedPayload.Positions,
    'Other Names': normalisedPayload['Other Names'],
    Description: normalisedPayload.Description,
    Replaces: normalisedPayload.Replaces || null,
    Type: normalisedPayload.Type,
    stock: normalisedPayload.stock,
    image: normalisedPayload.image || '/logo.png',
  })

  await syncPartFitmentLinks(
    database,
    partId,
    dedupeStrings(
      normalisedPayload.vehicleIds
        .concat(createdVehicleIds)
        .map((vehicleId) => String(vehicleId)),
    ).map((vehicleId) => Number(vehicleId)),
  )

  return partId
}

const updatePartRecord = async (database, partId, payload) => {
  const partsCollection = database.collection(mongoConfig.partsCollectionName)
  const normalisedPayload = normaliseManagerPartPayload(payload)
  const createdVehicleIds = []

  for (const newVehiclePayload of normalisedPayload.newVehicles) {
    const createdVehicle = await createVehicleRecord(database, newVehiclePayload)
    createdVehicleIds.push(Number(createdVehicle.id))
  }

  if (!normalisedPayload.vehicleIds.length && !createdVehicleIds.length) {
    throw new Error('At least one linked vehicle is required for each part.')
  }

  await partsCollection.updateOne(
    { _id: partId },
    {
      $set: {
        Name: normalisedPayload.Name,
        sku: normalisedPayload.sku || `PART-${partId}`,
        Manufacturer: normalisedPayload.Manufacturer,
        Cost: normalisedPayload.Cost,
        Positions: normalisedPayload.Positions,
        'Other Names': normalisedPayload['Other Names'],
        Description: normalisedPayload.Description,
        Replaces: normalisedPayload.Replaces || null,
        Type: normalisedPayload.Type,
        stock: normalisedPayload.stock,
        image: normalisedPayload.image || '/logo.png',
      },
    },
  )

  await syncPartFitmentLinks(
    database,
    partId,
    dedupeStrings(
      normalisedPayload.vehicleIds
        .concat(createdVehicleIds)
        .map((vehicleId) => String(vehicleId)),
    ).map((vehicleId) => Number(vehicleId)),
  )
}

const handleImageUpload = async (request, response) => {
  if (!requireManagerAuth(request, response)) {
    return
  }

  await fs.mkdir(uploadsDir, { recursive: true })

  const form = formidable({
    uploadDir: uploadsDir,
    keepExtensions: true,
    maxFiles: 1,
    maxFileSize: maxImageSizeBytes,
    filename: (_name, _extension, part) => {
      const originalName = part.originalFilename || 'part-image'
      const safeName = originalName.replace(/[^a-zA-Z0-9._]/g, '-').toLowerCase()
      const extension = path.extname(safeName) || '.png'
      return `${Date.now()}-${crypto.randomUUID()}${extension}`
    },
    filter: ({ mimetype }) => Boolean(mimetype && allowedImageMimeTypes.has(mimetype)),
  })

  try {
    const [, files] = await form.parse(request)
    const uploadedFile = Array.isArray(files.image) ? files.image[0] : files.image

    if (!uploadedFile) {
      sendJson(response, 400, { error: 'Image file is required.' })
      return
    }

    sendJson(response, 200, {
      path: `/uploads/products/${path.basename(uploadedFile.filepath)}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image upload failed.'
    sendJson(response, 400, { error: message })
  }
}

const handleManagerSessionCreate = async (request, response) => {
  if (!process.env.MANAGER_PASSWORD) {
    sendJson(response, 503, { error: 'Manager access is not configured yet.' })
    return
  }

  try {
    const payload = await readJsonBody(request)
    const passcode = normaliseString(payload.passcode)

    if (!passcode || passcode !== process.env.MANAGER_PASSWORD) {
      sendJson(response, 401, { error: 'Invalid manager passcode.' })
      return
    }

    sendJson(
      response,
      200,
      { authenticated: true },
      { 'Set-Cookie': createManagerCookie() },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read login request.'
    sendJson(response, 400, { error: message })
  }
}

const handleManagerSessionStatus = (request, response) => {
  sendJson(response, 200, {
    authenticated: isManagerAuthenticated(request),
    configured: Boolean(process.env.MANAGER_PASSWORD && process.env.MANAGER_SESSION_SECRET),
  })
}

const handleManagerSessionDelete = (_request, response) => {
  sendEmpty(response, 204, { 'Set-Cookie': createExpiredManagerCookie() })
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
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`)

    try {
      if (request.method === 'GET' && requestUrl.pathname === '/api/products') {
        const payload = await getCatalogPayload()
        sendJson(response, 200, payload)
        return
      }

      if (requestUrl.pathname === '/api/manager/session') {
        if (request.method === 'GET') {
          handleManagerSessionStatus(request, response)
          return
        }

        if (request.method === 'POST') {
          await handleManagerSessionCreate(request, response)
          return
        }

        if (request.method === 'DELETE') {
          handleManagerSessionDelete(request, response)
          return
        }
      }

      if (request.method === 'POST' && requestUrl.pathname === '/api/manager/uploads') {
        await handleImageUpload(request, response)
        return
      }

      if (request.method === 'GET' && requestUrl.pathname === '/api/manager/parts') {
        if (!requireManagerAuth(request, response)) {
          return
        }

        const parts = await fetchManagerParts()
        sendJson(response, 200, { parts })
        return
      }

      if (request.method === 'GET' && requestUrl.pathname === '/api/manager/vehicles') {
        if (!requireManagerAuth(request, response)) {
          return
        }

        const vehicles = await fetchManagerVehicles()
        sendJson(response, 200, { vehicles })
        return
      }

      if (request.method === 'POST' && requestUrl.pathname === '/api/manager/vehicles') {
        if (!requireManagerAuth(request, response)) {
          return
        }

        const payload = await readJsonBody(request)
        const database = await getDatabase()
        const vehicle = await createVehicleRecord(database, payload)
        sendJson(response, 201, { vehicle })
        return
      }

      if (request.method === 'POST' && requestUrl.pathname === '/api/manager/parts') {
        if (!requireManagerAuth(request, response)) {
          return
        }

        const payload = await readJsonBody(request, 2 * 1024 * 1024)
        const database = await getDatabase()
        const createdPartId = await createPartRecord(database, payload)
        const parts = await fetchManagerParts()
        const part = parts.find((entry) => Number(entry.id) === createdPartId) || null

        sendJson(response, 201, { part })
        return
      }

      if (request.method === 'PATCH' && /^\/api\/manager\/parts\/\d+$/.test(requestUrl.pathname)) {
        if (!requireManagerAuth(request, response)) {
          return
        }

        const payload = await readJsonBody(request, 2 * 1024 * 1024)
        const partId = Number(requestUrl.pathname.split('/').pop())
        const database = await getDatabase()
        await updatePartRecord(database, partId, payload)
        const parts = await fetchManagerParts()
        const part = parts.find((entry) => Number(entry.id) === partId) || null

        sendJson(response, 200, { part })
        return
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server error'
      sendJson(response, 500, { error: message })
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
    console.log(`Products API available at http://${host}:${port}/api/products`)
    console.log(`Manager page available at http://${host}:${port}/manager.html`)
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
