import express from 'express';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const {
  PORT = 3000,
  MONGODB_URI = 'mongodb://mongo:27017',
  MONGODB_DB = 'message_app',
  MONGODB_COLLECTION = 'messages'
} = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const client = new MongoClient(MONGODB_URI);
let messagesCollection;

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

app.get('/api/messages', async (req, res, next) => {
  try {
    const records = await messagesCollection
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

    await messagesCollection.insertOne({
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

app.use((error, req, res, next) => {
  console.error('Request error:', error);
  res.status(500).json({ error: 'Server error.' });
});

async function start() {
  await client.connect();
  const db = client.db(MONGODB_DB);
  messagesCollection = db.collection(MONGODB_COLLECTION);

  app.listen(PORT, () => {
    console.log(`Message app running at http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
