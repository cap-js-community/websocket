"use strict";

const WebSocket = require("ws");

const BaseClientService = require("./base");

module.exports = class WSClientService extends BaseClientService {
  async init() {
    await super.init();
    this.socket = new WebSocket(this.options.url, this.options.protocols ?? [], {
      headers: {
        ...this.options.headers,
      },
    });
    await new Promise((resolve, reject) => {
      this.socket.once("open", () => {
        resolve();
      });
      this.socket.once("error", reject);
    });
    this.on("*", async (req) => {
      if (req.headers?.[BaseClientService.HeaderServerResult]) {
        return;
      }
      await this.send(req.event, req.data, req.headers);
    });
    this.socket.on("message", async (message) => {
      const event = this.received(message);
      await this.emit(event.event, event.data, {
        ...event.headers,
        [BaseClientService.HeaderServerResult]: true,
      });
    });
  }

  async send(event, data, headers) {
    return new Promise((resolve) => {
      if (this.options.format === "json") {
        this.socket.send(
          JSON.stringify({
            event,
            data,
            headers,
          }),
          (result) => {
            resolve(result || null);
          },
        );
      } else {
        const message = data;
        return new Promise((resolve) => {
          this.socket.send(message, (result) => {
            resolve(result || null);
          });
        });
      }
    });
  }

  received(message) {
    if (this.options.format === "json") {
      return JSON.parse(message);
    } else {
      return {
        event: "message",
        data: message,
      };
    }
  }
};
