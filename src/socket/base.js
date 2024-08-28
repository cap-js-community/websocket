/* eslint-disable no-unused-vars */
"use strict";

const cds = require("@sap/cds");
const cookie = require("cookie");
const crypto = require("crypto");
const path = require("path");

/**
 * Base class for a websocket server
 */
class SocketServer {
  /**
   * Constructor for websocket server
   * @param {Object} server HTTP server from express app
   * @param {String} path Protocol path, e.g. '/ws'
   * @param {Object} config Websocket server configuration
   */
  constructor(server, path, config) {
    this.id = crypto.randomUUID();
    this.server = server;
    this.path = path;
    this.config = config;
    this.adapter = null;
    this.adapterActive = false;
    cds.ws = null;
  }

  /**
   * Setup websocket server with async operations
   * @returns {Promise<void>} Promise when setup is completed
   */
  async setup() {}

  /**
   * Connect a service to websocket server
   * @param {String} service service definition
   * @param {String} path service path, e.g. "/path"
   * @param {Function} connected Callback function to be called on every websocket connection passing socket facade (i.e. ws.on("connection", connected))
   */
  service(service, path, connected) {
    const facade = {
      /**
       * Service definition
       * @returns {Object}
       */
      service,
      /**
       * Service path
       * @returns {String}
       */
      path,
      /**
       * Server Socket
       * @returns {Object}
       */
      socket: null,
      /**
       * Current CDS context object for the websocket server socket
       * @returns {Object}
       */
      get context() {
        return {
          id: null,
          user: null,
          tenant: null,
          http: { req: null, res: null },
          ws: { service: facade, socket: null },
        };
      },
      /**
       * Register websocket event
       * @param {String} event Event
       * @param {Function} callback Callback
       */
      on: (event, callback) => {},
      /**
       * Emit websocket event with data
       * @param {String} event Event
       * @param {Object} data Data
       * @returns {Promise<void>} Promise when emitting completed
       */
      emit: async (event, data) => {
        return Promise.resolve();
      },
      /**
       * Broadcast websocket event to all sockets except to sender with options
       * @param {String} event Event
       * @param {Object} data Data
       * @param {Object} [user] Users to be included/excluded, undefined: no restriction
       * @param {[String]} [user.include] Users to be included, undefined: no restriction
       * @param {[String]} [user.exclude] Users to be excluded, undefined: no restriction
       * @param {[String]} [contexts] Array of contexts to restrict, undefined: no restriction
       * @param {Object} [identifier] Unique consumer-provided socket client identifiers to be included/excluded, undefined: no restriction
       * @param {[String]} [identifier.include] Unique consumer-provided socket client identifiers to be included, undefined: no restriction
       * @param {[String]} [identifier.exclude] Unique consumer-provided socket client identifiers to be excluded, undefined: no restriction
       * @returns {Promise<void>} Promise when broadcasting completed
       */
      broadcast: async (event, data, user, contexts, identifier) => {
        return Promise.resolve();
      },
      /**
       * Broadcast websocket event to all sockets with options
       * @param {String} event Event
       * @param {Object} data Data
       * @param {Object} [user] Users to be included/excluded, undefined: no restriction
       * @param {[String]} [user.include] Users to be included, undefined: no restriction
       * @param {[String]} [user.exclude] Users to be excluded, undefined: no restriction
       * @param {[String]} [contexts] Array of contexts to restrict, undefined: no restriction
       * @param {Object} [identifier] Unique consumer-provided socket client identifiers to be included/excluded, undefined: no restriction
       * @param {[String]} [identifier.include] Unique consumer-provided socket client identifiers to be included, undefined: no restriction
       * @param {[String]} [identifier.exclude] Unique consumer-provided socket client identifiers to be excluded, undefined: no restriction
       * @returns {Promise<void>} Promise when broadcasting completed
       */
      broadcastAll: async (event, data, user, contexts, identifier) => {
        return Promise.resolve();
      },
      /**
       * Enter a context
       * @param {String} context Context
       * @returns {Promise<void>} Promise when entering context completed
       */
      enter: async (context) => {
        return Promise.resolve();
      },
      /**
       * Exit a context
       * @param {String} context Context
       * @returns {Promise<void>} Promise when exiting context completed
       */
      exit: async (context) => {
        return Promise.resolve();
      },
      /**
       * Disconnect server socket
       */
      disconnect() {},
      /**
       * Register callback function called on disconnect of server socket
       * @param {Function} callback Callback function
       */
      onDisconnect: (callback) => {},
    };
    connected && connected(facade);
  }

  /**
   * Broadcast event to all websocket clients for a service with options (independent of a socket connection)
   * @param {String} service Service definition
   * @param {String} [path] Service path, e.g. "/path" (relative to websocket server path), undefined: default service path
   * @param {String} event Event name or event message JSON content (no additional parameters provided (incl. 'data', except 'local'))
   * @param {Object} [data] Data object
   * @param {String} [tenant] Tenant for isolation
   * @param {Object} [user] Users to be included/excluded, undefined: no restriction
   * @param {[String]} [user.include] Users to be included, undefined: no restriction
   * @param {[String]} [user.exclude] Users to be excluded, undefined: no restriction
   * @param {[String]} [contexts] Array of contexts to restrict, undefined: no restriction
   * @param {Object} [identifier] Unique consumer-provided socket client identifiers to be included/excluded, undefined: no restriction
   * @param {[String]} [identifier.include] Unique consumer-provided socket client identifiers to be included, undefined: no restriction
   * @param {[String]} [identifier.exclude] Unique consumer-provided socket client identifiers to be excluded, undefined: no restriction
   * @param {Object} [socket] Broadcast client socket to be excluded, undefined: no exclusion
   * @param {boolean} [local] Broadcast only locally (i.e. not via adapter), default: falsy
   * @returns {Promise<void>} Promise when broadcasting completed
   */
  async broadcast({ service, path, event, data, tenant, user, contexts, identifier, socket, remote }) {}

  /**
   * Handle HTTP request response
   * @param {Object} socket Server socket
   * @param {Number} statusCode Response status code
   * @param {String} body Response body
   */
  respond(socket, statusCode, body) {
    if (statusCode >= 400) {
      this.close(socket, 4000 + statusCode, body);
    }
  }

  /**
   * Close socket and disconnect client. If no socket is passed the server is closed
   * @param {Object} socket Socket to be disconnected
   * @param {Number} code Reason code for close
   * @param {String} reason Reason text for close
   */
  close(socket, code, reason) {}

  /**
   * Enforce that socket request is authenticated
   * @param {Object} socket Server socket
   */
  enforceAuth(socket) {
    if (socket.request.isAuthenticated && !socket.request.isAuthenticated()) {
      throw new Error("403 - Forbidden");
    }
  }

  /**
   * Middlewares executed before
   * @returns {[function]} Returns a list of middleware functions
   */
  beforeMiddlewares() {
    return [this.mockResponse.bind(this), this.applyAuthCookie.bind(this)];
  }

  /**
   * Middlewares executed after
   * @returns {[function]} Returns a list of middleware functions
   */
  afterMiddlewares() {
    return [this.removeWrapNext.bind(this)];
  }

  /**
   * Get all middlewares
   * @returns {[function]} Returns a list of middleware functions
   */
  middlewares() {
    function wrapMiddleware(middleware) {
      return (socket, next) => {
        let nextCalled = false;
        const wrapNext = (err) => {
          delete socket.request._next;
          if (!nextCalled) {
            nextCalled = true;
            next(err);
          }
        };
        socket.request._next = wrapNext;
        return middleware(socket.request, socket.request.res, wrapNext);
      };
    }

    const middlewares = this.beforeMiddlewares() || [];
    for (const middleware of cds.middlewares?.before ?? []) {
      if (Array.isArray(middleware)) {
        for (const entry of middleware) {
          middlewares.push(wrapMiddleware(entry));
        }
      } else {
        middlewares.push(wrapMiddleware(middleware));
      }
    }
    return middlewares.concat(this.afterMiddlewares());
  }

  /**
   * Remove the next wrapper from the request object
   * @param {Object }socket Socket
   * @param {Function} next Next function
   */
  removeWrapNext(socket, next) {
    const req = socket.request;
    let error;
    try {
      delete req._next;
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  }

  /**
   * Mock the HTTP response object and make available at req.res
   * @param {Object} socket Server socket
   * @param {Function} next Call next
   */
  mockResponse(socket, next) {
    const req = socket.request;
    let error;
    try {
      // Mock response (not available in websocket, CDS middlewares need it)
      const res = req.res ?? {};
      res.headers ??= {};
      res.set ??= (name, value) => {
        res.headers[name] = value;
        if (name.toLowerCase() === "x-correlation-id") {
          req.correlationId = value;
        }
        return res;
      };
      res.setHeader ??= (name, value) => {
        return res.set(name, value);
      };
      res.status ??= (statusCode) => {
        res.statusCode = statusCode;
        return res;
      };
      res.writeHead ??= (statusCode, statusMessage, headers) => {
        res.status(statusCode);
        res.headers = { ...res.headers, ...headers };
        return res;
      };
      res.json ??= (json) => {
        res.send(JSON.stringify(json));
        return res;
      };
      res.sendStatus ??= (statusCode) => {
        res.status(statusCode);
        res.send(res.body || "" + statusCode);
        return res;
      };
      res.send ??= (text) => {
        res.body = text;
        this.respond(socket, res.statusCode, text);
        return res;
      };
      res.end ??= () => {
        return res;
      };
      res.on ??= () => {
        return res;
      };
      req.res = res;
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  }

  /**
   * Apply the authorization cookie to authorization header for local authorization testing in mocked auth scenario
   * @param {Object} socket Server socket
   * @param {Function} next Call next
   */
  applyAuthCookie(socket, next) {
    const req = socket.request;
    let error;
    try {
      // Apply cookie to authorization header
      if (["mocked"].includes(cds.env.requires?.auth?.kind) && !req.headers.authorization && req.headers.cookie) {
        const cookies = cookie.parse(req.headers.cookie);
        if (cookies["X-Authorization"] || cookies["Authorization"]) {
          req.headers.authorization = cookies["X-Authorization"] || cookies["Authorization"];
        }
      }
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  }

  /**
   * Require implementation
   * @param {String} impl Implementation name or path
   * @param {String} context Implementation context
   * @returns {*} Implementation module
   */
  static require(impl, context = "") {
    if (impl.startsWith("./") || impl.startsWith("../")) {
      return require(path.join(process.cwd(), impl));
    } else if (context) {
      try {
        return require(path.join("..", context, impl));
      } catch {
        // ignore
      }
    }
    return require(impl);
  }

  /**
   * Return format instance for service
   * @param {Object }service Service definition
   * @param {String} origin Origin format, e.g. 'json'
   * @returns {*}
   */
  format(service, origin) {
    const format = service.definition["@websocket.format"] || service.definition["@ws.format"] || "json";
    if (format === origin) {
      return new (SocketServer.require("identity", "format"))(service);
    }
    return new (SocketServer.require(format, "format"))(service);
  }

  /**
   * Default path for websocket service
   */
  defaultPath(service) {
    if (service.path.startsWith(this.path)) {
      return service.path.substring(this.path.length);
    }
    return service.path;
  }
}

module.exports = SocketServer;
