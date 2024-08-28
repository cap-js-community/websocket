/* eslint-disable no-unused-vars */
"use strict";

/**
 * Base class for a websocket format
 */
class BaseFormat {
  constructor(service) {
    this.service = service;
  }

  /**
   * Parse the event data into internal data (JSON), i.e. `{ event, data }`
   * @param {String|Object} data Event data
   * @returns {event: String, data: Object} Parsed data
   */
  parse(data) {}

  /**
   * Compose the event and internal data (JSON) into a formatted string
   * @param {String} event Event name
   * @param {Object} data Event internal data
   * @returns {String} Formatted string. For kind `socket.io`, it can also be a JSON object.
   */
  compose(event, data) {}
}

module.exports = BaseFormat;
