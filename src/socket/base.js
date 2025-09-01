/* eslint-disable no-unused-vars */
"use strict";

const cds = require("@sap/cds");
const crypto = require("crypto");
const path = require("path");
const { inspect } = require("util");

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
    this.adapterImpl = null;
    this.adapterActive = false;
    cds.ws = null;
  }

  /**
   * Setup websocket server with async operations
   * @returns {Promise<void>} Promise when setup is completed
   */
  async setup() {}

  /**
   * Initialize new websocket context from CDS context
   * @returns {*} New websocket context
   */
  initContext() {
    const context = { ...cds.context };
    delete context._features;
    return context;
  }

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
       * @param {Object} headers Headers
       * @returns {Promise<void>} Promise when emitting completed
       */
      emit: async (event, data, headers) => {
        return Promise.resolve();
      },
      /**
       * Broadcast websocket event to all sockets except to sender with options
       * @param {String} event Event
       * @param {Object} data Event data
       * @param {Object} [user] Users to be included/excluded, undefined: no restriction
       * @param {[String]} [user.include] Users to be included, undefined: no restriction
       * @param {[String]} [user.exclude] Users to be excluded, undefined: no restriction
       * @param {Object} [context] Contexts to be included/excluded, undefined: no restriction
       * @param {[String]} [context.include] Contexts to be included, undefined: no restriction
       * @param {[String]} [context.exclude] Contexts to be excluded, undefined: no restriction
       * @param {Object} [identifier] Unique consumer-provided socket client identifiers to be included/excluded, undefined: no restriction
       * @param {[String]} [identifier.include] Client identifiers to be included, undefined: no restriction
       * @param {[String]} [identifier.exclude] Client identifiers to be excluded, undefined: no restriction
       * @param {Object} [headers] Event headers
       * @returns {Promise<void>} Promise when broadcasting completed
       */
      broadcast: async (event, data, user, context, identifier, headers) => {
        return Promise.resolve();
      },
      /**
       * Broadcast websocket event to all sockets with options
       * @param {String} event Event
       * @param {Object} data Event data
       * @param {Object} [user] Users to be included/excluded, undefined: no restriction
       * @param {[String]} [user.include] Users to be included, undefined: no restriction
       * @param {[String]} [user.exclude] Users to be excluded, undefined: no restriction
       * @param {Object} [context] Contexts to be included/excluded, undefined: no restriction
       * @param {[String]} [context.include] Contexts to be included, undefined: no restriction
       * @param {[String]} [context.exclude] Contexts to be excluded, undefined: no restriction
       * @param {Object} [identifier] Unique consumer-provided socket client identifiers to be included/excluded, undefined: no restriction
       * @param {[String]} [identifier.include] Client identifiers to be included, undefined: no restriction
       * @param {[String]} [identifier.exclude] Client identifiers to be excluded, undefined: no restriction
       * @param {Object} [headers] Event headers
       * @returns {Promise<void>} Promise when broadcasting completed
       */
      broadcastAll: async (event, data, user, context, identifier, headers) => {
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
       * Reset all contexts
       * @returns {Promise<void>} Promise when resetting contexts completed
       */
      reset: async () => {
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
   * @param {Object} [data] Event data
   * @param {String} [tenant] Tenant for isolation
   * @param {Object} [user] Users to be included/excluded, undefined: no restriction
   * @param {[String]} [user.include] Users to be included, undefined: no restriction
   * @param {[String]} [user.exclude] Users to be excluded, undefined: no restriction
   * @param {Object} [context] Contexts to be included/excluded, undefined: no restriction
   * @param {[String]} [context.include] Contexts to be included, undefined: no restriction
   * @param {[String]} [context.exclude] Contexts to be excluded, undefined: no restriction
   * @param {Object} [identifier] Unique consumer-provided socket client identifiers to be included/excluded, undefined: no restriction
   * @param {[String]} [identifier.include] Client identifiers to be included, undefined: no restriction
   * @param {[String]} [identifier.exclude] Client identifiers to be excluded, undefined: no restriction
   * @param {Object} [headers] Event headers
   * @param {Object} [socket] Broadcast client socket to be excluded, undefined: no exclusion
   * @param {boolean} [local] Broadcast only locally (i.e. not via adapter), default: falsy
   * @returns {Promise<void>} Promise when broadcasting completed
   */
  async broadcast({ service, path, event, data, tenant, user, context, identifier, headers, socket, local }) {}

  /**
   * Handle HTTP request response
   * @param {Object} socket Server socket
   * @param {Number} statusCode Response status code
   * @param {String} body Response body
   */
  respond(socket, statusCode, body) {
    if (statusCode >= 400) {
      const code = 4000 + statusCode;
      this.close(socket, code, body);
      if (socket.request?._next) {
        const closeError = new Error(body);
        closeError.statusCode = statusCode;
        closeError.code = code;
        socket.request?._next(closeError);
      }
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
   * Initialize the server socket
   * @param socket Server socket
   * @param request Request
   */
  onInit(socket, request) {
    socket.request ??= request;
    request.query ??= {};
  }

  /**
   * Handle connect event
   * @param socket Server socket
   */
  onConnect(socket) {}

  /**
   * Handle disconnect event
   * @param socket Server socket
   */
  onDisconnect(socket) {}

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
    return [this.enforceAuth.bind(this), this.removeWrapNext.bind(this)];
  }

  /**
   * Get all middlewares
   * @returns {[function]} Returns a list of middleware functions
   */
  middlewares() {
    const base = this;

    function wrapMiddleware(middleware) {
      return (socket, next) => {
        let nextCalled = false;
        const wrapNext = (err) => {
          delete socket.request._next;
          if (!nextCalled) {
            nextCalled = true;
            next(base.toError(err));
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
    // host property is mandatory for ias auth middleware at @sap/cds/lib/srv/middlewares/auth/ias-auth.js:71
    socket.request.host = socket.request.headers.host;
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
    req.baseUrl ??= req.url;
    req.originalUrl ??= req.url;
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
      if (
        ["mocked", "basic"].includes(cds.env.requires?.auth?.kind) &&
        !req.headers.authorization &&
        req.headers.cookie
      ) {
        const cookies = req.headers.cookie?.split(";").reduce((result, entry) => {
          let [name, ...rest] = entry.split("=");
          name = name?.trim();
          if (name) {
            const value = rest.join("=").trim();
            if (value) {
              result[name] = decodeURIComponent(value);
            }
          }
          return result;
        }, {});
        if (cookies["X-Authorization"]) {
          req.headers.authorization = cookies["X-Authorization"];
        }
      }
    } catch (err) {
      error = err;
    } finally {
      next(error);
    }
  }

  /**
   * Enforce that socket request is authenticated (no anonymous)
   * @param {Object} socket Server socket
   * @param {Function} next Call next
   */
  enforceAuth(socket, next) {
    const restrict_all = cds.env.requires?.auth?.restrict_all_services !== false;
    if (!restrict_all || cds.context?.user?._is_privileged || !cds.context?.user?._is_anonymous) {
      return next();
    }
    const req = socket.request;
    if (typeof req?.isAuthenticated === "function" && req?.isAuthenticated()) {
      return next();
    }
    const err = new Error("401");
    err.statusCode = 401;
    err.code = 4000 + err.statusCode;
    return next(err);
  }

  /**
   * Require implementation
   * @param {String} impl Implementation name or path
   * @param {String} context Implementation context
   * @returns {*} Implementation module
   */
  static require(impl, context = "") {
    if (impl.startsWith("./") || impl.startsWith("../") || impl.startsWith("/")) {
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
   * Return service path including protocol prefix or absolute service path (if already absolute)
   * @param {String} path path
   * @returns {String} Service path
   */
  servicePath(path) {
    return path.startsWith("/") ? path : `${this.path}/${path}`;
  }

  /**
   * Return format instance for service
   * @param {Object} service Service definition
   * @param {String} [event] Event name
   * @param {String} [origin] Origin format, e.g. 'json'
   * @returns {*}
   */
  format(service, event, origin) {
    let format = undefined;
    if (event) {
      const eventDefinition = service.definition.events?.[event];
      if (eventDefinition) {
        format = eventDefinition["@websocket.format"] || eventDefinition["@ws.format"];
      }
    }
    if (!format) {
      format = service.definition["@websocket.format"] || service.definition["@ws.format"] || "json";
    }
    if (format === origin) {
      return new (SocketServer.require("identity", "format"))(service, origin);
    }
    return new (SocketServer.require(format, "format"))(service, origin);
  }

  /**
   * Default path for websocket service
   * @param {String} service Service path
   */
  defaultPath(service) {
    if (service.path.startsWith(this.path)) {
      return service.path.substring(this.path.length);
    }
    return service.path;
  }

  /**
   * Gets key value from Map and initializes key with init value if not found
   * @param {Map} map Map
   * @param {String} key Key to get
   * @param {*)} init Initial value
   * @returns {*} Value
   */
  getFromMap(map, key, init) {
    let entry = map.get(key);
    if (entry === undefined) {
      entry = init;
      map.set(key, entry);
    }
    return entry;
  }

  /**
   * Add value to a Set for key of Map
   * @param {Map<String,Set>} map Map
   * @param {String} key Key to get
   * @param {*)} value Add value
   */
  addToSetOfMap(map, key, value) {
    return this.getFromMap(map, key, new Set()).add(value);
  }

  /**
   * Delete value from a Set for key of Map
   * @param {Map<String,Set>} map Map
   * @param {String} key Key to get
   * @param {*)} value Delete value
   */
  deleteFromSetOfMap(map, key, value) {
    let set = map.get(key);
    if (set !== undefined) {
      set.delete(value);
      if (set.size === 0) {
        map.delete(key);
      }
    }
  }

  /**
   * Collect values from Map based on keys
   * @param {Map<String, Array<Set>>} map Map
   * @param {Array} keys Keys to include values from
   */
  collectFromMap(map, keys) {
    const result = new Set();
    if (!map || !keys?.length) {
      return result;
    }
    for (const key of keys) {
      const set = map.get(key);
      if (set !== undefined) {
        for (const entry of set) {
          result.add(entry);
        }
      }
    }
    return result;
  }

  /**
   * Collect values from Set based on check
   * @param {Set} set Set
   * @param {function} check Check to be performed for entry
   */
  collectFromSet(set, check) {
    const result = new Set();
    if (!set) {
      return result;
    }
    for (const entry of set) {
      if (check(entry)) {
        result.add(entry);
      }
    }
    return result;
  }

  /**
   * Keep entries from set
   * @param set Set to be filtered
   * @param keepSet Entries from set to keep, others are removed
   */
  keepEntriesFromSet(set, keepSet) {
    for (const entry of set) {
      if (!keepSet.has(entry)) {
        set.delete(entry);
      }
    }
  }

  /**
   * Check if error is an instance of Error
   * @param err Error
   * @returns {boolean} True, if error is an instance of Error
   */
  isError(err) {
    try {
      return err instanceof Error || Object.prototype.toString.call(err) === "[object Error]";
    } catch {
      return false;
    }
  }

  /**
   * Convert error to instance of Error
   * @param err Error
   * @returns {Error} Error instance
   */
  toError(err) {
    if ([undefined, null].includes(err)) {
      return err;
    }
    return this.isError(err) ? err : new Error(inspect(err));
  }
}

module.exports = SocketServer;
