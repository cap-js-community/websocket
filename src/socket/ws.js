"use strict";

const SocketServer = require("./base");
const WebSocket = require("ws");
const redis = require("../adapter/redis");
const cds = require("@sap/cds");

const LOG = cds.log("websocket/ws");

class SocketWSServer extends SocketServer {
  constructor(server, path) {
    super(server, path);
    this.wss = new WebSocket.Server({ server });
    this.wss.broadcast = (message, socket) => {
      this.wss.clients.forEach((client) => {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    };
    this.wss.broadcastAll = (message) => {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    };
    cds.ws = this.wss;
    cds.wss = this.wss;
  }

  service(service, connected) {
    this.wss.on("connection", async (ws, request) => {
      ws.request = request;
      if (ws.request?.url !== `${this.path}${service}`) {
        return;
      }
      ws.on("error", (error) => {
        LOG?.error(error);
      });
      applyMiddleware(ws, request, async () => {
        const redisClient = await redis.createMainClientAndConnect();
        const channel = cds.env.requires.websocket?.adapter?.options?.key ?? "websocket";
        subscribeRedis(redisClient, ws, channel);
        connected &&
          connected({
            socket: ws,
            setup: () => {
              enforceAuth(ws);
            },
            context: () => {
              return {
                id: ws.request.correlationId,
                user: ws.request.user,
                tenant: ws.request.tenant,
                http: { req: ws.request, res: ws.request.res },
                socket: ws,
              };
            },
            on: (event, callback) => {
              ws.on("message", (message) => {
                let payload;
                try {
                  payload = JSON.parse(message);
                } catch (_) {
                  // ignore
                }
                if (payload?.event === event) {
                  publishRedis(redisClient, ws, channel, message);
                  callback(payload.data);
                }
              });
            },
            emit: (event, data) => {
              ws.send(
                JSON.stringify({
                  event,
                  data,
                }),
              );
            },
            broadcast: (event, data) => {
              this.wss.broadcast(
                JSON.stringify({
                  event,
                  data,
                }),
                ws,
              );
            },
            disconnect() {
              ws.disconnect();
            },
          });
      });
    });
  }
}

function applyMiddleware(ws, request, next) {
  // Mock response (not available in websockets), CDS accesses it
  ws.request.res ??= {
    set: (name, value) => {
      if (name.toLowerCase() === "x-correlation-id") {
        ws.request.correlationId = value;
      }
    },
  };
  SocketServer.applyAuthCookie(request);
  // Middleware
  let middlewares = [];
  for (const middleware of cds.middlewares?.before ?? []) {
    if (Array.isArray(middleware)) {
      middlewares = middlewares.concat(middleware);
    } else {
      middlewares.push(middleware);
    }
  }
  function apply() {
    const middleware = middlewares.shift();
    if (!middleware) {
      return next();
    }
    middleware(ws.request, ws.request.res, apply);
  }
  apply();
}

function subscribeRedis(redisClient, ws, channel) {
  if (redisClient) {
    redisClient.subscribe(channel);
    redisClient.on("message", (onChannel, message) => {
      if (onChannel === channel) {
        ws.send(message);
      }
    });
  }
}

function publishRedis(redisClient, ws, channel, message) {
  if (redisClient) {
    redisClient.publish(channel, message);
  }
}

function enforceAuth(ws) {
  if (ws.request.isAuthenticated && !ws.request.isAuthenticated()) {
    ws.disconnect();
    throw new Error("403 - Forbidden");
  }
}

module.exports = SocketWSServer;
