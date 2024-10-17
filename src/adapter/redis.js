"use strict";

const cds = require("@sap/cds");

const BaseAdapter = require("./base");
const redis = require("../redis");

const LOG = cds.log("/websocket/redis");

class RedisAdapter extends BaseAdapter {
  constructor(server, config) {
    super(server, config);
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
      const channel = this.getChannel(path);
      await this.client.subscribe(channel, async (message, messageChannel) => {
        try {
          if (messageChannel === channel) {
            await this.server.broadcast({ service, path, event: message, local: true });
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
      const channel = this.getChannel(path);
      await this.client.publish(channel, message);
    } catch (err) {
      LOG?.error(err);
    }
  }

  getChannel(path) {
    return `${this.prefix}/${path}`;
  }
}

module.exports = RedisAdapter;
