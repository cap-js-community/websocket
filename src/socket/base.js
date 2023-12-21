"use strict";

const cds = require("@sap/cds");
const cookie = require("cookie");

class SocketServer {
  constructor(server, path) {
    this.server = server;
    this.path = path;
    cds.ws = null;
  }

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

  static applyAuthCookie(request) {
    // Authorization
    if (["mocked"].includes(cds.env.requires.auth.kind) && !request.headers.authorization && request.headers.cookie) {
      const cookies = cookie.parse(request.headers.cookie);
      if (cookies["X-Authorization"] || cookies["Authorization"]) {
        request.headers.authorization = cookies["X-Authorization"] || cookies["Authorization"];
      }
    }
  }
}

module.exports = SocketServer;
