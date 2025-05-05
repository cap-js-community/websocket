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
    this.wss = new WebSocket.Server({ ...config?.options, noServer: true });
    this.services = new Map();
    cds.ws = this;
    cds.wss = this.wss;
  }

  async setup() {
    await this.applyAdapter();
    this._middlewares = this.middlewares();
    this.server.on("upgrade", (request, socket, head) => {
      socket.request = request;
      const onSocketError = (err) => {
        LOG?.error(err);
      };
      socket.on("error", onSocketError);
      this.applyMiddlewares(socket, async (err) => {
        if (err) {
          DEBUG?.(err);
          socket.write(`HTTP/1.1 ${err.statusCode || err.code} ${err.message}\r\n\r\n`);
          socket.destroy();
          return;
        }
        const url = request?.url;
        const urlObj = URL.parse(url, true);
        request.queryOptions = urlObj?.query || {};
        request.id ??= request.queryOptions.id;
        request.url = urlObj?.pathname;
        if (!(typeof this.services.get(request.url) === "function")) {
          socket.write(`HTTP/1.1 404 Not Found\r\n\r\n`);
          socket.destroy();
          return;
        }
        socket.removeListener("error", onSocketError);
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          DEBUG?.("Upgraded");
          this.onInit(ws, request);
          this.wss.emit("connection", ws, request);
        });
      });
    });

    this.wss.on("connection", async (ws, request) => {
      if (typeof this.services.get(request.url) === "function") {
        this.services.get(request.url)(ws, request);
      } else {
        DEBUG?.("No websocket service for url", request.url);
      }
    });
  }

  service(service, path, connected) {
    this.adapter?.on(service, path);
    const format = this.format(service);
    this.services.set(this.servicePath(path), (ws, request) => {
      DEBUG?.("Initialized");
      ws.on("close", () => {
        this.onDisconnect(ws);
        DEBUG?.("Disconnected");
      });
      ws.on("error", (err) => {
        LOG?.error(err);
      });
      ws.on("message", async (message) => {
        try {
          const payload = format.parse(message);
          for (const callback of this.getFromMap(ws.events, payload?.event, new Set())) {
            await callback(payload.data);
          }
        } catch (err) {
          LOG?.error(err);
          throw err;
        }
      });
      try {
        ws.context = this.initContext();
        ws.facade = {
          service,
          path,
          socket: ws,
          get context() {
            return ws.context;
          },
          on: (event, callback) => {
            this.addToSetOfMap(ws.events, event, callback);
          },
          emit: async (event, data) => {
            try {
              await ws.send(format.compose(event, data));
            } catch (err) {
              LOG?.error(err);
              throw err;
            }
          },
          broadcast: async (event, data, user, context, identifier, headers) => {
            await this.broadcast({
              service,
              path,
              event,
              data,
              tenant: ws.context.tenant,
              user,
              context,
              identifier,
              headers,
              socket: ws,
            });
          },
          broadcastAll: async (event, data, user, context, identifier, headers) => {
            await this.broadcast({
              service,
              path,
              event,
              data,
              tenant: ws.context.tenant,
              user,
              context,
              identifier,
              headers,
              socket: null,
            });
          },
          enter: async (context) => {
            ws.contexts.add(context);
            const clients = this.fetchClients(ws.context.tenant, ws.request?.url);
            this.addToSetOfMap(clients.contexts, context, ws);
          },
          exit: async (context) => {
            ws.contexts.delete(context);
            const clients = this.fetchClients(ws.context.tenant, ws.request?.url);
            this.deleteFromSetOfMap(clients.contexts, context, ws);
          },
          reset: async () => {
            for (const context of ws.contexts) {
              await ws.facade.exit(context);
            }
          },
          disconnect() {
            ws.close();
          },
          onDisconnect: (callback) => {
            ws.on("close", callback);
          },
        };
        ws.context.ws = { service: ws.facade, socket: ws };
        this.onConnect(ws);
        connected && connected(ws.facade);
        DEBUG?.("Connected");
      } catch (err) {
        LOG?.error(err);
      }
    });
  }

  async broadcast({ service, path, event, data, tenant, user, context, identifier, headers, socket, local }) {
    try {
      const eventMessage = event;
      const isEventMessage = !data;
      if (isEventMessage) {
        const message = JSON.parse(eventMessage);
        event = message.event;
        data = message.data;
        tenant = message.tenant;
        user = message.user;
        context = message.context;
        identifier = message.identifier;
      }
      path = path || this.defaultPath(service);
      tenant = tenant || socket?.context.tenant;
      const serviceClients = this.fetchClients(tenant, this.servicePath(path));
      const clients = new Set(serviceClients.all);
      if (user?.include?.length) {
        this.keepEntriesFromSet(clients, this.collectFromMap(serviceClients.users, user?.include));
      }
      if (context?.include?.length) {
        this.keepEntriesFromSet(clients, this.collectFromMap(serviceClients.contexts, context?.include));
      }
      if (identifier?.include?.length) {
        this.keepEntriesFromSet(clients, this.collectFromMap(serviceClients.identifiers, identifier?.include));
      }
      if (user?.exclude?.length) {
        this.keepEntriesFromSet(
          clients,
          this.collectFromSet(clients, (client) => {
            return !user?.exclude.includes(client.context.user?.id);
          }),
        );
      }
      if (context?.exclude?.length) {
        this.keepEntriesFromSet(
          clients,
          this.collectFromSet(clients, (client) => {
            return !context?.exclude.find((context) => client.contexts.has(context));
          }),
        );
      }
      if (identifier?.exclude?.length) {
        this.keepEntriesFromSet(
          clients,
          this.collectFromSet(clients, (client) => {
            return !identifier?.exclude.includes(client.request?.id);
          }),
        );
      }
      if (clients.size > 0) {
        const format = this.format(service, event);
        const clientMessage = format.compose(event, data, headers);
        for (const client of clients) {
          if (client !== socket && client.readyState === WebSocket.OPEN) {
            await client.send(clientMessage);
          }
        }
      }
      if (!local) {
        const adapterMessage = isEventMessage
          ? eventMessage
          : JSON.stringify({ event, data, tenant, user, context, identifier, headers });
        await this.adapter?.emit(service, path, adapterMessage);
      }
    } catch (err) {
      LOG?.error(err);
      throw err;
    }
  }

  close(socket, code, reason) {
    if (socket) {
      socket.close?.(code, reason);
    } else {
      this.wss.close();
    }
  }

  onInit(ws, request) {
    ws.request = request;
    ws.events = new Map(); // Map<event, Set<callback>>
    ws.contexts = new Set(); // Set<context>
  }

  onConnect(ws) {
    const clients = this.fetchClients(ws.context.tenant, ws.request?.url);
    clients.all.add(ws);
    if (ws.context.user?.id) {
      this.addToSetOfMap(clients.users, ws.context.user?.id, ws);
    }
    if (ws.request?.id) {
      this.addToSetOfMap(clients.identifiers, ws.request?.id, ws);
    }
  }

  onDisconnect(ws) {
    ws.events.clear();
    ws.contexts.clear();
    const clients = this.fetchClients(ws.context?.tenant, ws.request?.url);
    clients.all.delete(ws);
    if (ws.context?.user?.id) {
      this.deleteFromSetOfMap(clients.users, ws.context?.user?.id, ws);
    }
    for (const [key] of clients.contexts) {
      this.deleteFromSetOfMap(clients.contexts, key, ws);
    }
    if (ws.request?.id) {
      this.deleteFromSetOfMap(clients.identifiers, ws.request?.id, ws);
    }
  }

  fetchClients(tenant, service) {
    this.wss.cdsClients ??= new Map(); // Map<tenant, Map<service,...>>
    const initTenantClients = new Map(); // Map<service, {all,users,contexts,identifiers}>
    const serviceClients = this.getFromMap(this.wss.cdsClients, tenant, initTenantClients);
    return this.getFromMap(serviceClients, service, {
      all: new Set(), // Set<client>
      users: new Map(), // Map<user, Set<client>>
      contexts: new Map(), // Map<context, Set<client>>
      identifiers: new Map(), // Map<identifier, Set<client>>
    });
  }

  async applyAdapter() {
    try {
      const config = { ...this.config?.adapter };
      if (config.impl) {
        const adapterFactory = SocketServer.require(config.impl, "adapter");
        if (adapterFactory) {
          this.adapter = new adapterFactory(this, config);
          await this.adapter?.setup?.();
          this.adapterImpl = config.impl;
          this.adapterActive = !!this.adapter?.client;
        }
      }
    } catch (err) {
      LOG?.error(err);
    }
  }

  applyMiddlewares(socket, next) {
    const middlewares = this._middlewares.slice(0);

    function call() {
      try {
        const middleware = middlewares.shift();
        if (!middleware) {
          return next(null);
        }
        middleware(socket, (err) => {
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
