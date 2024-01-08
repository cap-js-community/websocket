"use strict";

const cds = require("@sap/cds");
const cookie = require("cookie");
const crypto = require("crypto");

class SocketServer {
  constructor(server, path) {
    this.id = crypto.randomUUID();
    this.server = server;
    this.path = path;
    cds.ws = null;
  }

  async setup() {}

  service(service, connected) {
    connected &&
      connected({
        socket: null,
        setup: () => {},
        context: () => {},
        on: (event, callback) => {},
        emit: (event, data) => {},
        broadcast: (event, data) => {},
        disconnect() {},
      });
  }

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
