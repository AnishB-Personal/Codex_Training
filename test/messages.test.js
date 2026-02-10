import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';
import { createApp } from '../src/app.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function startServer(app) {
  const server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    async stop() {
      server.close();
      await once(server, 'close');
    }
  };
}

test('stores a message and retrieves it', async () => {
  const dbName = `ci_${randomUUID().replaceAll('-', '')}`;

  const { app, close } = await createApp({
    mongodbUri: MONGODB_URI,
    mongodbDb: dbName,
    mongodbCollection: 'messages',
    serveStatic: false,
    dropDbOnClose: true
  });

  const server = await startServer(app);

  try {
    const postRes = await fetch(`${server.baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' })
    });
    assert.equal(postRes.status, 201);

    const getRes = await fetch(`${server.baseUrl}/api/messages`);
    assert.equal(getRes.status, 200);
    const data = await getRes.json();

    assert.ok(Array.isArray(data.messages));
    assert.ok(data.messages.length >= 1);
    assert.equal(data.messages[0].message, 'hello');
    assert.ok(typeof data.messages[0].timestamp === 'string');
  } finally {
    await server.stop();
    await close();
  }
});

test('validates message input', async () => {
  const dbName = `ci_${randomUUID().replaceAll('-', '')}`;

  const { app, close } = await createApp({
    mongodbUri: MONGODB_URI,
    mongodbDb: dbName,
    mongodbCollection: 'messages',
    serveStatic: false,
    dropDbOnClose: true
  });

  const server = await startServer(app);

  try {
    const emptyRes = await fetch(`${server.baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' })
    });
    assert.equal(emptyRes.status, 400);

    const longMessage = 'a'.repeat(251);
    const tooLongRes = await fetch(`${server.baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: longMessage })
    });
    assert.equal(tooLongRes.status, 400);
  } finally {
    await server.stop();
    await close();
  }
});

