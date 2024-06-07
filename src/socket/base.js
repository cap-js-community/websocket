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
   * @param {string} path Protocol path, e.g. '/ws'
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
   * Connect a service to websocket
   * @param {string} service service path, e.g. "/chat"
   * @param {function} connected Callback function to be called on every websocket connection passing socket facade (i.e. ws.on("connection", connected))
   */
  service(service, connected) {
    const facade = {
      /**
       * Service name/path
       * @returns {String}
       */
      service,
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
       * @param {function} callback Callback
       */
      on: (event, callback) => {},
      /**
       * Emit websocket event with data
       * @param {String} event Event
       * @param {Object} data Data
       * @returns {Promise<void>}
       */
      emit: async (event, data) => {
        return Promise.resolve();
      },
      /**
       * Broadcast websocket event (except to sender) by excluding an user (optional) or restricting to contexts (optional)
       * @param {String} event Event
       * @param {Object} data Data
       * @param {String} [user] User to be excluding
       * @param {String[]} [contexts] Contexts for restrictions
       * @returns {Promise<void>}
       */
      broadcast: async (event, data, user, contexts) => {
        return Promise.resolve();
      },
      /**
       * Broadcast websocket event (including to sender) by excluding an user (optional) or restricting to contexts (optional)
       * @param {String} event Event
       * @param {Object} data Data
       * @param {String} [user] User to be excluding
       * @param {String[]} [contexts] Contexts for restrictions
       * @returns {Promise<void>}
       */
      broadcastAll: async (event, data, user, contexts) => {
        return Promise.resolve();
      },
      /**
       * Enter a context
       * @param {String} context Context
       * @returns {Promise<void>}
       */
      enter: async (context) => {
        return Promise.resolve();
      },
      /**
       * Exit a context
       * @param {String} context Context
       * @returns {Promise<void>}
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
       * @param {function} callback Callback function
       */
      onDisconnect: (callback) => {},
    };
    connected && connected(facade);
  }

  /**
   * Broadcast to all websocket clients
   * @param {string} service service path, e.g. "/chat"
   * @param {string} event Event name or message content (if data is not provided)
   * @param {Object} data Data object
   * @param {string} tenant Tenant for isolation
   * @param {string} user User to be excluded, undefined: no exclusion
   * @param {[string]} contexts Array of contexts to restrict, undefined: no restriction
   * @param {string} identifier Unique consumer-provided socket client identifier, undefined: no restriction
   * @param {Object} socket Broadcast client to be excluded, undefined: no exclusion
   * @param {boolean} remote Broadcast also remote (e.g. via redis), default: falsy
   * @returns {Promise<void>} Promise when broadcasting completed
   */
  async broadcast({ service, event, data, tenant, user, contexts, identifier, socket, remote }) {}

  /**
   * Handle HTTP request response
   * @param {object} socket Server socket
   * @param {Number} statusCode Response status code
   * @param {string} body Response body
   */
  respond(socket, statusCode, body) {
    if (statusCode >= 400) {
      this.close(socket, 4000 + statusCode, body);
    }
  }

  /**
   * Close socket and disconnect client. If no socket is passed the server is closed
   * @param {object} socket Socket to be disconnected
   * @param {Number} code Reason code for close
   * @param {string} reason Reason text for close
   */
  close(socket, code, reason) {}

  /**
   * Enforce that socket request is authenticated
   * @param {object} socket Server socket
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
    return [];
  }

  /**
   * Get all middlewares
   * @returns {[function]} Returns a list of middleware functions
   */
  middlewares() {
    function wrapMiddleware(middleware) {
      return (socket, next) => {
        return middleware(socket.request, socket.request.res, next);
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
   * Mock the HTTP response object and make available at req.res
   * @param {Object} socket Server socket
   * @param {function} next Call next
   */
  mockResponse(socket, next) {
    const req = socket.request;
    let error = null;
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
        this.respond(socket, res.statusCode, JSON.stringify(json));
        res.body = json;
        return res;
      };
      res.send ??= (text) => {
        this.respond(socket, res.statusCode, text);
        res.body = text;
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
   * @param {function} next Call next
   */
  applyAuthCookie(socket, next) {
    const req = socket.request;
    let error = null;
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
   * @param {string} impl Implementation name or path
   * @param {string} context Implementation context
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
}

module.exports = SocketServer;
