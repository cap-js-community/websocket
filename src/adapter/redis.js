"use strict";

const redis = require("../redis");
const cds = require("@sap/cds");

const LOG = cds.log("websocket/redis");

class RedisAdapter {
  constructor(server, prefix, options, config) {
    this.server = server;
    this.prefix = prefix;
    this.options = options;
    this.config = config;
  }

  async setup() {
    this.client = await redis.createPrimaryClientAndConnect(this.config);
  }

  async on(service) {
    if (!this.client) {
      return;
    }
    try {
      const channel = this.prefix + service;
      await this.client.subscribe(channel, async (message, messageChannel) => {
        try {
          if (messageChannel === channel) {
            await this.server.broadcast({ service, event: message });
          }
        } catch (err) {
          LOG?.error(err);
        }
      });
    } catch (err) {
      LOG?.error(err);
    }
  }

  async emit(service, message) {
    if (!this.client) {
      return;
    }
    try {
      const channel = this.prefix + service;
      await this.client.publish(channel, message);
    } catch (err) {
      LOG?.error(err);
    }
  }
}

module.exports = RedisAdapter;
