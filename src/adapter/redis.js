"use strict";

const redis = require("../redis");
const cds = require("@sap/cds");

const LOG = cds.log("/websocket/redis");

class RedisAdapter {
  constructor(server, config) {
    this.server = server;
    this.config = config;
    this.prefix = config?.options?.key ?? "websocket";
  }

  async setup() {
    if (await redis.connectionCheck(this.config)) {
      this.client = await redis.createPrimaryClientAndConnect(this.config);
    }
  }

  async on(service, path) {
    if (!this.client) {
      return;
    }
    try {
      const channel = this.prefix + path;
      await this.client.subscribe(channel, async (message, messageChannel) => {
        try {
          if (messageChannel === channel) {
            await this.server.broadcast({ service, path, event: message });
          }
        } catch (err) {
          LOG?.error(err);
        }
      });
    } catch (err) {
      LOG?.error(err);
    }
  }

  async emit(service, path, message) {
    if (!this.client) {
      return;
    }
    try {
      const channel = this.prefix + path;
      await this.client.publish(channel, message);
    } catch (err) {
      LOG?.error(err);
    }
  }
}

module.exports = RedisAdapter;
