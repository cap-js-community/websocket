"use strict";

const cds = require("@sap/cds");
const cookie = require("cookie");
const crypto = require("crypto");

/**
 * Base class for a websocket server
 */
class SocketServer {
  /**
   * Constructor for websocket server
   * @param {Object} server HTTP server from express app
   * @param {string} path Protocol path, e.g. '/ws'
   */
  constructor(server, path) {
    this.id = crypto.randomUUID();
    this.server = server;
    this.path = path;
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
   * @param {function<object>} connected Callback function to be called on every websocket connection passing socket functions (i.e. ws.on("connection", connected)) passing the facade
   */
  service(service, connected) {
    const facade = {
      service,
      socket: null,
      setup: () => {},
      context: () => {
        return {
          id: null,
          user: null,
          tenant: null,
          http: { req: null, res: null },
          ws: { service: facade, socket: null },
        };
      },
      on: (event, callback) => {},
      emit: async (event, data, contexts) => {
        return Promise.resolve();
      },
      broadcast: async (event, data, contexts) => {
        return Promise.resolve();
      },
      broadcastAll: async (event, data, contexts) => {
        return Promise.resolve();
      },
      enter: async (context) => {
        return Promise.resolve();
      },
      exit: async (context) => {
        return Promise.resolve();
      },
      disconnect() {},
      onDisconnect: (callback) => {},
    };
    connected && connected(facade);
  }

  /**
   * Broadcast to all websocket clients
   * @param {string} service service path, e.g. "/chat"
   * @param {string} event Event name or message content (if data is not provided)
   * @param {Object} data Data object
   * @param {string} tenant Tenant
   * @param {[string]} contexts Array of contexts
   * @param {Object} socket Broadcast client to be excluded
   * @param {boolean} remote Broadcast also remote (e.g. via redis)
   * @returns {Promise<void>} Promise when broadcasting completed
   */
  async broadcast({ service, event, data, tenant, contexts, socket, remote }) {}

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
}

module.exports = SocketServer;
