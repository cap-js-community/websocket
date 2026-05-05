"use strict";

const cds = require("@sap/cds");

function localName(definition) {
  return definition.name.startsWith(`${definition._service.name}.`)
    ? definition.name.substring(definition._service.name.length + 1)
    : definition.name;
}

function websocketEnabled(definition) {
  return (
    definition["@websocket"] ||
    definition["@ws"] ||
    Object.keys(definition).some((p) => p.startsWith("@websocket.") || p.startsWith("@ws."))
  );
}

function normalizeBasePath(path) {
  return path.startsWith("/") ? path.substring(1) : path;
}

function webSocketProtocolPath() {
  return cds.env.protocols?.websocket?.path || cds.env.protocols?.ws?.path || "/ws";
}

function servedViaWebsocket(service) {
  if (!service?.definition) {
    return false;
  }
  const protocols = deriveProtocols(service.definition);
  return protocols.some((protocol) => ["websocket", "ws"].includes(protocol.kind));
}

function deriveProtocols(definition) {
  const protocols = [];
  const protocolAnnotation = definition["@protocol"];
  if (protocolAnnotation) {
    const entries = Array.isArray(protocolAnnotation) ? protocolAnnotation : [protocolAnnotation];
    for (const entry of entries) {
      if (typeof entry === "string") {
        protocols.push({ kind: entry });
      } else if (entry?.kind) {
        protocols.push({ kind: entry.kind, path: entry.path });
      }
    }
  }
  for (const key of Object.keys(cds.env.protocols || {})) {
    if (definition["@" + key]) {
      protocols.push({ kind: key });
    }
  }
  if (definition["@websocket"]) {
    protocols.push({ kind: "websocket" });
  }
  if (definition["@ws"]) {
    protocols.push({ kind: "ws" });
  }
  if (definition["@odata"]) {
    protocols.push({ kind: "odata" });
  }
  return protocols;
}

module.exports = {
  localName,
  websocketEnabled,
  normalizeBasePath,
  servedViaWebsocket,
  webSocketProtocolPath,
  deriveProtocols,
};
