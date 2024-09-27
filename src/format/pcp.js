"use strict";

const cds = require("@sap/cds");

const BaseFormat = require("./base");

const DESERIALIZE_REGEX = /((?:[^:\\]|(?:\\.))+):((?:[^:\\\n]|(?:\\.))*)/;
const MESSAGE = "MESSAGE";
const SEPARATOR = "\n\n";

const LOG = cds.log("/websocket/pcp");

class PCPFormat extends BaseFormat {
  constructor(service, origin) {
    super(service, origin);
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
      const operation = Object.values(this.service.operations || {}).find((operation) => {
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
          event: this.localName(operation.name),
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

  compose(event, data, headers) {
    const eventDefinition = this.service.events()[event];
    const pcpMessage = this.deriveValue(event, data, headers, {
      headerNames: ["pcp-message", "pcp_message", "pcp.message", "pcpmessage"],
      annotationNames: ["@websocket.pcp.message", "@ws.pcp.message"],
      fallback: event,
    });
    const pcpAction = this.deriveValue(event, data, headers, {
      headerNames: ["pcp-action", "pcp_action", "pcp.action", "pcpaction"],
      annotationNames: ["@websocket.pcp.action", "@ws.pcp.action"],
      fallback: MESSAGE,
    });
    const pcpEvent =
      eventDefinition?.["@websocket.pcp.event"] || eventDefinition?.["@ws.pcp.event"] ? event : undefined;
    const pcpFields = serializePcpFields(data, typeof pcpMessage, pcpAction, pcpEvent, eventDefinition?.elements);
    return pcpFields + pcpMessage;
  }
}

const serializePcpFields = (pcpFields, messageType, pcpAction, pcpEvent, elements) => {
  let pcpBodyType = "";
  if (messageType === "string") {
    pcpBodyType = "text";
  } else if (messageType === "blob" || messageType === "arraybuffer") {
    pcpBodyType = "binary";
  }
  let serialized = "";
  if (pcpFields && typeof pcpFields === "object") {
    for (const fieldName in pcpFields) {
      const fieldValue = this.stringValue(pcpFields[fieldName]);
      if (fieldValue && fieldName.indexOf("pcp-") !== 0 && elements?.[fieldName]) {
        serialized += escape(fieldName) + ":" + escape(fieldValue) + "\n";
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

module.exports = PCPFormat;
