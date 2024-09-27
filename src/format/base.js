/* eslint-disable no-unused-vars */
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
   * Parse the event data into internal data (JSON), i.e. `{ event, data }`
   * @param {String|Object} data Event data
   * @returns {event: String, data: Object} Parsed data
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

  /**
   * Derive value from event data via annotations
   * @param {String} event Event definition
   * @param {Object} data Event data
   * @param {Object} headers Event headers
   * @param {[String]} headersNames Header names
   * @param {[String]} annotationNames Annotations names
   * @param {*} [fallback] Fallback value
   * @returns {*} Derived value
   */
  deriveValue(event, data, headers, { headerNames, annotationNames, fallback }) {
    const eventDefinition = this.service.events()[event];
    if (eventDefinition) {
      if (headers) {
        for (const header of headerNames || []) {
          if (headers[header] !== undefined) {
            return headers[header];
          }
        }
      }
      for (const annotation of annotationNames || []) {
        if (eventDefinition[annotation] !== undefined) {
          return eventDefinition[annotation];
        }
      }
      if (data) {
        const eventElements = Object.values(eventDefinition?.elements || {});
        if (eventElements.length > 0) {
          for (const annotation of annotationNames) {
            const eventElement = eventElements.find((element) => {
              return element[annotation];
            });
            if (eventElement) {
              const elementValue = data[eventElement.name];
              if (elementValue !== undefined) {
                delete data[eventElement.name];
                return elementValue;
              }
            }
          }
        }
      }
    }
    return fallback;
  }

  localName(name) {
    return name.startsWith(`${this.service.name}.`) ? name.substring(this.service.name.length + 1) : name;
  };

  stringValue(value) {
    if (value instanceof Date) {
      return value.toISOString();
    } else if (value instanceof Object) {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

module.exports = BaseFormat;
