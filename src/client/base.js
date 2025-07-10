"use strict";

const cds = require("@sap/cds");

module.exports = class BaseClientService extends cds.Service {
  static HeaderServerResult = "x-websocket-result";

  async init() {
    await super.init();
  }

  async disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  async send(event, data, headers) {}

  async enterContext(context) {
    return await this.send("wsContext", {
      context: !Array.isArray(context) ? context : undefined,
      contexts: Array.isArray(context) ? context : undefined,
    });
  }

  async exitContext(context) {
    return await this.send("wsContext", {
      context: !Array.isArray(context) ? context : undefined,
      contexts: Array.isArray(context) ? context : undefined,
      exit: true,
    });
  }

  async resetContexts() {
    return await this.send("wsContext", { reset: true });
  }
};
