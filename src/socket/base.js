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
   * @param server HTTP server from express app
   * @param path Protocol path, e.g. '/ws'
   */
  constructor(server, path) {
    this.id = crypto.randomUUID();
    this.server = server;
    this.path = path;
    cds.ws = null;
  }

  /**
   * Setup websocket server with async operations
   * @returns {Promise<void>} Promise when setup is completed
   */
  async setup() {}

  /**
   * Connect a service to websocket
   * @param service service path, e.g. "/chat"
   * @param connected Callback function to be called on every websocket connection passing socket functions (i.e. ws.on("connection", connected))
   */
  service(service, connected) {
    connected &&
      connected({
        service,
        socket: null,
        setup: () => {},
        context: () => {},
        on: (event, callback) => {},
        emit: (event, data) => {},
        broadcast: (event, data) => {},
        disconnect() {},
      });
  }

  /**
   * Broadcast to all websocket clients
   * @param service service path, e.g. "/chat"
   * @param event Event name
   * @param data Data object
   * @param socket Broadcast client to be excluded
   * @param multiple Broadcast across multiple websocket servers
   * @returns {Promise<void>} Promise when broadcasting completed
   */
  async broadcast(service, event, data, socket, multiple) {}

  /**
   * Mock the HTTP response object and make available at request.res
   * @param request HTTP request
   */
  static mockResponse(request) {
    // Mock response (not available in websocket, CDS middlewares need it)
    const res = request.res ?? {};
    res.headers ??= {};
    res.set ??= (name, value) => {
      res.headers[name] = value;
      if (name.toLowerCase() === "x-correlation-id") {
        request.correlationId = value;
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
      res.body = json;
      return res;
    };
    res.send ??= (text) => {
      res.body = text;
      return res;
    };
    res.end ??= () => {
      return res;
    };
    res.on ??= () => {
      return res;
    };
    request.res = res;
  }

  /**
   * Apply the authorization cookie to authorization header for local authorization testing in mocked auth scenario
   * @param request HTTP request
   */
  static applyAuthCookie(request) {
    // Apply cookie to authorization header
    if (["mocked"].includes(cds.env.requires.auth.kind) && !request.headers.authorization && request.headers.cookie) {
      const cookies = cookie.parse(request.headers.cookie);
      if (cookies["X-Authorization"] || cookies["Authorization"]) {
        request.headers.authorization = cookies["X-Authorization"] || cookies["Authorization"];
      }
    }
  }
}

module.exports = SocketServer;
