"use strict";

const cds = require("@sap/cds");
const { Server } = require("socket.io");

const SocketServer = require("./base");
const redis = require("../redis");

const LOG = cds.log("websocket/socket.io");
const DEBUG = cds.debug("websocket");

class SocketIOServer extends SocketServer {
  constructor(server, path, config) {
    super(server, path, config);
    this.io = new Server(server, config?.options);
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

  service(service, path, connected) {
    const io = this.applyMiddlewares(this.io.of(this.servicePath(path)));
    const format = this.format(service, undefined, "json");
    io.on("connection", async (socket) => {
      try {
        this.onInit(socket, socket.request);
        socket.context = this.initContext();
        socket.request.id ??= socket.request._query?.id;
        socket.join(room({ tenant: socket.context.tenant }));
        if (socket.context.user?.id) {
          socket.join(room({ tenant: socket.context.tenant, user: socket.context.user?.id }));
        }
        if (socket.request.id) {
          socket.join(room({ tenant: socket.context.tenant, identifier: socket.request.id }));
          if (socket.context.user?.id) {
            socket.join(
              room({
                tenant: socket.context.tenant,
                user: socket.context.user?.id,
                identifier: socket.request.id,
              }),
            );
          }
        }
        DEBUG?.("Connected", socket.id);
        socket.on("disconnect", () => {
          this.onDisconnect(socket);
          DEBUG?.("Disconnected", socket.id);
        });
        socket.facade = {
          service,
          path,
          socket,
          get context() {
            return socket.context;
          },
          on: (event, callback) => {
            socket.on(event, async (data, headers, fn) => {
              try {
                if (typeof headers === "function") {
                  fn = headers;
                  headers = undefined;
                }
                await callback(format.parse(data).data, headers, fn);
              } catch (err) {
                LOG?.error(err);
                throw err;
              }
            });
          },
          emit: async (event, data, headers) => {
            try {
              await socket.emit(event, format.compose(event, data, headers));
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
              tenant: socket.context.tenant,
              user,
              context,
              identifier,
              headers,
              socket,
            });
          },
          broadcastAll: async (event, data, user, context, identifier, headers) => {
            await this.broadcast({
              service,
              path,
              event,
              data,
              tenant: socket.context.tenant,
              user,
              context,
              identifier,
              headers,
              socket: null,
            });
          },
          enter: async (context) => {
            socket.contexts.add(context);
            await socket.join(room({ tenant: socket.context.tenant, context }));
            if (socket.context.user?.id) {
              await socket.join(room({ tenant: socket.context.tenant, user: socket.context.user.id, context }));
            }
            if (socket.request.id) {
              await socket.join(
                room({
                  tenant: socket.context.tenant,
                  context,
                  identifier: socket.request.id,
                }),
              );
              if (socket.context.user?.id) {
                await socket.join(
                  room({
                    tenant: socket.context.tenant,
                    user: socket.context.user?.id,
                    context,
                    identifier: socket.request.id,
                  }),
                );
              }
            }
          },
          exit: async (context) => {
            socket.contexts.delete(context);
            await socket.leave(room({ tenant: socket.context.tenant, context }));
            if (socket.context.user?.id) {
              await socket.leave(room({ tenant: socket.context.tenant, user: socket.context.user.id, context }));
            }
            if (socket.request.id) {
              await socket.leave(
                room({
                  tenant: socket.context.tenant,
                  context,
                  identifier: socket.request.id,
                }),
              );
              if (socket.context.user?.id) {
                await socket.leave(
                  room({
                    tenant: socket.context.tenant,
                    user: socket.context.user.id,
                    context,
                    identifier: socket.request.id,
                  }),
                );
              }
            }
          },
          reset: async () => {
            for (const context of socket.contexts) {
              await socket.facade.exit(context);
            }
          },
          disconnect() {
            socket.disconnect();
          },
          onDisconnect: (callback) => {
            socket.on("disconnect", callback);
          },
        };
        socket.context.ws = { service: socket.facade, socket: socket, io };
        this.onConnect(socket, socket.request);
        connected && connected(socket.facade);
      } catch (err) {
        LOG?.error(err);
      }
    });
  }

  async broadcast({ service, path, event, data, tenant, user, context, identifier, headers, socket }) {
    try {
      path = path || this.defaultPath(service);
      tenant = tenant || socket?.context.tenant;
      let to = socket?.broadcast || this.io.of(this.servicePath(path));
      if (context?.include?.length && identifier?.include?.length) {
        for (const contextInclude of context.include) {
          for (const identifierInclude of identifier.include) {
            if (user?.include?.length) {
              for (const userInclude of user.include) {
                to = to.to(room({ tenant, user: userInclude, context: contextInclude, identifier: identifierInclude }));
              }
            } else {
              to = to.to(room({ tenant, context: contextInclude, identifier: identifierInclude }));
            }
          }
        }
      } else if (context?.include?.length) {
        for (const contextInclude of context.include) {
          if (user?.include?.length) {
            for (const userInclude of user.include) {
              to = to.to(room({ tenant, user: userInclude, context: contextInclude }));
            }
          } else {
            to = to.to(room({ tenant, context: contextInclude }));
          }
        }
      } else if (identifier?.include?.length) {
        for (const identifierInclude of identifier.include) {
          if (user?.include?.length) {
            for (const userInclude of user.include) {
              to = to.to(room({ tenant, user: userInclude, identifier: identifierInclude }));
            }
          } else {
            to = to.to(room({ tenant, identifier: identifierInclude }));
          }
        }
      } else {
        if (user?.include?.length) {
          for (const userInclude of user.include) {
            to = to.to(room({ tenant, user: userInclude }));
          }
        } else {
          to = to.to(room({ tenant }));
        }
      }
      if (user?.exclude?.length) {
        for (const userExclude of user.exclude) {
          to = to.except(room({ tenant, user: userExclude }));
        }
      }
      if (context?.exclude?.length) {
        for (const contextExclude of context.exclude) {
          to = to.except(room({ tenant, context: contextExclude }));
        }
      }
      if (identifier?.exclude?.length) {
        for (const identifierExclude of identifier.exclude) {
          to = to.except(room({ tenant, identifier: identifierExclude }));
        }
      }
      const format = this.format(service, event, "json");
      to.emit(event, format.compose(event, data, headers));
    } catch (err) {
      LOG?.error(err);
      throw err;
    }
  }

  close(socket) {
    if (socket) {
      socket.disconnect(true);
    } else {
      this.io.close();
    }
  }

  onInit(socket, request) {
    super.onInit(socket, request);
    socket.contexts = new Set(); // Set<context>
  }

  onConnect() {}

  onDisconnect(socket) {
    socket.contexts.clear();
  }

  async applyAdapter() {
    try {
      const config = { ...this.config?.adapter };
      if (config.impl) {
        let client;
        const options = { ...config?.options };
        const adapterFactory = SocketServer.require(config.impl, "adapter");
        if (adapterFactory) {
          switch (config.impl) {
            case "@socket.io/redis-adapter":
              if (await redis.connectionCheck(config)) {
                client = await Promise.all([
                  redis.createPrimaryClientAndConnect(config),
                  redis.createSecondaryClientAndConnect(config),
                ]);
                if (client?.length === 2) {
                  this.adapter = adapterFactory.createAdapter(...client, options);
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
            this.adapterImpl = config.impl;
            this.adapterActive = true;
          }
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
