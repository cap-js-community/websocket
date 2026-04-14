"use strict";

const cds = require("@sap/cds");

const BaseAdapter = require("./base");
const redis = require("../redis");

const LOG = cds.log("websocket/redis");

class RedisAdapter extends BaseAdapter {
  constructor(server, config) {
    super(server, config);
    this.active = false;
  }

  async setup() {
    if (await redis.connectionCheck(this.config)) {
      this.publisherClient = await redis.createPrimaryClientAndConnect(this.config);
      this.subscriberClient = await redis.createSecondaryClientAndConnect(this.config);
      if (this.publisherClient && this.subscriberClient) {
        this.active = true;
      }
    }
  }

  async on(service, path) {
    if (!this.active) {
      return;
    }
    try {
      const channel = this.getChannel(path);
      await this.subscriberClient.subscribe(channel, async (message, messageChannel) => {
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
    if (!this.active) {
      return;
    }
    try {
      const channel = this.getChannel(path);
      await this.publisherClient.publish(channel, message);
    } catch (err) {
      LOG?.error(err);
    }
  }

  getChannel(path) {
    return `${this.prefix}/${path}`;
  }
}

module.exports = RedisAdapter;
