"use strict";

const cds = require("@sap/cds");

const LOG = cds.log("websocket");

function addWebSocketAnnotations(csn) {
  const definitions = csn.definitions;
  if (!definitions) {
    return;
  }
  for (const [name, definition] of Object.entries(definitions)) {
    if (definition.kind !== "service") {
      continue;
    }
    const protocols = deriveProtocols(definition);
    const hasWebSocket =
      protocols.some((protocol) => ["ws", "websocket"].includes(protocol.kind)) ||
      hasWebSocketDefinitions(name, definitions);
    // CDS default protocol is odata-v4 when no @protocol is specified
    const hasOData =
      protocols.length === 0 ||
      protocols.some((protocol) => ["odata", "odata-v4", "odata-v2"].includes(protocol.kind));
    if (!hasWebSocket || !hasOData) {
      continue;
    }
    if (!definition["@Common.WebSocketBaseURL"]) {
      const webSocketBaseURL = deriveWebSocketBaseURL(definition, name, protocols);
      if (webSocketBaseURL) {
        definition["@Common.WebSocketBaseURL"] = webSocketBaseURL;
        LOG?.debug?.("Auto-added @Common.WebSocketBaseURL", { service: name, value: webSocketBaseURL });
      }
    }
    if (!definition["@Common.WebSocketChannel#sideEffects"]) {
      definition["@Common.WebSocketChannel#sideEffects"] = "sideeffects";
      LOG?.debug?.("Auto-added @Common.WebSocketChannel#sideEffects", { service: name });
    }
  }
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

function hasWebSocketDefinitions(serviceName, definitions) {
  const prefix = serviceName + ".";
  for (const [name, definition] of Object.entries(definitions)) {
    if (!name.startsWith(prefix)) {
      continue;
    }
    if (!["event", "action", "function"].includes(definition.kind)) {
      continue;
    }
    if (
      definition["@websocket"] ||
      definition["@ws"] ||
      Object.keys(definition).some((key) => key.startsWith("@websocket.") || key.startsWith("@ws."))
    ) {
      return true;
    }
  }
  return false;
}

function deriveWebSocketBaseURL(definition, serviceName, protocols) {
  const wsProtocolPath = cds.env.protocols?.websocket?.path || cds.env.protocols?.ws?.path || "/ws";
  const wsProtocol = protocols.find((protocol) => ["ws", "websocket"].includes(protocol.kind) && protocol.path);
  if (wsProtocol?.path) {
    const path = wsProtocol.path;
    if (path.startsWith("/")) {
      return path.substring(1);
    }
    return normalizeBasePath(wsProtocolPath) + "/" + path;
  }
  const servicePath = deriveServicePath(definition, serviceName);
  return normalizeBasePath(wsProtocolPath) + "/" + servicePath;
}

function deriveServicePath(definition, serviceName) {
  const path = definition["@path"];
  if (path) {
    return path.startsWith("/") ? path.substring(1) : path;
  }
  const localName = serviceName.split(".").pop();
  return localName.replace(/Service$/i, "").toLowerCase() || localName.toLowerCase();
}

function normalizeBasePath(path) {
  return path.startsWith("/") ? path.substring(1) : path;
}

module.exports = addWebSocketAnnotations;
