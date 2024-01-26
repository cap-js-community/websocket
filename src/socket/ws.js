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
    cds.ws = this;
    cds.wss = this.wss;
  }

  async setup() {
    await this.applyAdapter();
    this._middlewares = this.middlewares();
  }

  service(service, connected) {
    this.adapter?.on(service);
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
      this.applyMiddleware(ws, async () => {
        try {
          const facade = {
            service,
            socket: ws,
            setup: () => {
              this.enforceAuth(ws);
            },
            context: () => {
              return {
                id: ws.request.correlationId,
                user: ws.request.user,
                tenant: ws.request.tenant,
                http: { req: ws.request, res: ws.request.res },
                ws: { service: facade, socket: ws },
              };
            },
            on: (event, callback) => {
              ws.on("message", async (message) => {
                let payload = {};
                try {
                  payload = JSON.parse(message);
                } catch (_) {
                  // ignore
                }
                try {
                  if (payload?.event === event) {
                    await callback(payload.data);
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
              this.broadcast(service, event, data, ws, true);
            },
            broadcastAll: (event, data) => {
              this.broadcast(service, event, data, null, true);
            },
            disconnect() {
              ws.close();
            },
          };
          connected && connected(facade);
        } catch (err) {
          LOG?.error(err);
        }
      });
    });
  }

  async broadcast(service, event, data, socket, remote) {
    const clients = [];
    this.wss.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client !== socket &&
        client.request?.url === `${this.path}${service}`
      ) {
        clients.push(client);
      }
    });
    if (clients.length > 0 || remote) {
      const message = !data ? event : JSON.stringify({ event, data });
      clients.forEach((client) => {
        client.send(message);
      });
      if (remote) {
        await this.adapter?.emit(service, message);
      }
    }
  }

  close(socket, code, reason) {
    if (socket) {
      socket.close(code, reason);
    } else {
      this.wss.close();
    }
  }

  async applyAdapter() {
    try {
      const adapterImpl = cds.env.websocket?.adapter?.impl;
      if (adapterImpl) {
        let options = {};
        if (cds.env.websocket?.adapter?.options) {
          options = { ...options, ...cds.env.websocket?.adapter?.options };
        }
        const prefix = options?.key ?? "websocket";
        const adapterFactory = require(`../adapter/${adapterImpl}`);
        this.adapter = new adapterFactory(this, prefix, options);
        await this.adapter?.setup();
        this.adapterActive = !!this.adapter?.client;
      }
    } catch (err) {
      LOG?.error(err);
    }
  }

  applyMiddleware(ws, next) {
    const middlewares = this._middlewares.slice(0);
    function call() {
      const middleware = middlewares.shift();
      if (!middleware) {
        return next(null);
      }
      middleware(ws, (err) => {
        if (err) {
          next(err);
        } else {
          call();
        }
      });
    }
    call();
  }

  enforceAuth(ws) {
    if (ws.request.isAuthenticated && !ws.request.isAuthenticated()) {
      throw new Error("403 - Forbidden");
    }
  }
}

module.exports = SocketWSServer;
