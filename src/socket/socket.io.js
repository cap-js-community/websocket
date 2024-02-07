"use strict";

const cds = require("@sap/cds");
const { Server } = require("socket.io");

const SocketServer = require("./base");
const redis = require("../redis");

const LOG = cds.log("websocket/socket.io");
const DEBUG = cds.debug("websocket");

class SocketIOServer extends SocketServer {
  constructor(server, path) {
    super(server, path);
    this.io = new Server(server, {
      path,
      ...cds.env.websocket?.options,
    });
    this.io.engine.on("connection_error", (err) => {
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
        socket.tenant = socket.request.tenant;
        socket.join(room(socket.tenant));
        DEBUG?.("Connected", socket.id);
        socket.on("disconnect", () => {
          DEBUG?.("Disconnected", socket.id);
        });
        const facade = {
          service,
          socket,
          setup: () => {
            this.enforceAuth(socket);
          },
          context: () => {
            return {
              id: socket.request.correlationId,
              user: socket.request.user,
              tenant: socket.request.tenant,
              http: { req: socket.request, res: socket.request.res },
              ws: { service: facade, socket, io },
            };
          },
          on: (event, callback) => {
            socket.on(event, callback);
          },
          emit: async (event, data, contexts) => {
            let to = socket;
            if (contexts) {
              for (const context of contexts || []) {
                to = to.to(room(socket.tenant, context));
              }
            } else {
              to.to(room(socket.tenant));
            }
            await to.emit(event, data);
          },
          broadcast: async (event, data, contexts) => {
            await this.broadcast({ service, event, data, tenant: socket.tenant, contexts, socket, remote: true });
          },
          broadcastAll: async (event, data, contexts) => {
            await this.broadcast({ service, event, data, tenant: socket.tenant, contexts, socket: null, remote: true });
          },
          enter: async (context) => {
            await socket.join(room(socket.tenant, context));
          },
          exit: async (context) => {
            await socket.leave(room(socket.tenant, context));
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

  async broadcast({ service, event, data, tenant, contexts, socket, remote }) {
    let to = socket?.broadcast || this.io.of(service);
    if (contexts) {
      for (const context of contexts || []) {
        to = to.to(room(tenant, context));
      }
    } else {
      to = to.to(room(tenant));
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
      const adapterImpl = cds.env.websocket?.adapter?.impl;
      if (adapterImpl) {
        let options = {};
        if (cds.env.websocket?.adapter?.options) {
          options = { ...options, ...cds.env.websocket?.adapter?.options };
        }
        let client;
        let subClient;
        const adapterFactory = SocketServer.require(adapterImpl);
        switch (adapterImpl) {
          case "@socket.io/redis-adapter":
            client = await redis.createPrimaryClientAndConnect();
            if (client) {
              subClient = await redis.createSecondaryClientAndConnect();
              if (subClient) {
                this.adapter = adapterFactory.createAdapter(client, subClient, options);
              }
            }
            break;
          case "@socket.io/redis-streams-adapter":
            client = await redis.createPrimaryClientAndConnect();
            if (client) {
              this.adapter = adapterFactory.createAdapter(client, options);
            }
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

  enforceAuth(socket) {
    if (socket.request.isAuthenticated && !socket.request.isAuthenticated()) {
      throw new Error("403 - Forbidden");
    }
  }
}

function room(tenant, context = "") {
  return `/tenant:${tenant}#/context:${context}#`;
}

module.exports = SocketIOServer;
