"use strict";

const cds = require("@sap/cds");

const SocketServer = require("./socket/base");
const redis = require("./redis");

const LOG = cds.log("/websocket");
const TIMEOUT_SHUTDOWN = 2500;

const WebSocketAction = {
  Connect: "wsConnect",
  Disconnect: "wsDisconnect",
  Context: "wsContext",
};

let socketServer;

let services;
const collectServicesAndMountAdapter = (srv, options) => {
  if (!services) {
    services = {};
    cds.on("served", () => {
      options.services = services;
      serveWebSocketServer(options);
    });
    cds.on("shutdown", async () => {
      await shutdownWebSocketServer();
    });
  }
  services[srv.name] = srv;
};

function serveWebSocketServer(options) {
  // Wait for server listening (http server is ready)
  cds.on("listening", async (app) => {
    socketServer = await initWebSocketServer(app.server, options.path);
    if (socketServer) {
      // Websocket services
      for (const serviceName in options.services) {
        const service = options.services[serviceName];
        if (isServedViaWebsocket(service)) {
          serveWebSocketService(socketServer, service, options);
        }
      }
      // Websockets events
      const eventServices = {};
      for (const name in cds.model.definitions) {
        const definition = cds.model.definitions[name];
        if (definition.kind === "event" && (definition["@websocket"] || definition["@ws"])) {
          const service = cds.services[definition._service?.name];
          if (service && !isServedViaWebsocket(service)) {
            eventServices[service.name] ??= eventServices[service.name] || {
              name: service.name,
              definition: service.definition,
              endpoints: service.endpoints.map((endpoint) => {
                const protocol =
                  cds.env.protocols[endpoint.kind] ||
                  (endpoint.kind === "odata" ? cds.env.protocols["odata-v4"] : null);
                let path = normalizeServicePath(service.path, protocol.path);
                if (!path.startsWith("/")) {
                  path = (cds.env.protocols?.websocket?.path || cds.env.protocols?.ws?.path || "/ws") + "/" + path;
                }
                return { kind: "websocket", path };
              }),
              operations: () => {
                return interableObject();
              },
              entities: () => {
                return interableObject();
              },
              _events: interableObject(),
              events: function () {
                return this._events;
              },
              on: service.on.bind(service),
              tx: service.tx.bind(service),
            };
            eventServices[service.name]._events[serviceLocalName(service, definition.name)] = definition;
          }
        }
      }
      for (const name in eventServices) {
        const eventService = eventServices[name];
        if (Object.keys(eventService.events()).length > 0) {
          serveWebSocketService(socketServer, eventService, options);
        }
      }
      LOG?.info("using websocket", {
        kind: cds.env.websocket.kind,
        adapter: socketServer.adapter ? { impl: socketServer.adapterImpl, active: socketServer.adapterActive } : false,
      });
    }
  });
}

async function initWebSocketServer(server, path) {
  if (cds.env.websocket === false) {
    return;
  }
  try {
    cds.env.websocket ??= {};
    cds.env.websocket = { ...cds.env.requires?.websocket, ...cds.env.websocket };
    cds.env.websocket.kind ??= "ws";
    const serverImpl = cds.env.websocket.impl || cds.env.websocket.kind;
    const socketModule = SocketServer.require(serverImpl, "socket");
    socketServer = new socketModule(server, path, cds.env.websocket);
    await socketServer.setup();
    return socketServer;
  } catch (err) {
    LOG?.error(err);
  }
}

async function shutdownWebSocketServer() {
  return await new Promise((resolve, reject) => {
    const timeoutRef = setTimeout(() => {
      clearTimeout(timeoutRef);
      LOG?.info("Shutdown timeout reached!");
      resolve();
    }, TIMEOUT_SHUTDOWN);
    redis
      .closeClients()
      .then((result) => {
        clearTimeout(timeoutRef);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timeoutRef);
        reject(err);
      });
  });
}

function normalizeServicePath(servicePath, protocolPath) {
  if (servicePath.startsWith(`${protocolPath}/`)) {
    return servicePath.substring(`${protocolPath}/`.length);
  }
  return servicePath;
}

function serveWebSocketService(socketServer, service, options) {
  for (const endpoint of service.endpoints || []) {
    if (["websocket", "ws"].includes(endpoint.kind)) {
      const path = normalizeServicePath(endpoint.path, options.path);
      try {
        bindServiceEvents(socketServer, service, path);
        socketServer.service(service, path, (socket) => {
          try {
            bindServiceDefaults(socket, service);
            bindServiceOperations(socket, service);
            bindServiceEntities(socket, service);
            emitConnect(socket, service);
          } catch (err) {
            LOG?.error(err);
            socket.disconnect();
          }
        });
      } catch (err) {
        LOG?.error(err);
      }
    }
  }
}

function bindServiceEvents(socketServer, service, path) {
  for (const event of service.events()) {
    service.on(event, async (req) => {
      try {
        const localEventName = serviceLocalName(service, event.name);
        const format = deriveFormat(service, event);
        const headers = deriveHeaders(req.headers, format);
        const user = deriveUser(event, req.data, headers, req);
        const context = deriveContext(event, req.data, headers);
        const identifier = deriveIdentifier(event, req.data, headers);
        const eventHeaders = deriveEventHeaders(headers);
        const eventPath = derivePath(event, path);
        await socketServer.broadcast({
          service,
          path: eventPath,
          event: localEventName,
          data: req.data,
          tenant: req.tenant,
          user,
          context,
          identifier,
          headers: eventHeaders,
          socket: null,
        });
      } catch (err) {
        LOG?.error(err);
      }
    });
  }
}

function bindServiceDefaults(socket, service) {
  if (service.operations[WebSocketAction.Disconnect]) {
    const operation = service.operations[WebSocketAction.Disconnect];
    socket.onDisconnect(async (reason) => {
      const data = {};
      if (reason !== undefined && operation?.params?.reason?.type === "cds.String") {
        data.reason = stringValue(reason);
      }
      await processEvent(socket, service, WebSocketAction.Disconnect, data);
    });
  }
  socket.on(WebSocketAction.Context, async (data, callback) => {
    if (data?.reset) {
      await socket.reset();
    }
    if (Array.isArray(data?.context)) {
      data.contexts = data?.context;
      delete data.context;
    }
    if (!data?.exit) {
      if (data?.contexts) {
        for (const context of data.contexts) {
          if (context) {
            await socket.enter(context);
          }
        }
      } else if (data?.context) {
        await socket.enter(data.context);
      }
    } else {
      if (data?.contexts) {
        for (const context of data.contexts) {
          if (context) {
            await socket.exit(context);
          }
        }
      } else if (data?.context) {
        await socket.exit(data.context);
      }
    }
    if (service.operations[WebSocketAction.Context]) {
      await processEvent(socket, service, WebSocketAction.Context, data, callback);
    } else {
      callback && (await callback());
    }
  });
}

function bindServiceOperations(socket, service) {
  for (const operation of service.operations()) {
    const event = serviceLocalName(service, operation.name);
    if (Object.values(WebSocketAction).includes(event)) {
      continue;
    }
    socket.on(event, async (data, callback) => {
      await processEvent(socket, service, event, data, callback);
    });
  }
}

function bindServiceEntities(socket, service) {
  for (const entity of service.entities()) {
    const localEntityName = serviceLocalName(service, entity.name);
    socket.on(`${localEntityName}:create`, async (data, callback) => {
      await processCRUD(socket, service, entity, "create", data, async (response) => {
        callback && (await callback(response));
        await broadcastEvent(socket, service, `${localEntityName}:created`, entity, response);
      });
    });
    socket.on(`${localEntityName}:read`, async (data, callback) => {
      await processCRUD(socket, service, entity, "read", data, callback);
    });
    socket.on(`${localEntityName}:readDeep`, async (data, callback) => {
      await processCRUD(socket, service, entity, "readDeep", data, callback);
    });
    socket.on(`${localEntityName}:update`, async (data, callback) => {
      await processCRUD(socket, service, entity, "update", data, async (response) => {
        callback && (await callback(response));
        await broadcastEvent(socket, service, `${localEntityName}:updated`, entity, response);
      });
    });
    socket.on(`${localEntityName}:delete`, async (data, callback) => {
      await processCRUD(socket, service, entity, "delete", data, async (response) => {
        callback && (await callback(response));
        await broadcastEvent(socket, service, `${localEntityName}:deleted`, entity, { ...response, ...data });
      });
    });
    socket.on(`${localEntityName}:list`, async (data, callback) => {
      await processCRUD(socket, service, entity, "list", data, callback);
    });
    for (const actionName in entity.actions) {
      const action = entity.actions[actionName];
      socket.on(`${localEntityName}:${action.name}`, async (data, callback) => {
        await processCRUD(socket, service, entity, action.name, data, callback);
      });
    }
  }
}

async function emitConnect(socket, service) {
  if (service.operations[WebSocketAction.Connect]) {
    await processEvent(socket, service, WebSocketAction.Connect);
  }
}

async function processEvent(socket, service, event, data, callback) {
  try {
    const response = await callEvent(socket, service, event, data);
    callback && (await callback(response));
  } catch (err) {
    LOG?.error(err);
    try {
      callback &&
        (await callback({
          error: {
            code: err.code || err.status || err.statusCode,
            message: err.message,
          },
        }));
    } catch (err) {
      LOG?.error(err);
    }
  }
}

async function callEvent(socket, service, event, data) {
  data = data || {};
  return await service.tx(socket.context, async (srv) => {
    return await srv.send({
      event,
      data,
    });
  });
}

async function processCRUD(socket, service, entity, event, data, callback) {
  try {
    const response = await callCRUD(socket, service, entity, event, data);
    callback && (await callback(response));
  } catch (err) {
    LOG?.error(err);
    try {
      callback &&
        (await callback({
          error: {
            code: err.code || err.status || err.statusCode,
            message: err.message,
          },
        }));
    } catch (err) {
      LOG?.error(err);
    }
  }
}

async function callCRUD(socket, service, entity, event, data) {
  data = data || {};
  return await service.tx(socket.context, async (srv) => {
    const key = deriveKey(entity, data);
    switch (event) {
      case "create":
        return await srv.create(entity).entries(data);
      case "read":
        return await srv.run(SELECT.one.from(entity).where(key));
      case "readDeep":
        return await srv.run(SELECT.one.from(entity).columns(getDeepEntityColumns(entity)).where(key));
      case "update":
        return await srv.update(entity).set(data).where(key);
      case "delete":
        return await srv.delete(entity).where(key);
      case "list":
        return await srv.read(entity).where(data);
      default:
        return await srv.send({
          event,
          entity: entity.name,
          data,
        });
    }
  });
}

async function broadcastEvent(socket, service, event, entity, data) {
  let user;
  let context;
  let identifier;
  const events = service.events();
  const eventDefinition = events[event] || events[event.replaceAll(/:/g, ".")];
  if (eventDefinition) {
    user = deriveUser(eventDefinition, data, {}, socket);
    context = deriveContext(eventDefinition, data, {});
    identifier = deriveIdentifier(eventDefinition, data, {});
  }
  const contentData = broadcastData(entity, data, eventDefinition);
  if (contentData) {
    if (entity["@websocket.broadcast.all"] || entity["@ws.broadcast.all"]) {
      await socket.broadcastAll(event, contentData, user, context, identifier);
    } else {
      await socket.broadcast(event, contentData, user, context, identifier);
    }
  }
}

function broadcastData(entity, data, event) {
  if (event) {
    return deriveElements(event, data);
  }
  const content =
    entity["@websocket.broadcast.content"] ||
    entity["@ws.broadcast.content"] ||
    entity["@websocket.broadcast"] ||
    entity["@ws.broadcast"];
  switch (content) {
    case "key":
    default:
      return deriveKey(entity, data);
    case "data":
      return data;
    case "none":
      return;
  }
}

function deriveFormat(service, event) {
  return (
    event["@websocket.format"] ||
    event["@ws.format"] ||
    service.definition["@websocket.format"] ||
    service.definition["@ws.format"] ||
    "json"
  );
}

function deriveKey(entity, data) {
  return Object.keys(entity.keys).reduce((result, key) => {
    result[key] = data[key];
    return result;
  }, {});
}

function deriveElements(event, data) {
  return Object.keys(event.elements).reduce((result, element) => {
    result[element] = data[element];
    return result;
  }, {});
}

function deriveUser(event, data, headers, req) {
  const currentUser = deriveCurrentUser(event, data, headers, req);
  const providedUser = deriveDefinedUser(event, data, headers, req);
  return combineEntries(currentUser, providedUser);
}

function deriveCurrentUser(event, data, headers, req) {
  const include = combineValues(
    deriveValues(event, data, headers, {
      headerNames: ["wsCurrentUser", "currentUser"],
      annotationNames: [
        "@websocket.currentUser",
        "@ws.currentUser",
        "@websocket.broadcast.currentUser",
        "@ws.broadcast.currentUser",
      ],
      resultValue: req.context.user?.id,
    }),
    deriveValues(event, data, headers, {
      annotationNames: ["@websocket.user", "@ws.user", "@websocket.broadcast.user", "@ws.broadcast.user"],
      annotationCompareValue: "includeCurrent",
      resultValue: req.context.user?.id,
    }),
    deriveValues(event, data, headers, {
      headerNames: ["wsCurrentUser.include", "wsCurrentUserInclude", "currentUser.include", "currentUserInclude"],
      annotationNames: [
        "@websocket.currentUser.include",
        "@ws.currentUser.include",
        "@websocket.broadcast.currentUser.include",
        "@ws.broadcast.currentUser.include",
      ],
      annotationCompareValue: true,
      resultValue: req.context.user?.id,
    }),
  );
  const exclude = combineValues(
    deriveValues(event, data, headers, {
      annotationNames: ["@websocket.user", "@ws.user", "@websocket.broadcast.user", "@ws.broadcast.user"],
      annotationCompareValue: "excludeCurrent",
      resultValue: req.context.user?.id,
    }),
    deriveValues(event, data, headers, {
      headerNames: ["wsCurrentUser.exclude", "wsCurrentUserExclude", "currentUser.exclude", "currentUserExclude"],
      annotationNames: [
        "@websocket.currentUser.exclude",
        "@ws.currentUser.exclude",
        "@websocket.broadcast.currentUser.exclude",
        "@ws.broadcast.currentUser.exclude",
      ],
      annotationCompareValue: true,
      resultValue: req.context.user?.id,
    }),
  );
  if (include || exclude) {
    return { include, exclude };
  }
}

function deriveDefinedUser(event, data, headers) {
  const include = combineValues(
    deriveValues(event, data, headers, {
      headerNames: ["wsUsers", "wsUser", "users", "user"],
      annotationNames: ["@websocket.user", "@ws.user", "@websocket.broadcast.user", "@ws.broadcast.user"],
      annotationExcludeValues: ["includeCurrent", "excludeCurrent"],
    }),
    deriveValues(event, data, headers, {
      headerNames: ["wsUser.include", "wsUserInclude", "user.include", "userInclude"],
      annotationNames: [
        "@websocket.user.include",
        "@ws.user.include",
        "@websocket.broadcast.user.include",
        "@ws.broadcast.user.include",
      ],
    }),
  );
  const exclude = deriveValues(event, data, headers, {
    headerNames: ["wsUser.exclude", "wsUserExclude", "user.exclude", "userExclude"],
    annotationNames: [
      "@websocket.user.exclude",
      "@ws.user.exclude",
      "@websocket.broadcast.user.exclude",
      "@ws.broadcast.user.exclude",
    ],
  });
  if (include || exclude) {
    return { include, exclude };
  }
}

function deriveContext(event, data, headers) {
  const include = combineValues(
    deriveValues(event, data, headers, {
      headerNames: ["wsContexts", "wsContext", "contexts", "context"],
      annotationNames: ["@websocket.context", "@ws.context", "@websocket.broadcast.context", "@ws.broadcast.context"],
    }),
    deriveValues(event, data, headers, {
      headerNames: ["wsContext.include", "wsContextInclude", "context.include", "contextInclude"],
      annotationNames: [
        "@websocket.context.include",
        "@ws.context.include",
        "@websocket.broadcast.context.include",
        "@ws.broadcast.context.include",
      ],
    }),
  );
  const exclude = deriveValues(event, data, headers, {
    headerNames: ["wsContext.exclude", "wsContextExclude", "context.exclude", "contextExclude"],
    annotationNames: [
      "@websocket.context.exclude",
      "@ws.context.exclude",
      "@websocket.broadcast.context.exclude",
      "@ws.broadcast.context.exclude",
    ],
  });
  if (include || exclude) {
    return { include, exclude };
  }
}

function deriveIdentifier(event, data, headers) {
  const include = combineValues(
    deriveValues(event, data, headers, {
      headerNames: ["wsIdentifiers", "wsIdentifier", "identifiers", "identifier"],
      annotationNames: [
        "@websocket.identifier",
        "@ws.identifier",
        "@websocket.broadcast.identifier",
        "@ws.broadcast.identifier",
      ],
    }),
    deriveValues(event, data, headers, {
      headerNames: ["wsIdentifier.include", "wsIdentifierInclude", "identifier.include", "identifierInclude"],
      annotationNames: [
        "@websocket.identifier.include",
        "@ws.identifier.include",
        "@websocket.broadcast.identifier.include",
        "@ws.broadcast.identifier.include",
      ],
    }),
  );
  const exclude = deriveValues(event, data, headers, {
    headerNames: ["wsIdentifier.exclude", "wsIdentifierExclude", "identifier.exclude", "identifierExclude"],
    annotationNames: [
      "@websocket.identifier.exclude",
      "@ws.identifier.exclude",
      "@websocket.broadcast.identifier.exclude",
      "@ws.broadcast.identifier.exclude",
    ],
  });
  if (include || exclude) {
    return { include, exclude };
  }
}

function deriveValues(
  event,
  data,
  headers,
  { headerNames, annotationNames, headerCompareValue, annotationCompareValue, resultValue, annotationExcludeValues },
) {
  let result = undefined;
  if (data) {
    for (const annotationName of annotationNames || []) {
      const annotationValue = event[annotationName];
      if (annotationExcludeValues?.includes(annotationValue)) {
        continue;
      }
      if (annotationCompareValue === undefined ? annotationValue : annotationValue === annotationCompareValue) {
        result = mergeValue(result, resultValue ?? annotationValue);
      }
      if (event.elements) {
        for (const name in event.elements) {
          const element = event.elements[name];
          if (element["@websocket.ignore"] || element["@ws.ignore"]) {
            continue;
          }
          const annotationValue = element[annotationName];
          if (annotationExcludeValues?.includes(annotationValue)) {
            continue;
          }
          if (annotationCompareValue === undefined ? annotationValue : annotationValue === annotationCompareValue) {
            if (resultValue === undefined) {
              result = mergeValue(result, data[name]);
            } else if (data[name]) {
              result = mergeValue(result, resultValue);
            }
          }
        }
      }
    }
  }
  if (headers) {
    for (const headerName of headerNames || []) {
      const headerValue = accessPath(headers, headerName);
      if (headerValue?.constructor === Object) {
        continue;
      }
      if (headerCompareValue === undefined ? headerValue : headerValue === headerCompareValue) {
        result = mergeValue(result, resultValue ?? headerValue);
      }
    }
  }
  return removeArrayDuplicates(result);
}

function combineEntries(entryA, entryB) {
  let include = combineValues(entryA?.include, entryB?.include);
  let exclude = combineValues(entryA?.exclude, entryB?.exclude);
  if (include || exclude) {
    return { include, exclude };
  }
}

function combineValues(...values) {
  let result = undefined;
  for (const entry of values) {
    if (entry !== undefined) {
      result ??= [];
      result = result.concat(entry);
    }
  }
  return removeArrayDuplicates(result);
}

function accessPath(object, path) {
  const properties = path.split(".");
  for (let i = 0; i < properties.length; i++) {
    if (!object) {
      return null;
    }
    object = object[properties[i]];
  }
  return object;
}

function mergeValue(result, value) {
  if (value === undefined || value === null) {
    return result;
  }
  result ??= [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      result.push(stringValue(entry));
    }
  } else if (!(value instanceof Object)) {
    result.push(stringValue(value));
  }
  return result;
}

function removeArrayDuplicates(array) {
  if (!Array.isArray(array)) {
    return array;
  }
  return [...new Set(array)];
}

function stringValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  } else if (value instanceof Object) {
    return JSON.stringify(value);
  }
  return String(value);
}

function parseStringValue(value) {
  if (value === undefined || value === null || typeof value !== "string") {
    return value;
  }
  if (["false", "true"].includes(value)) {
    return value === "true";
  }
  if (!isNaN(value)) {
    return parseFloat(value);
  }
  return value;
}

function deriveHeaders(headers, format) {
  for (const header in headers ?? {}) {
    let xHeader = header.toLocaleLowerCase();
    if (!xHeader.startsWith("x-websocket-") && !xHeader.startsWith("x-ws-")) {
      continue;
    }
    if (header.toLocaleLowerCase().startsWith("x-websocket-")) {
      xHeader = xHeader.substring("x-websocket-".length);
    } else if (xHeader.startsWith("x-ws-")) {
      xHeader = xHeader.substring("x-ws-".length);
    }
    let formatSpecific = false;
    if (xHeader.startsWith(`${format}-`)) {
      xHeader = xHeader.substring(`${format}-`.length);
      formatSpecific = true;
    }
    const value = parseStringValue(headers[header]);
    delete headers[header];
    if (formatSpecific) {
      headers.ws ??= {};
      headers.ws[format] ??= {};
      headers.ws[format][xHeader] = value;
      headers.ws[format][toCamelCase(xHeader)] = value;
    } else {
      headers[xHeader] = value;
      headers[toCamelCase(xHeader)] = value;
    }
  }
  return headers;
}

function deriveEventHeaders(headers) {
  return headers?.websocket || headers?.ws ? { ...headers?.websocket, ...headers?.ws } : undefined;
}

function derivePath(event, path) {
  return event["@websocket.path"] || event["@ws.path"] || path;
}

function getDeepEntityColumns(entity) {
  const columns = [];
  for (const element of Object.values(entity.elements)) {
    if (element.type === "cds.Composition" && element.target) {
      columns.push({
        ref: [element.name],
        expand: getDeepEntityColumns(element._target),
      });
    } else {
      columns.push({
        ref: [element.name],
      });
    }
  }
  return columns;
}

function serviceLocalName(service, name) {
  const servicePrefix = `${service.name}.`;
  if (name.startsWith(servicePrefix)) {
    return name.substring(servicePrefix.length);
  }
  return name;
}

function toCamelCase(string) {
  return string.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace("-", "").replace("_", ""));
}

function interableObject(object) {
  return {
    ...object,
    [Symbol.iterator]: function* () {
      for (const event in this) {
        yield this[event];
      }
    },
  };
}

function isServedViaWebsocket(service) {
  if (!service) {
    return false;
  }
  const serviceDefinition = service.definition;
  if (!serviceDefinition) {
    return false;
  }
  let protocols = serviceDefinition["@protocol"];
  if (protocols) {
    protocols = !Array.isArray(protocols) ? [protocols] : protocols;
    return protocols.some((protocol) => {
      return ["websocket", "ws"].includes(typeof protocol === "string" ? protocol : protocol.kind);
    });
  }
  const protocolDirect = Object.keys(cds.env.protocols || {}).find((protocol) => serviceDefinition["@" + protocol]);
  if (protocolDirect) {
    return ["websocket", "ws"].includes(protocolDirect);
  }
  return false;
}

module.exports = collectServicesAndMountAdapter;
