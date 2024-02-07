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
    this.services = {};
    cds.ws = this;
    cds.wss = this.wss;
  }

  async setup() {
    await this.applyAdapter();
    this._middlewares = this.middlewares();
    this.wss.on("connection", async (ws, request) => {
      this.services[request?.url]?.(ws, request);
    });
  }

  service(service, connected) {
    this.adapter?.on(service);
    const servicePath = `${this.path}${service}`;
    this.services[servicePath] = (ws, request) => {
      ws.request = request;
      ws.events = {};
      ws.contexts = {};
      DEBUG?.("Connected");
      ws.on("close", () => {
        Object.keys(ws.contexts).forEach((context) => {
          ws.contexts[context].delete(ws);
          if (ws.contexts[context].size === 0) {
            delete ws.contexts[context];
          }
        });
        DEBUG?.("Disconnected");
      });
      ws.on("error", (error) => {
        LOG?.error(error);
      });
      ws.on("message", async (message) => {
        let payload = {};
        try {
          payload = JSON.parse(message);
        } catch (_) {
          // ignore
        }
        try {
          for (const callback of ws.events[payload?.event] || []) {
            await callback(payload.data);
          }
        } catch (err) {
          LOG?.error(err);
        }
      });
      this.applyMiddlewares(ws, async () => {
        try {
          ws.tenant = ws.request.tenant;
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
              ws.events[event] ??= [];
              ws.events[event].push(callback);
            },
            emit: async (event, data, contexts) => {
              if (
                !contexts ||
                contexts.find((context) => {
                  return ws.contexts[context]?.has(ws);
                })
              ) {
                await ws.send(
                  JSON.stringify({
                    event,
                    data,
                  }),
                );
              }
            },
            broadcast: async (event, data, contexts) => {
              await this.broadcast({ service, event, data, tenant: ws.tenant, contexts, socket: ws, remote: true });
            },
            broadcastAll: async (event, data, contexts) => {
              await this.broadcast({ service, event, data, tenant: ws.tenant, contexts, socket: null, remote: true });
            },
            enter: async (context) => {
              ws.contexts[context] ??= new Set();
              ws.contexts[context].add(ws);
            },
            exit: async (context) => {
              ws.contexts[context] ??= new Set();
              ws.contexts[context].delete(ws);
            },
            disconnect() {
              ws.close();
            },
            onDisconnect: (callback) => {
              ws.on("close", callback);
            },
          };
          ws.facade = facade;
          connected && connected(facade);
        } catch (err) {
          LOG?.error(err);
        }
      });
    };
  }

  async broadcast({ service, event, data, tenant, contexts, socket, remote }) {
    const eventMessage = !data;
    if (eventMessage) {
      const message = JSON.parse(event);
      data = message.data;
      tenant = message.tenant;
      contexts = message.contexts;
    }
    const servicePath = `${this.path}${service}`;
    const clients = [];
    this.wss.clients.forEach((client) => {
      if (
        client !== socket &&
        client.readyState === WebSocket.OPEN &&
        client.request?.url === servicePath &&
        client.tenant === tenant &&
        (!contexts ||
          contexts.find((context) => {
            return client.contexts[context]?.has(client);
          }))
      ) {
        clients.push(client);
      }
    });
    if (clients.length > 0 || remote) {
      const message = eventMessage ? event : JSON.stringify({ event, data, tenant, contexts });
      for (const client of clients) {
        await client.send(message);
      }
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
        const adapterFactory = SocketServer.require(adapterImpl, "adapter");
        this.adapter = new adapterFactory(this, prefix, options);
        await this.adapter?.setup();
        this.adapterActive = !!this.adapter?.client;
      }
    } catch (err) {
      LOG?.error(err);
    }
  }

  applyMiddlewares(ws, next) {
    const middlewares = this._middlewares.slice(0);

    function call() {
      try {
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
      } catch (err) {
        next(err);
      }
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
