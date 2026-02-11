import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';
import { MongoClient } from 'mongodb';
import { createApp } from '../src/app.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function isMongoReachable(uri) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1500 });
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    return true;
  } catch {
    return false;
  } finally {
    await client.close().catch(() => {});
  }
}

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

async function withMongoApp(t) {
  const reachable = await isMongoReachable(MONGODB_URI);
  if (!reachable) {
    t.skip(`MongoDB is not reachable at ${MONGODB_URI}`);
  }

  const dbName = `ci_${randomUUID().replaceAll('-', '')}`;
  const { app, close } = await createApp({
    mongodbUri: MONGODB_URI,
    mongodbDb: dbName,
    mongodbCollection: 'messages',
    serveStatic: false,
    dropDbOnClose: true,
    mongodbConnectRetries: 1,
    mongodbConnectRetryDelayMs: 100
  });
  const server = await startServer(app);

  return { app, close, server };
}

test('stores a message and retrieves it', async (t) => {
  const { close, server } = await withMongoApp(t);

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

test('validates message input', async (t) => {
  const { close, server } = await withMongoApp(t);

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

test('returns latest 10 messages in newest-first order', async (t) => {
  const { close, server } = await withMongoApp(t);

  try {
    for (let i = 1; i <= 12; i += 1) {
      const postRes = await fetch(`${server.baseUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `msg-${i}` })
      });
      assert.equal(postRes.status, 201);
    }

    const getRes = await fetch(`${server.baseUrl}/api/messages`);
    assert.equal(getRes.status, 200);
    const data = await getRes.json();

    assert.equal(data.messages.length, 10);
    assert.equal(data.messages[0].message, 'msg-12');
    assert.equal(data.messages[9].message, 'msg-3');
  } finally {
    await server.stop();
    await close();
  }
});
