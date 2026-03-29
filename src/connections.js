import { MongoClient } from 'mongodb';
import { createServer as createViteServer } from 'vite';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envFile = path.join(projectRoot, '.env');
const port = 8080;

function parseDotEnv(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    result[key] = rest.join('=').trim();
  }
  return result;
}

async function loadEnv() {
  try {
    const raw = await fs.readFile(envFile, 'utf8');
    return parseDotEnv(raw);
  } catch {
    return {};
  }
}

async function createServer() {
  const env = await loadEnv();
  const rawPassword = process.env.MONGODB_PASSWORD ?? env.MONGODB_PASSWORD;
  if (!rawPassword) {
    throw new Error('Missing MONGODB_PASSWORD in .env');
  }

  const password = encodeURIComponent(rawPassword);
  const uri = `mongodb+srv://mainUser:${password}@hackathoncluster.spemcti.mongodb.net/?appName=HackathonCluster`;

  const viteServer = await createViteServer({
    root: projectRoot,
    server: {
      port,
      strictPort: true,
    },
  });

  await viteServer.listen();

  console.log(`Server running at http://localhost:${port}`);
  console.log(`MongoDB URI configured from .env`);
}

createServer().catch((err) => {
  console.error(err.message);
  process.exit(1);
});