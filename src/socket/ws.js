"use strict";

const SocketServer = require("./base");
const WebSocket = require("ws");
const cds = require("@sap/cds");

const LOG = cds.log("websocket/ws");
const DEBUG = cds.debug("websocket");

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
    this.adapter = null;
    cds.ws = this.wss;
    cds.wss = this.wss;
  }

  async setup() {
    await this._applyAdapter();
  }

  service(service, connected) {
    this.wss.on("connection", async (ws, request) => {
      ws.request = request;
      if (ws.request?.url !== `${this.path}${service}`) {
        return;
      }
      DEBUG?.("Connected");
      ws.on("close", () => {
        DEBUG?.("Disconnected");
      });
      ws.on("error", (error) => {
        LOG?.error(error);
      });
      this._applyMiddleware(ws, async () => {
        try {
          connected &&
            connected({
              socket: ws,
              setup: () => {
                this._enforceAuth(ws);
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
                ws.on("message", async (message) => {
                  let payload;
                  try {
                    payload = JSON.parse(message);
                  } catch (_) {
                    // ignore
                  }
                  try {
                    if (payload?.event === event) {
                      await callback(payload.data);
                      if (this.adapter) {
                        await this.adapter.emit(message);
                      }
                    }
                  } catch (err) {
                    LOG?.error(err);
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
        } catch (err) {
          LOG?.error(err);
        }
      });
    });
  }

  async _applyAdapter() {
    try {
      const adapterImpl = cds.env.requires?.websocket?.adapter?.impl;
      if (adapterImpl) {
        let options = {};
        if (cds.env.requires.websocket?.adapter?.options) {
          options = { ...options, ...cds.env.requires.websocket?.adapter?.options };
        }
        const channel = options?.key ?? "websocket";
        this.adapterFactory = require(`../adapter/${adapterImpl}`);
        this.adapter = new this.adapterFactory(this, channel, options);
        await this.adapter.setup();
        await this.adapter.on();
      }
    } catch (err) {
      LOG?.error(err);
    }
  }

  _applyMiddleware(ws, next) {
    SocketServer.mockResponse(ws.request);
    SocketServer.applyAuthCookie(ws.request);
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

  _enforceAuth(ws) {
    if (ws.request.isAuthenticated && !ws.request.isAuthenticated()) {
      ws.disconnect();
      throw new Error("403 - Forbidden");
    }
  }
}

module.exports = SocketWSServer;
