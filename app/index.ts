import dotenv from 'dotenv';
import { ServerWebSocket } from 'bun';
import { createClient } from 'redis';

dotenv.config();

const APPID = process.env.APPID;

const connections: ServerWebSocket<unknown>[] = [];

const subscriber = createClient({
  url: 'redis://rds:6379',
});

const publisher = createClient({
  url: 'redis://rds:6379',
});

subscriber.on('error', err => console.log('Subscriber Redis Client Error', err));
publisher.on('error', err => console.log('Publisher Redis Client Error', err));

subscriber.connect().then(() => {
  console.log('Subscirber Redis client connected!!');
});

publisher.connect().then(() => {
  console.log('Publisher Redis client connected!!');
});

subscriber.SUBSCRIBE('livechat', (message, channel) => {
  try {
    console.log(`Server ${APPID} received message in channel ${channel} msg: ${message}`);
    connections.forEach(connection => {
      connection.send(APPID + ':' + message);
    });
  } catch (ex) {
    console.log('ERR::' + ex);
  }
});

subscriber.on('subscribe', function (channel, count) {
  console.log(`Server ${APPID} subscribed successfully to livechat`);
});

Bun.serve({
  fetch(req, server) {
    /**
     * upgrade to WebSocket only if url path is /chat
     * const url = new URL(req.url);
     * if (url.pathname === '/chat') {
     *   const success = server.upgrade(req);
     *   return success ? undefined : new Response('WebSocket upgrade error', { status: 400 });
     * }
     */

    /**
     * upgrade every request to a WebSocket
     */
    if (server.upgrade(req)) {
      return;
    }
    return new Response('Upgrade failed :(', { status: 500 });
  },
  websocket: {
    message(ws, message) {
      console.log(`${APPID} Received message ${message.toString()}`);
      publisher.publish('livechat', message.toString());
    },
    open(ws) {
      setTimeout(() => ws.sendText(`Connected successfully to server ${APPID}`), 2000);
      connections.push(ws);
    },
    close(ws, code, message) {
      console.log('CLOSED!!!');
    },
  },
  port: 8080,
});
