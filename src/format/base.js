"use strict";

/**
 * Base class for a websocket format
 */
class BaseFormat {
  constructor(service, origin) {
    this.service = service;
    this.origin = origin;
  }

  /**
   * Parse the event data into internal data (JSON), i.e. `{ event, data, headers }`
   * @param {String|Object} data Event data
   * @returns [{event: String, data: Object, headers: Object}] Parsed data
   */
  parse(data) {}

  /**
   * Compose the event and internal data (JSON) into a formatted string
   * @param {String} event Event name
   * @param {Object} data Event internal data
   * @param {Object} headers Event headers
   * @returns {String|Object} Formatted string or a JSON object (for kind `socket.io` only)
   */
  compose(event, data, headers) {}
}

module.exports = BaseFormat;
