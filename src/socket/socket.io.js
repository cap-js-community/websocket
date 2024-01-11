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
      ...cds.env.requires.websocket?.options,
    });
    this.io.engine.on("connection_error", (err) => {
      LOG?.error(err);
    });
    cds.ws = this.io;
    cds.io = this.io;
  }

  async setup() {
    await this._applyAdapter();
  }

  service(service, connected) {
    const io = this._applyMiddleware(this.io.of(service));
    io.on("connection", async (socket) => {
      try {
        DEBUG?.("Connected", socket.id);
        socket.on("disconnect", () => {
          DEBUG?.("Disconnected", socket.id);
        });
        const serviceSocket = {
          service,
          socket,
          setup: () => {
            this._enforceAuth(socket);
          },
          context: () => {
            return {
              id: socket.request.correlationId,
              user: socket.request.user,
              tenant: socket.request.tenant,
              http: { req: socket.request, res: socket.request.res },
              socket,
            };
          },
          on: (event, callback) => {
            socket.on(event, callback);
          },
          emit: (event, data) => {
            socket.emit(event, data);
          },
          broadcast: (event, data) => {
            socket.broadcast.emit(event, data);
          },
          disconnect() {
            socket.disconnect();
          },
        };
        connected && connected(serviceSocket);
      } catch (err) {
        LOG?.error(err);
      }
    });
  }

  async broadcast(service, event, data, socket, multiple) {
    if (socket) {
      socket.broadcast.emit(event, data);
    } else {
      const io = this.io.of(service);
      io.emit(event, data);
    }
  }

  async _applyAdapter() {
    try {
      const adapterImpl = cds.env.requires?.websocket?.adapter?.impl;
      if (adapterImpl) {
        let options = {};
        if (cds.env.requires.websocket?.adapter?.options) {
          options = { ...options, ...cds.env.requires.websocket?.adapter?.options };
        }
        let client;
        let subClient;
        let adapter;
        const adapterFactory = require(adapterImpl);
        switch (adapterImpl) {
          case "@socket.io/redis-adapter":
            client = await redis.createPrimaryClientAndConnect();
            subClient = await redis.createSecondaryClientAndConnect();
            if (client && subClient) {
              adapter = adapterFactory.createAdapter(client, subClient, options);
            }
            break;
          case "@socket.io/redis-streams-adapter":
            client = await redis.createPrimaryClientAndConnect();
            if (client) {
              adapter = adapterFactory.createAdapter(client, options);
            }
            break;
        }
        if (adapter) {
          this.io.adapter(adapter);
        }
      }
    } catch (err) {
      LOG?.error(err);
    }
  }

  _applyMiddleware(io) {
    io.use((socket, next) => {
      SocketServer.mockResponse(socket.request);
      SocketServer.applyAuthCookie(socket.request);
      next();
    });
    for (const middleware of cds.middlewares?.before ?? []) {
      if (Array.isArray(middleware)) {
        for (const entry of middleware) {
          io.use(wrapMiddleware(entry));
        }
      } else {
        io.use(wrapMiddleware(middleware));
      }
    }
    return io;
  }

  _enforceAuth(io) {
    if (io.request.isAuthenticated && !io.request.isAuthenticated()) {
      io.disconnect();
      throw new Error("403 - Forbidden");
    }
  }
}

function wrapMiddleware(middleware) {
  return (socket, next) => {
    return middleware(socket.request, socket.request.res, next);
  };
}

module.exports = SocketIOServer;
