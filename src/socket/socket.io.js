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

  service(service, path, connected) {
    const io = this.applyMiddlewares(this.io.of(path));
    const format = this.format(service, undefined, "json");
    io.on("connection", async (socket) => {
      try {
        this.enforceAuth(socket);
        socket.context = { ...cds.context };
        socket.join(room({ tenant: socket.context.tenant }));
        if (socket.context.user?.id) {
          socket.join(room({ tenant: socket.context.tenant, user: socket.context.user?.id }));
        }
        if (socket.request._query?.id) {
          socket.join(room({ tenant: socket.context.tenant, identifier: socket.request._query?.id }));
          if (socket.context.user?.id) {
            socket.join(
              room({
                tenant: socket.context.tenant,
                user: socket.context.user?.id,
                identifier: socket.request._query?.id,
              }),
            );
          }
        }
        DEBUG?.("Connected", socket.id);
        socket.on("disconnect", () => {
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
            socket.on(event, async (data, fn) => {
              await callback(format.parse(data).data, fn);
            });
          },
          emit: async (event, data) => {
            await socket.emit(event, format.compose(event, data));
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
            await socket.join(room({ tenant: socket.context.tenant, context }));
            if (socket.context.user?.id) {
              await socket.join(room({ tenant: socket.context.tenant, user: socket.context.user.id, context }));
            }
            if (socket.request._query?.id) {
              await socket.join(
                room({
                  tenant: socket.context.tenant,
                  context,
                  identifier: socket.request._query?.id,
                }),
              );
              if (socket.context.user?.id) {
                await socket.join(
                  room({
                    tenant: socket.context.tenant,
                    user: socket.context.user?.id,
                    context,
                    identifier: socket.request._query?.id,
                  }),
                );
              }
            }
          },
          exit: async (context) => {
            await socket.leave(room({ tenant: socket.context.tenant, context }));
            if (socket.context.user?.id) {
              await socket.leave(room({ tenant: socket.context.tenant, user: socket.context.user.id, context }));
            }
            if (socket.request._query?.id) {
              await socket.leave(
                room({
                  tenant: socket.context.tenant,
                  context,
                  identifier: socket.request._query?.id,
                }),
              );
              if (socket.context.user?.id) {
                await socket.leave(
                  room({
                    tenant: socket.context.tenant,
                    user: socket.context.user.id,
                    context,
                    identifier: socket.request._query?.id,
                  }),
                );
              }
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
        connected && connected(socket.facade);
      } catch (err) {
        LOG?.error(err);
      }
    });
  }

  async broadcast({ service, path, event, data, tenant, user, context, identifier, headers, socket }) {
    path = path || this.defaultPath(service);
    tenant = tenant || socket?.context.tenant;
    let to = socket?.broadcast || this.io.of(path);
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
  }

  respond(socket, statusCode, body) {
    super.respond(socket, statusCode, body);
    if (statusCode >= 400 && socket.request?._next) {
      socket.request?._next(new Error(body));
    }
  }

  close(socket) {
    if (socket) {
      socket.disconnect(true);
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
