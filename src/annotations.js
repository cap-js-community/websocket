"use strict";

const cds = require("@sap/cds");
const util = require("./common/util");

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
    const protocols = util.deriveProtocols(definition);
    const hasWebSocket =
      protocols.some((protocol) => ["ws", "websocket"].includes(protocol.kind)) ||
      hasWebSocketDefinitions(name, definitions);
    const hasOData =
      protocols.length === 0 || protocols.some((protocol) => ["odata", "odata-v4", "odata-v2"].includes(protocol.kind));
    if (!hasWebSocket || !hasOData) {
      continue;
    }
    addWebsocketCommonAnnotations(name, definition, protocols);
    addSideEffectAnnotations(name, definitions);
  }
}

function addWebsocketCommonAnnotations(serviceName, definition, protocols) {
  if (!definition["@Common.WebSocketBaseURL"]) {
    const webSocketBaseURL = deriveWebSocketBaseURL(definition, serviceName, protocols);
    if (webSocketBaseURL) {
      definition["@Common.WebSocketBaseURL"] = webSocketBaseURL;
      LOG?.debug?.("Auto-added @Common.WebSocketBaseURL", { service: serviceName, value: webSocketBaseURL });
    }
  }
  if (!definition["@Common.WebSocketChannel#sideEffects"]) {
    definition["@Common.WebSocketChannel#sideEffects"] = "sideeffects";
    LOG?.debug?.("Auto-added @Common.WebSocketChannel#sideEffects", { service: serviceName });
  }
}

function addSideEffectAnnotations(serviceName, definitions) {
  const prefix = serviceName + ".";
  const sideEffectEventNames = new Set();
  for (const [name, definition] of Object.entries(definitions)) {
    if (!name.startsWith(prefix)) {
      continue;
    }
    if (definition.kind !== "entity") {
      continue;
    }
    for (const key of Object.keys(definition)) {
      if (key.startsWith("@Common.SideEffects") && key.endsWith(".SourceEvents")) {
        const sourceEvents = definition[key];
        if (Array.isArray(sourceEvents)) {
          for (const eventName of sourceEvents) {
            sideEffectEventNames.add(eventName);
          }
        }
      }
    }
  }
  if (sideEffectEventNames.size === 0) {
    return;
  }
  for (const [name, definition] of Object.entries(definitions)) {
    if (!name.startsWith(prefix)) {
      continue;
    }
    if (definition.kind !== "event") {
      continue;
    }
    const localName = name.substring(prefix.length);
    if (!sideEffectEventNames.has(localName)) {
      continue;
    }
    if (definition["@ws.pcp.sideEffect"] || definition["@websocket.pcp.sideEffect"]) {
      continue;
    }
    if (!definition["@ws.format"]) {
      definition["@ws.format"] = "pcp";
    }
    definition["@ws.pcp.sideEffect"] = true;
    LOG?.debug?.("Auto-added @ws.pcp.sideEffect", { service: serviceName, event: localName });
  }
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
    if (util.websocketEnabled(definition)) {
      return true;
    }
  }
  return false;
}

function deriveWebSocketBaseURL(definition, serviceName, protocols) {
  const wsProtocolPath = util.webSocketProtocolPath();
  const wsProtocol = protocols.find((protocol) => ["ws", "websocket"].includes(protocol.kind) && protocol.path);
  if (wsProtocol?.path) {
    const path = util.normalizeBasePath(wsProtocol.path);
    return util.normalizeBasePath(wsProtocolPath) + "/" + path;
  }
  const servicePath = deriveServicePath(definition, serviceName);
  return util.normalizeBasePath(wsProtocolPath) + "/" + servicePath;
}

function deriveServicePath(definition, serviceName) {
  const path = definition["@path"];
  if (path) {
    return util.normalizeBasePath(path);
  }
  const localName = serviceName.split(".").pop();
  return localName.replace(/Service$/i, "").toLowerCase() || localName.toLowerCase();
}

module.exports = addWebSocketAnnotations;
