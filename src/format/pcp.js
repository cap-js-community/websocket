"use strict";

const cds = require("@sap/cds");
const DESERIALIZE_REGEX = /((?:[^:\\]|(?:\\.))+):((?:[^:\\\n]|(?:\\.))*)/;
const MESSAGE = "MESSAGE";
const SEPARATOR = "\n\n";

const LOG = cds.log("/websocket/pcp");

class PCPFormat {
  constructor(service) {
    this.service = service;
  }

  parse(data) {
    data = data.toString();
    let splitPos = -1;
    if (typeof data === "string") {
      splitPos = data.indexOf(SEPARATOR);
    }
    if (splitPos !== -1) {
      const result = {};
      const pcpFields = extractPcpFields(data.substring(0, splitPos));
      const operation = this.service.operations().find((operation) => {
        return (
          operation["@websocket.pcp.action"] === (pcpFields["pcp-action"] || MESSAGE) ||
          operation["@ws.pcp.action"] === (pcpFields["pcp-action"] || MESSAGE) ||
          operation.name === (pcpFields["pcp-action"] || MESSAGE)
        );
      });
      if (operation) {
        for (const param of operation.params) {
          if (param["@websocket.pcp.message"] || param["@ws.pcp.message"]) {
            result[param.name] = data.substring(splitPos + SEPARATOR.length);
          } else if (pcpFields[param.name] !== undefined) {
            result[param.name] = pcpFields[param.name];
          }
        }
        return {
          event: localName(operation.name, this.service),
          data: result,
        };
      }
    }
    LOG?.warn("Error parsing pcp format", data);
    return {
      event: undefined,
      data: {},
    };
  }

  compose(event, data) {
    const eventDefinition = this.service.events()[event];
    const messageElement = eventDefinition?.elements?.find((element) => {
      return element["@websocket.pcp.message"] || element["@ws.pcp.message"];
    });
    const actionElement = eventDefinition?.elements?.find((element) => {
      return element["@websocket.pcp.action"] || element["@ws.pcp.action"];
    });
    const message =
      eventDefinition?.["@websocket.pcp.message"] ||
      eventDefinition?.["@ws.pcp.message"] ||
      data[messageElement?.name] ||
      event;
    if (data[messageElement?.name]) {
      delete data[messageElement?.name];
    }
    const pcpAction =
      eventDefinition?.["@websocket.pcp.action"] ||
      eventDefinition?.["@ws.pcp.action"] ||
      data[actionElement?.name] ||
      MESSAGE;
    if (data[actionElement?.name]) {
      delete data[actionElement?.name];
    }
    const pcpEvent =
      eventDefinition?.["@websocket.pcp.event"] || eventDefinition?.["@ws.pcp.event"] ? event : undefined;
    const pcpFields = serializePcpFields(data, typeof message, pcpAction, pcpEvent);
    return pcpFields + message;
  }
}

const serializePcpFields = (pcpFields, messageType, pcpAction, pcpEvent) => {
  let pcpBodyType = "";
  if (messageType === "string") {
    pcpBodyType = "text";
  } else if (messageType === "blob" || messageType === "arraybuffer") {
    pcpBodyType = "binary";
  }
  let serialized = "";
  if (pcpFields && typeof pcpFields === "object") {
    for (const fieldName in pcpFields) {
      if (pcpFields[fieldName] && fieldName.indexOf("pcp-") !== 0) {
        serialized += escape(fieldName) + ":" + escape(String(pcpFields[fieldName])) + "\n";
      }
    }
  }
  return (
    (pcpAction ? "pcp-action:" + pcpAction + "\n" : "") +
    (pcpEvent ? "pcp-event:" + pcpEvent + "\n" : "") +
    "pcp-body-type:" +
    pcpBodyType +
    "\n" +
    serialized +
    "\n"
  );
};

const extractPcpFields = (header) => {
  const pcpFields = {};
  for (const field of header.split("\n")) {
    const lines = field.match(DESERIALIZE_REGEX);
    if (lines && lines.length === 3) {
      pcpFields[unescape(lines[1])] = unescape(lines[2]);
    }
  }
  return pcpFields;
};

const escape = (unescaped) => {
  return unescaped.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/\n/g, "\\n");
};

const unescape = (escaped) => {
  return escaped
    .split("\u0008")
    .map((part) => {
      return part
        .replace(/\\\\/g, "\u0008")
        .replace(/\\:/g, ":")
        .replace(/\\n/g, "\n")
        .replace(/\u0008/g, "\\");
    })
    .join("\u0008");
};

const localName = (name, service) => {
  if (name.startsWith(`${service.name}.`)) {
    return name.substring(service.name.length + 1);
  }
  return name;
};

module.exports = PCPFormat;
