"use strict";

const cds = require("@sap/cds");

const BaseFormat = require("./base");

/**
 * Generic class for a websocket format
 */
class GenericFormat extends BaseFormat {
  constructor(service, origin, name, identifier) {
    super(service, origin);
    this.name = name || "generic";
    this.identifier = identifier || "name";
    this.LOG = cds.log(`websocket/${this.name}`);
  }

  /**
   * Parse the event data into internal data (JSON), i.e. `{ event, data, headers }`
   * @param {String|Object} data Event data
   * @returns [{event: String, data: Object, headers: Object}] Parsed data
   */
  parse(data) {
    data = this.deserialize(data);
    const operation = this.determineOperation(data);
    if (operation) {
      const annotations = this.collectAnnotations(operation);
      // Ignore name annotation corresponding to the identifier
      annotations.delete("name");
      let mappedData = {};
      if (annotations.size > 0) {
        this.mapValues(operation, data, mappedData, annotations);
      } else {
        mappedData = data;
      }
      const result = {};
      for (const param of operation.params || []) {
        if (mappedData[param.name] !== undefined) {
          result[param.name] = mappedData[param.name];
        }
      }
      return {
        event: this.localName(operation),
        data: result,
        headers: {},
      };
    }
    this.LOG?.error(`Operation could not be determined from name`, data);
    return {
      event: undefined,
      data: {},
      headers: {},
    };
  }

  /**
   * Compose the event and internal data (JSON) into a formatted string
   * @param {String} event Event name
   * @param {Object} data Event internal data
   * @param {Object} headers Event headers
   * @returns {String|Object} Formatted string or a JSON object (for kind `socket.io` only)
   */
  compose(event, data, headers) {
    const result = {};
    const eventDefinition = this.events[event];
    const annotations = this.collectAnnotations(eventDefinition);
    for (const header in headers) {
      if (header === this.name && typeof headers[header] === "object") {
        continue;
      }
      const value = this.deriveValue(eventDefinition, {
        headers,
        headerNames: [
          `${this.name}-${header}`,
          `${this.name}_${header}`,
          `${this.name}.${header}`,
          `${this.name}${header}`,
          header,
        ],
      });
      if (value !== undefined) {
        result[header] = value;
      }
    }
    if (headers?.[this.name]) {
      for (const header in headers?.[this.name]) {
        const value = this.deriveValue(eventDefinition, {
          headers: headers?.[this.name],
          headerNames: [
            `${this.name}-${header}`,
            `${this.name}_${header}`,
            `${this.name}.${header}`,
            `${this.name}${header}`,
            header,
          ],
        });
        if (value !== undefined) {
          result[header] = value;
        }
      }
    }
    for (const annotation of annotations) {
      const value = this.deriveValue(eventDefinition, {
        data,
        annotationNames: [`@websocket.${this.name}.${annotation}`, `@ws.${this.name}.${annotation}`],
      });
      if (value !== undefined) {
        result[annotation] = value;
      }
    }
    const serialize = arguments[3];
    if (serialize === false) {
      return result;
    }
    return this.serialize(result);
  }

  /**
   * Returns all operations
   * @returns {Object} Operations
   */
  get operations() {
    if (!Object.keys(this.service.wsMixinOperations ?? {}).length) {
      return this.service.operations;
    }
    return { ...this.service.operations, ...this.service.wsMixinOperations };
  }

  /**
   * Returns all events
   * @returns {Object} Events
   */
  get events() {
    return this.service.events;
  }

  /**
   * Determine operation based on event data
   * @param {Object} data Event data
   * @returns {Object} Service Operation
   */
  determineOperation(data) {
    if (!data) {
      return;
    }
    return Object.values(this.operations).find((operation) => {
      return (
        (operation[`@websocket.${this.name}.name`] &&
          operation[`@websocket.${this.name}.name`] === data[this.identifier]) ||
        (operation[`@ws.${this.name}.name`] && operation[`@ws.${this.name}.name`] === data[this.identifier]) ||
        operation.name === data[this.identifier] ||
        this.localName(operation) === data[this.identifier]
      );
    });
  }

  /**
   * Collect annotations for a CDS definition (event, operation) and CDS definition elements (elements, params)
   * @param {Object} definition Definition (event, operation)
   * @returns {Set<String>} Set of annotations
   */
  collectAnnotations(definition) {
    const annotations = new Set();
    for (const annotation in definition) {
      if (annotation.startsWith(`@websocket.${this.name}.`)) {
        annotations.add(annotation.substring(`@websocket.${this.name}.`.length));
      }
      if (annotation.startsWith(`@ws.${this.name}.`)) {
        annotations.add(annotation.substring(`@ws.${this.name}.`.length));
      }
    }
    if (definition?.elements || definition?.params) {
      const elements = Object.values(definition?.elements || definition?.params);
      for (const element of elements) {
        for (const annotation in element) {
          if (annotation.startsWith(`@websocket.${this.name}.`)) {
            annotations.add(annotation.substring(`@websocket.${this.name}.`.length));
          }
          if (annotation.startsWith(`@ws.${this.name}.`)) {
            annotations.add(annotation.substring(`@ws.${this.name}.`.length));
          }
        }
      }
    }
    return annotations;
  }

  /**
   * Derive value from data, headers and fallback using header names and annotation names
   * @param {Object} definition Definition Definition (event, operation)
   * @param {Object} [headers] Header data
   * @param {[String]} [headerNames] Header names to derive value from
   * @param {Object} [data] Data
   * @param {[String]} [annotationNames] Annotation names to derived values from
   * @param {*} [fallback] Fallback value
   * @returns {*} Derived value
   */
  deriveValue(definition, { headers, headerNames, data, annotationNames, fallback }) {
    if (headers && headerNames) {
      for (const header of headerNames) {
        if (headers[header] !== undefined) {
          return headers[header];
        }
      }
    }
    if (data && annotationNames) {
      if (definition) {
        if (annotationNames) {
          for (const annotation of annotationNames) {
            if (definition[annotation] !== undefined) {
              return definition[annotation];
            }
          }
        }
        const elements = Object.values(definition?.elements || definition?.params || {});
        for (const annotation of annotationNames) {
          if (annotationNames) {
            const element = elements.find((element) => {
              return element[annotation] && !(element["@websocket.ignore"] || element["@ws.ignore"]);
            });
            if (element) {
              const elementValue = data[element.name];
              if (elementValue !== undefined) {
                delete data[element.name];
                return elementValue;
              }
            }
          }
        }
      }
    }
    return fallback;
  }

  /**
   * Derive annotation values from data using annotation names
   * @param {Object} definition Definition (event, operation)
   * @param {Object} data Data
   * @param {Object} mappedData Data to be mapped into
   * @param {[String]} [localAnnotations] Local annotation names to be mapped
   * @returns {*} Derived values
   */
  mapValues(definition, data, mappedData, localAnnotations) {
    data ??= {};
    if (definition) {
      for (const localAnnotation of localAnnotations || []) {
        for (const annotation of [
          `@websocket.${this.name}.${localAnnotation}`,
          `@ws.${this.name}.${localAnnotation}`,
        ]) {
          if (definition[annotation] !== undefined) {
            data[localAnnotation] = definition[annotation];
          }
        }
      }
      const elements = Object.values(definition?.elements || definition?.params || {});
      for (const element of elements) {
        if (element["@websocket.ignore"] || element["@ws.ignore"]) {
          continue;
        }
        let mapped = false;
        for (const localAnnotation of localAnnotations || []) {
          if (mapped) {
            break;
          }
          for (const annotation of [
            `@websocket.${this.name}.${localAnnotation}`,
            `@ws.${this.name}.${localAnnotation}`,
          ]) {
            if (!element[annotation]) {
              continue;
            }
            if (data[localAnnotation] !== undefined) {
              mappedData[element.name] = data[localAnnotation];
              mapped = true;
              break;
            }
          }
        }
        if (!mapped) {
          mappedData[element.name] = data[element.name];
        }
      }
    }
  }

  /**
   * Get local name of a definition (event, operation)
   * @param {Object} definition Service definition
   * @returns {String} Local name of the definition
   */
  localName(definition) {
    return definition.name.startsWith(`${definition._service.name}.`)
      ? definition.name.substring(definition._service.name.length + 1)
      : definition.name;
  }

  /**
   * Deserialize data
   * @param {String|Object} data Data
   * @returns {Object} Deserialized data
   */
  deserialize(data) {
    if (data === undefined) {
      return;
    }
    try {
      return data?.constructor === Object ? data : JSON.parse(data);
    } catch (err) {
      this.LOG?.error(err);
      this.LOG?.error(`Error parsing ${this.name} format`, data);
    }
  }

  /**
   * Serialize data based on format origin
   * @param {String|Object} data Data
   * @returns {String|Object} Serialized data
   */
  serialize(data) {
    return this.origin === "json" ? data : JSON.stringify(data);
  }

  /**
   * Serialize value to string
   * @param value Value
   * @returns {string} String value
   */
  stringValue(value) {
    if (value instanceof Date) {
      return value.toISOString();
    } else if (value instanceof Object) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Parse string value based on type
   * @param value Value
   * @param type Type
   * @returns {string|boolean|number|Date} Parsed value
   */
  parseStringValue(value, type) {
    if (value === undefined || value === null) {
      return value;
    }
    if (type === "cds.Boolean" && ["false", "true"].includes(value)) {
      return value === "true";
    }
    if (
      (type.startsWith("cds.Int") ||
        type.startsWith("cds.UInt") ||
        type.startsWith("cds.Decimal") ||
        type.startsWith("cds.Double")) &&
      !isNaN(value)
    ) {
      return parseFloat(value);
    }
    if (
      ["cds.Date", "cds.DateTime", "cds.Timestamp"].includes(type) &&
      new Date(value) instanceof Date &&
      !isNaN(new Date(value))
    ) {
      return new Date(value);
    }
    return value;
  }
}

module.exports = GenericFormat;
