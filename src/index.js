"use strict";

const cds = require("@sap/cds");

const SocketServer = require("./socket/base");

const LOG = cds.log("websocket");

const WebSocketAction = {
  Connect: "wsConnect",
  Disconnect: "wsDisconnect",
  Context: "wsContext",
};

let socketServer;

let services;
let mixinServices = {};
let sockets = {};

const collectServicesAndMountAdapter = (srv, options) => {
  if (!services) {
    services = {};
    cds.on("served", () => {
      options.services = services;
      serveWebSocketServer(options);
    });
  }
  services[srv.name] = srv;
};

function serveWebSocketServer(options) {
  // Wait for server listening (http server is ready)
  cds.on("listening", async (app) => {
    await bootstrapWebSocketServer(app.server, options);
  });
}

async function bootstrapWebSocketServer(server, options) {
  socketServer = await initWebSocketServer(server, options.path);
  if (socketServer) {
    // Websocket services
    for (const serviceName in options.services) {
      const service = options.services[serviceName];
      if (isServedViaWebsocket(service)) {
        serveWebSocketService(socketServer, service, options);
      }
    }
    // Mixin Services (non-ws service events and operations)
    for (const name in cds.model.definitions) {
      const definition = cds.model.definitions[name];
      if (["event", "action", "function"].includes(definition.kind) && websocketEnabled(definition)) {
        const service = cds.services[definition._service?.name];
        if (service && !isServedViaWebsocket(service)) {
          mixinServices[service.name] ??= mixinServices[service.name] || {
            name: service.name,
            definition: service.definition,
            endpoints: service.endpoints.map((endpoint) => {
              const protocol =
                cds.env.protocols[endpoint.kind] || (endpoint.kind === "odata" ? cds.env.protocols["odata-v4"] : null);
              let path = normalizeServicePath(service.path, protocol.path);
              if (!path.startsWith("/")) {
                path = (cds.env.protocols?.websocket?.path || cds.env.protocols?.ws?.path || "/ws") + "/" + path;
              }
              return { kind: "websocket", path };
            }),
            _operations: interableObject(),
            get operations() {
              return this._operations;
            },
            _entities: interableObject(),
            get entities() {
              return this._entities;
            },
            _events: interableObject(),
            get events() {
              return this._events;
            },
            on: service.on.bind(service),
            tx: service.tx.bind(service),
          };
          if (["event"].includes(definition.kind)) {
            mixinServices[service.name]._events[localName(definition)] = definition;
          } else if (["action", "function"].includes(definition.kind)) {
            mixinServices[service.name]._operations[localName(definition)] = definition;
          }
        }
      }
    }
    for (const name in mixinServices) {
      const mixinService = mixinServices[name];
      if (Object.keys(mixinService.events).length > 0 || Object.keys(mixinService.operations).length > 0) {
        serveWebSocketService(socketServer, mixinService, options);
      }
    }
    // Queue / Outbox
    for (const serviceName in options.services) {
      ["queued", "outboxed", "outbox"].forEach((aspect) => {
        if (cds.services[serviceName] && cds.requires[serviceName]?.[aspect]) {
          cds.services[serviceName].options[aspect] = cds.requires[serviceName][aspect];
          cds.services[serviceName] = (cds.queued ?? cds.outboxed)(cds.services[serviceName]);
        }
      });
    }

    LOG?.info("using websocket", {
      kind: cds.env.websocket.kind,
      adapter: socketServer.adapter ? { impl: socketServer.adapterImpl, active: socketServer.adapterActive } : false,
    });
  }
}

function websocketEnabled(definition) {
  return (
    definition["@websocket"] ||
    definition["@ws"] ||
    Object.keys(definition).some((p) => p.startsWith("@websocket.") || p.startsWith("@ws."))
  );
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
        socketServer.service(service, path, async (socket) => {
          sockets[path] = socket;
          try {
            bindServiceDefaults(socket, service);
            bindServiceOperations(socket, service);
            bindServiceMixins(socket, service);
            bindServiceEntities(socket, service);
            await emitConnect(socket, service);
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
  for (const event of service.events) {
    service.on(event, async (req) => {
      try {
        const localEvent = localName(event);
        const format = deriveFormat(service, event);
        const headers = deriveHeaders(req.headers, format);
        const user = deriveUser(event, req.data, headers, req);
        const role = deriveRole(event, req.data, headers, req);
        const context = deriveContext(event, req.data, headers);
        const identifier = deriveIdentifier(event, req.data, headers);
        const eventHeaders = deriveEventHeaders(headers);
        const eventPath = derivePath(service, event, path);
        await socketServer.broadcast({
          tenant: req.tenant,
          service,
          path: eventPath,
          event: localEvent,
          data: req.data,
          headers: eventHeaders,
          filter: { user, role, context, identifier },
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
  socket.on(WebSocketAction.Context, async (data, headers, callback) => {
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
      await processEvent(socket, service, WebSocketAction.Context, data, headers, callback);
    } else {
      callback && (await callback());
    }
  });
}

function bindServiceOperations(socket, service) {
  for (const operation of service.operations) {
    const event = localName(operation);
    if (Object.values(WebSocketAction).includes(event)) {
      continue;
    }
    socket.on(event, async (data, headers, callback) => {
      await processEvent(socket, service, event, data, headers, callback);
    });
  }
}

function bindServiceMixins(socket, service) {
  for (const name in mixinServices) {
    const mixinService = mixinServices[name];
    for (const operation of mixinService.operations) {
      const path = derivePath(mixinService, operation);
      if (path && socket.path === path) {
        const event = localName(operation);
        if (Object.values(WebSocketAction).includes(event)) {
          continue;
        }
        service.wsMixinOperations ??= interableObject();
        service.wsMixinOperations[operation.name] = operation;
        socket.on(event, async (data, headers, callback) => {
          await processEvent(socket, mixinService, event, data, headers, callback);
        });
      }
    }
  }
}

function bindServiceEntities(socket, service) {
  for (const entity of service.entities) {
    const localEntity = localName(entity);
    socket.on(`${localEntity}:create`, async (data, headers, callback) => {
      await processCRUD(socket, service, entity, "create", data, headers, async (response) => {
        callback && (await callback(response));
        await broadcastEvent(socket, service, `${localEntity}:created`, entity, response);
      });
    });
    socket.on(`${localEntity}:read`, async (data, headers, callback) => {
      await processCRUD(socket, service, entity, "read", data, headers, callback);
    });
    socket.on(`${localEntity}:readDeep`, async (data, headers, callback) => {
      await processCRUD(socket, service, entity, "readDeep", data, headers, callback);
    });
    socket.on(`${localEntity}:update`, async (data, headers, callback) => {
      await processCRUD(socket, service, entity, "update", data, headers, async (response) => {
        callback && (await callback(response));
        await broadcastEvent(socket, service, `${localEntity}:updated`, entity, response);
      });
    });
    socket.on(`${localEntity}:delete`, async (data, headers, callback) => {
      await processCRUD(socket, service, entity, "delete", data, headers, async (response) => {
        callback && (await callback(response));
        await broadcastEvent(socket, service, `${localEntity}:deleted`, entity, { ...response, ...data });
      });
    });
    socket.on(`${localEntity}:list`, async (data, headers, callback) => {
      await processCRUD(socket, service, entity, "list", data, headers, callback);
    });
    for (const actionName in entity.actions) {
      const action = entity.actions[actionName];
      socket.on(`${localEntity}:${action.name}`, async (data, headers, callback) => {
        await processCRUD(socket, service, entity, action.name, data, headers, callback);
      });
    }
  }
}

async function emitConnect(socket, service) {
  if (service.operations[WebSocketAction.Connect]) {
    await processEvent(socket, service, WebSocketAction.Connect);
  }
}

async function processEvent(socket, service, event, data, headers, callback) {
  try {
    const response = await callEvent(socket, service, event, data, headers);
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

async function callEvent(socket, service, event, data, headers) {
  data = data || {};
  return await service.tx(socket.context, async (srv) => {
    return await srv.send({
      event,
      data,
      headers,
    });
  });
}

async function processCRUD(socket, service, entity, event, data, headers, callback) {
  try {
    const response = await callCRUD(socket, service, entity, event, data, headers);
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

async function callCRUD(socket, service, entity, event, data, headers) {
  data = data || {};
  return await service.tx(socket.context, async (srv) => {
    const key = deriveKey(entity, data);
    switch (event) {
      case "create":
        return await srv.send({ query: srv.create(entity).entries(data), headers });
      case "read":
        return await srv.send({ query: SELECT.one.from(entity).where(key), headers });
      case "readDeep":
        return await srv.send({
          query: SELECT.one.from(entity).columns(getDeepEntityColumns(entity)).where(key),
          headers,
        });
      case "update":
        return await srv.send({ query: srv.update(entity).set(data).where(key), headers });
      case "delete":
        return await srv.send({ query: srv.delete(entity).where(key), headers });
      case "list":
        return await srv.send({ query: srv.read(entity).where(data), headers });
      default:
        return await srv.send({
          event,
          entity: entity.name,
          data,
          params: [key],
          headers,
        });
    }
  });
}

async function broadcastEvent(socket, service, event, entity, data, headers) {
  let user;
  let role;
  let context;
  let identifier;
  const eventDefinition = service.events[event] || service.events[event.replaceAll(/:/g, ".")];
  if (eventDefinition) {
    user = deriveUser(eventDefinition, data, headers, socket);
    role = deriveRole(eventDefinition, data, headers, socket);
    context = deriveContext(eventDefinition, data, headers);
    identifier = deriveIdentifier(eventDefinition, data, headers);
  }
  const contentData = broadcastData(entity, data, headers, eventDefinition);
  if (contentData) {
    if (entity["@websocket.broadcast.all"] || entity["@ws.broadcast.all"]) {
      await socket.broadcastAll(event, contentData, headers, { user, role, context, identifier });
    } else {
      await socket.broadcast(event, contentData, headers, { user, role, context, identifier });
    }
  }
}

function broadcastData(entity, data, headers, event) {
  if (event) {
    return deriveElements(event, data, headers);
  }
  const content =
    entity["@websocket.broadcast.content"] ||
    entity["@ws.broadcast.content"] ||
    entity["@websocket.broadcast"] ||
    entity["@ws.broadcast"];
  switch (content) {
    case "key":
    default:
      return deriveKey(entity, data, headers);
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

function deriveKey(entity, data, headers) {
  return Object.keys(entity.keys).reduce((result, key) => {
    result[key] = data[key];
    return result;
  }, {});
}

function deriveElements(event, data, headers) {
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

function deriveRole(event, data, headers) {
  const include = combineValues(
    deriveValues(event, data, headers, {
      headerNames: ["wsRoles", "wsRole", "roles", "role"],
      annotationNames: ["@websocket.role", "@ws.role", "@websocket.broadcast.role", "@ws.broadcast.role"],
    }),
    deriveValues(event, data, headers, {
      headerNames: ["wsRole.include", "wsRoleInclude", "role.include", "roleInclude"],
      annotationNames: [
        "@websocket.role.include",
        "@ws.role.include",
        "@websocket.broadcast.role.include",
        "@ws.broadcast.role.include",
      ],
    }),
  );
  const exclude = deriveValues(event, data, headers, {
    headerNames: ["wsRole.exclude", "wsRoleExclude", "role.exclude", "roleExclude"],
    annotationNames: [
      "@websocket.role.exclude",
      "@ws.role.exclude",
      "@websocket.broadcast.role.exclude",
      "@ws.broadcast.role.exclude",
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

function derivePath(service, definition, path) {
  return (
    definition["@websocket.path"] ||
    definition["@ws.path"] ||
    service.definition["@websocket.path"] ||
    service.definition["@ws.path"] ||
    path
  );
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

function localName(definition) {
  return definition.name.startsWith(`${definition._service.name}.`)
    ? definition.name.substring(definition._service.name.length + 1)
    : definition.name;
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
