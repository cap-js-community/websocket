"use strict";

const redis = require("../redis");
const cds = require("@sap/cds");

const LOG = cds.log("websocket/redis");

class RedisAdapter {
  constructor(server, channel, options) {
    this.server = server;
    this.channel = channel;
    this.options = options;
  }

  async setup() {
    this.client = await redis.createPrimaryClientAndConnect();
  }

  async on() {
    if (!this.client) {
      return;
    }
    try {
      await this.client.subscribe(this.channel);
      this.client.on("message", (channel, message) => {
        if (channel === this.channel) {
          this.server.wss.broadcastAll(message);
        }
      });
    } catch (err) {
      LOG?.error(err);
    }
  }

  async emit(message) {
    if (!this.client) {
      return;
    }
    try {
      await this.client.publish(this.channel, message);
    } catch (err) {
      LOG?.error(err);
    }
  }
}

module.exports = RedisAdapter;
