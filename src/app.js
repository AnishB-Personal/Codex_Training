import express from 'express';
import { MongoClient } from 'mongodb';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}:${month}:${year} ${hours}:${minutes}:${seconds}`;
}

export async function createApp({
  mongodbUri,
  mongodbDb,
  mongodbCollection,
  serveStatic = true,
  dropDbOnClose = false
}) {
  if (!mongodbUri) throw new Error('mongodbUri is required');
  if (!mongodbDb) throw new Error('mongodbDb is required');
  if (!mongodbCollection) throw new Error('mongodbCollection is required');

  const app = express();
  app.use(express.json());

  if (serveStatic) {
    app.use(express.static(path.join(__dirname, '..', 'public')));
  }

  const client = new MongoClient(mongodbUri);
  await client.connect();
  const db = client.db(mongodbDb);
  const messagesCollectionRef = db.collection(mongodbCollection);

  app.get('/api/messages', async (req, res, next) => {
    try {
      const records = await messagesCollectionRef
        .find({}, { projection: { message: 1, timestamp: 1, _id: 0 } })
        .sort({ _id: -1 })
        .limit(10)
        .toArray();

      res.json({ messages: records });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/messages', async (req, res, next) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

      if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      if (message.length > 250) {
        return res.status(400).json({ error: 'Message must be 250 characters or fewer.' });
      }

      const timestamp = formatTimestamp(new Date());

      await messagesCollectionRef.insertOne({
        message,
        timestamp
      });

      res.status(201).json({ message: 'Stored', timestamp });
    } catch (error) {
      next(error);
    }
  });

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use((error, req, res, _next) => {
    console.error('Request error:', error);
    res.status(500).json({ error: 'Server error.' });
  });

  async function close() {
    if (dropDbOnClose) {
      await db.dropDatabase();
    }
    await client.close();
  }

  return { app, close };
}
