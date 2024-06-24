"use strict";

const cds = require("@sap/cds");
const { Server } = require("socket.io");

const SocketServer = require("./base");
const redis = require("../redis");

const LOG = cds.log("/websocket/socket.io");
const DEBUG = cds.debug("websocket");

class SocketIOServer extends SocketServer {
  constructor(server, path, config) {
    super(server, path, config);
    this.io = new Server(server, {
      path,
      ...config?.options,
    });
    this.io.engine.on("connection_error", (err) => {
      delete err.req;
      LOG?.error(err);
    });
    cds.ws = this;
    cds.io = this.io;
  }

  async setup() {
    await this.applyAdapter();
  }

  service(service, connected) {
    const io = this.applyMiddlewares(this.io.of(service));
    io.on("connection", async (socket) => {
      try {
        this.enforceAuth(socket);
        socket.contextId = cds.context.id;
        socket.user = cds.context.user;
        socket.tenant = cds.context.tenant;
        socket.join(room({ tenant: socket.tenant }));
        socket.join(room({ tenant: socket.tenant, user: socket.user?.id }));
        if (socket.request._query?.id) {
          socket.join(room({ tenant: socket.tenant, identifier: socket.request._query?.id }));
        }
        DEBUG?.("Connected", socket.id);
        socket.on("disconnect", () => {
          DEBUG?.("Disconnected", socket.id);
        });
        const facade = {
          service,
          socket,
          get context() {
            return {
              id: socket.contextId,
              user: socket.user,
              tenant: socket.tenant,
              http: { req: socket.request, res: socket.request.res },
              ws: { service: facade, socket, io },
            };
          },
          on: (event, callback) => {
            socket.on(event, callback);
          },
          emit: async (event, data) => {
            await socket.emit(event, data);
          },
          broadcast: async (event, data, user, contexts, identifier) => {
            await this.broadcast({
              service,
              event,
              data,
              tenant: socket.tenant,
              user,
              contexts,
              identifier,
              socket,
              remote: true,
            });
          },
          broadcastAll: async (event, data, user, contexts, identifier) => {
            await this.broadcast({
              service,
              event,
              data,
              tenant: socket.tenant,
              user,
              contexts,
              identifier,
              socket: null,
              remote: true,
            });
          },
          enter: async (context) => {
            await socket.join(room({ tenant: socket.tenant, context }));
          },
          exit: async (context) => {
            await socket.leave(room({ tenant: socket.tenant, context }));
          },
          disconnect() {
            socket.disconnect();
          },
          onDisconnect: (callback) => {
            socket.on("disconnect", callback);
          },
        };
        socket.facade = facade;
        connected && connected(facade);
      } catch (err) {
        LOG?.error(err);
      }
    });
  }

  async broadcast({ service, event, data, tenant, user, contexts, identifier, socket }) {
    let to = socket?.broadcast || this.io.of(service);
    if (contexts) {
      for (const context of contexts || []) {
        to = to.to(room({ tenant, context }));
      }
    } else {
      to = to.to(room({ tenant }));
    }
    if (user) {
      to = to.except(room({ tenant, user }));
    }
    if (identifier) {
      to = to.except(room({ tenant, identifier }));
    }
    to.emit(event, data);
  }

  close(socket) {
    if (socket) {
      socket.disconnect();
    } else {
      this.io.close();
    }
  }

  async applyAdapter() {
    try {
      const config = { ...this.config?.adapter };
      if (config.impl) {
        let client;
        let subClient;
        const options = { ...config?.options };
        const adapterFactory = SocketServer.require(config.impl);
        switch (config.impl) {
          case "@socket.io/redis-adapter":
            if (await redis.connectionCheck(config)) {
              client = await redis.createPrimaryClientAndConnect(config);
              if (client) {
                subClient = await redis.createSecondaryClientAndConnect(config);
                if (subClient) {
                  this.adapter = adapterFactory.createAdapter(client, subClient, options);
                }
              }
            }
            break;
          case "@socket.io/redis-streams-adapter":
            if (await redis.connectionCheck(config)) {
              client = await redis.createPrimaryClientAndConnect(config);
              if (client) {
                this.adapter = adapterFactory.createAdapter(client, options);
              }
            }
            break;
          default:
            this.adapter = adapterFactory.createAdapter(this, options, config);
            break;
        }
        if (this.adapter) {
          this.io.adapter(this.adapter);
          this.adapterActive = true;
        }
      }
    } catch (err) {
      LOG?.error(err);
    }
  }

  applyMiddlewares(io) {
    for (const middleware of this.middlewares()) {
      io.use(middleware);
    }
    return io;
  }
}

function room({ tenant, user, context, identifier }) {
  return `${tenant ? `/tenant:${tenant}#` : ""}${user ? `/user:${user}#` : ""}${context ? `/context:${context}#` : ""}${identifier ? `/identifier:${identifier}#` : ""}`;
}

module.exports = SocketIOServer;
