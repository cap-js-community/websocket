"use strict";

const ioc = require("socket.io-client");

const BaseClientService = require("./base");

module.exports = class SocketIOClientService extends BaseClientService {
  async init() {
    await super.init();
    this.socket = ioc(this.options.url, {
      extraHeaders: {
        ...this.options.headers,
      },
    });
    await new Promise((resolve, reject) => {
      this.socket.once("connect", () => {
        resolve();
      });
      this.socket.once("connect_error", reject);
    });
    this.on("*", async (req) => {
      if (req.headers?.[BaseClientService.HeaderServerResult]) {
        return;
      }
      await this.send(req.event, req.data, req.headers);
    });
    this.socket.onAny(async (event, data, headers) => {
      await this.emit(event, data, {
        ...headers,
        [BaseClientService.HeaderServerResult]: true,
      });
    });
  }

  async send(event, data, headers) {
    if (this.options.format === "json") {
      return new Promise((resolve, reject) => {
        this.socket.emit(event, data, headers, (result) => {
          if (result?.error) {
            reject(result?.error);
          } else {
            resolve(result);
          }
        });
      });
    } else {
      return new Promise((resolve) => {
        this.socket.emit(event, data, headers);
        resolve(null);
      });
    }
  }
};
