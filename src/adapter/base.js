/* eslint-disable no-unused-vars */
"use strict";

/**
 * Base class for a websocket adapter
 */
class BaseAdapter {
  constructor(server, config) {
    this.server = server;
    this.config = config;
    this.prefix = config?.options?.key ?? "websocket";
  }

  async setup() {}

  /**
   * Register an adapter subscription
   * @param {Object} service Service definition
   * @param {path} path Service path
   * @returns {Promise<void>} Promise
   */
  async on(service, path) {}

  /**
   * Emit an adapter event
   * @param {Object} service Service definition
   * @param {String} path Service path
   * @param {String} message Message
   * @returns {Promise<void>} Promise
   */
  async emit(service, path, message) {}
}

module.exports = BaseAdapter;
