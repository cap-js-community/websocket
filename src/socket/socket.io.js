"use strict";

const cds = require("@sap/cds");
const { Server } = require("socket.io");

const SocketServer = require("./base");
const redis = require("../adapter/redis");

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
    applyAdapter();
  }

  service(service, connected) {
    const io = applyMiddleware(this.io.of(service));
    io.on("connection", async (socket) => {
      DEBUG?.("Connected", socket.id);
      socket.on("disconnect", () => {
        DEBUG?.("Disconnected", socket.id);
      });
      const serviceSocket = {
        socket,
        setup: () => {
          enforceAuth(socket);
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
    });
  }
}

async function applyAdapter() {
  try {
    if (cds.env.requires.websocket?.adapter === false) {
      return;
    }
    const adapterImpl = cds.env.requires?.websocket?.adapter?.impl;
    if (adapterImpl) {
      const { createAdapter } = require(adapterImpl);
      const client = await redis.createMainClientAndConnect();
      if (client) {
        let adapter;
        let subClient;
        let options = {};
        if (cds.env.requires.websocket?.adapter?.options) {
          options = { ...options, ...cds.env.requires.websocket?.adapter?.options };
        }
        switch (adapterImpl) {
          case "@socket.io/redis-adapter":
            subClient = await redis.createClientAndConnect();
            adapter = createAdapter(client, subClient, options);
            break;
          case "@socket.io/redis-streams-adapter":
            adapter = createAdapter(client, options);
            break;
        }
        if (adapter) {
          this.io.adapter(adapter);
        }
      }
    }
  } catch (err) {
    LOG?.error(err);
  }
}

function applyMiddleware(serviceIO) {
  serviceIO.use((socket, next) => {
    SocketServer.applyAuthCookie(socket.request);
    // Mock response (not available in websockets), CDS accesses it
    socket.request.res ??= {
      set: (name, value) => {
        if (name.toLowerCase() === "x-correlation-id") {
          socket.request.correlationId = value;
        }
      },
    };
    next();
  });
  for (const middleware of cds.middlewares?.before ?? []) {
    if (Array.isArray(middleware)) {
      for (const entry of middleware) {
        serviceIO.use(wrapMiddleware(entry));
      }
    } else {
      serviceIO.use(wrapMiddleware(middleware));
    }
  }
  return serviceIO;
}

function enforceAuth(io) {
  if (io.request.isAuthenticated && !io.request.isAuthenticated()) {
    io.disconnect();
    throw new Error("403 - Forbidden");
  }
}

function wrapMiddleware(middleware) {
  return (socket, next) => {
    return middleware(socket.request, socket.request.res, next);
  };
}

module.exports = SocketIOServer;
