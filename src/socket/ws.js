"use strict";

const URL = require("url");
const cds = require("@sap/cds");
const WebSocket = require("ws");

const SocketServer = require("./base");

const LOG = cds.log("/websocket/ws");
const DEBUG = cds.debug("websocket");

class SocketWSServer extends SocketServer {
  constructor(server, path, config) {
    super(server, path, config);
    this.wss = new WebSocket.Server({ server });
    this.services = {};
    cds.ws = this;
    cds.wss = this.wss;
  }

  async setup() {
    await this.applyAdapter();
    this._middlewares = this.middlewares();
    this.wss.on("connection", async (ws, request) => {
      const url = request?.url;
      if (url) {
        const urlObj = URL.parse(url, true);
        request.queryOptions = urlObj.query;
        request.url = urlObj.pathname;
        this.services[request.url]?.(ws, request);
      }
    });
  }

  service(service, path, connected) {
    this.adapter?.on(service, path);
    const servicePath = `${this.path}${path}`;
    const format = this.format(service);
    this.services[servicePath] = (ws, request) => {
      ws.request = request;
      ws.events = new Map();
      ws.contexts = new Set();
      DEBUG?.("Connected");
      ws.on("close", () => {
        ws.events.clear();
        ws.contexts.clear();
        DEBUG?.("Disconnected");
      });
      ws.on("error", (err) => {
        LOG?.error(err);
      });
      ws.on("message", async (message) => {
        const payload = format.parse(message);
        try {
          for (const callback of ws.events.get(payload?.event) || []) {
            await callback(payload.data);
          }
        } catch (err) {
          LOG?.error(err);
        }
      });
      this.applyMiddlewares(ws, async () => {
        try {
          this.enforceAuth(ws);
          ws.context = { ...cds.context };
          ws.facade = {
            service,
            path,
            socket: ws,
            get context() {
              return ws.context;
            },
            on: (event, callback) => {
              let callbacks = ws.events.get(event);
              if (!callbacks) {
                callbacks = [];
                ws.events.set(event, callbacks);
              }
              callbacks.push(callback);
            },
            emit: async (event, data) => {
              await ws.send(format.compose(event, data));
            },
            broadcast: async (event, data, user, contexts, identifier) => {
              await this.broadcast({
                service,
                path,
                event,
                data,
                tenant: ws.context.tenant,
                user,
                contexts,
                identifier,
                socket: ws,
                remote: true,
              });
            },
            broadcastAll: async (event, data, user, contexts, identifier) => {
              await this.broadcast({
                service,
                path,
                event,
                data,
                tenant: ws.context.tenant,
                user,
                contexts,
                identifier,
                socket: null,
                remote: true,
              });
            },
            enter: async (context) => {
              ws.contexts.add(context);
            },
            exit: async (context) => {
              ws.contexts.delete(context);
            },
            disconnect() {
              ws.close();
            },
            onDisconnect: (callback) => {
              ws.on("close", callback);
            },
          };
          ws.context.ws = { service: ws.facade, socket: ws };
          connected && connected(ws.facade);
        } catch (err) {
          LOG?.error(err);
        }
      });
    };
  }

  async broadcast({ service, path, event, data, tenant, user, contexts, identifier, socket, remote }) {
    const eventMessage = event;
    const isEventMessage = !data;
    if (isEventMessage) {
      const message = JSON.parse(eventMessage);
      event = message.event;
      data = message.data;
      tenant = message.tenant;
      user = message.user;
      contexts = message.contexts;
      identifier = message.identifier;
    }
    const servicePath = `${this.path}${path}`;
    const clients = [];
    this.wss.clients.forEach((client) => {
      if (
        client !== socket &&
        client.readyState === WebSocket.OPEN &&
        client.request?.url === servicePath &&
        client.context.tenant === tenant &&
        (!user?.include || client.context.user?.id === user.include) &&
        (!user?.exclude || client.context.user?.id !== user.exclude) &&
        (!contexts?.length || contexts.find((context) => client.contexts.has(context))) &&
        (!identifier?.include?.length || identifier.include.includes(client.request?.queryOptions?.id)) &&
        (!identifier?.exclude?.length || !identifier.exclude.includes(client.request?.queryOptions?.id))
      ) {
        clients.push(client);
      }
    });
    if (clients.length > 0) {
      const format = this.format(service);
      const clientMessage = format.compose(event, data);
      for (const client of clients) {
        await client.send(clientMessage);
      }
    }
    if (remote) {
      const adapterMessage = isEventMessage
        ? eventMessage
        : JSON.stringify({ event, data, tenant, user, contexts, identifier });
      await this.adapter?.emit(service, path, adapterMessage);
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
      const config = { ...this.config?.adapter };
      if (config.impl) {
        const adapterFactory = SocketServer.require(config.impl, "adapter");
        this.adapter = new adapterFactory(this, config);
        await this.adapter?.setup?.();
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
}

module.exports = SocketWSServer;
