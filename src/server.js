import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const {
  PORT = 3000,
  MONGODB_URI = 'mongodb://mongo:27017',
  MONGODB_DB = 'message_app',
  MONGODB_COLLECTION = 'messages',
  MONGODB_CONNECT_RETRIES = '10',
  MONGODB_CONNECT_RETRY_DELAY_MS = '1000'
} = process.env;

async function start() {
  const { app } = await createApp({
    mongodbUri: MONGODB_URI,
    mongodbDb: MONGODB_DB,
    mongodbCollection: MONGODB_COLLECTION,
    mongodbConnectRetries: Number.parseInt(MONGODB_CONNECT_RETRIES, 10),
    mongodbConnectRetryDelayMs: Number.parseInt(MONGODB_CONNECT_RETRY_DELAY_MS, 10),
    serveStatic: true
  });

  app.listen(PORT, () => {
    console.log(`Message app running at http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
