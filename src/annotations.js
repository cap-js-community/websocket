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
