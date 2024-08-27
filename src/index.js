"use strict";

const cds = require("@sap/cds");
const LOG = cds.log("/websocket");

const SocketServer = require("./socket/base");
const redis = require("./redis");

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
      await redis.closeClients();
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
                return {
                  kind: "websocket",
                  path: cds.env.protocols.websocket.path + normalizeServicePath(service.path, protocol.path),
                };
              }),
              operations: () => {
                return [];
              },
              entities: () => {
                return [];
              },
              events: [],
              on: service.on.bind(service),
              tx: service.tx.bind(service),
            };
            eventServices[service.name].events.push(definition);
          }
        }
      }
      for (const name in eventServices) {
        const eventService = eventServices[name];
        const events = eventService.events;
        if (events.length > 0) {
          eventService.events = () => {
            return events;
          };
          serveWebSocketService(socketServer, eventService, options);
        }
      }
      LOG?.info("using websocket", { kind: cds.env.websocket.kind, adapter: socketServer.adapterActive });
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

function normalizeServicePath(servicePath, protocolPath) {
  if (servicePath.startsWith(protocolPath)) {
    return servicePath.substring(protocolPath.length);
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
        const user = deriveUser(event, req.data, req.headers, req);
        const contexts = deriveContexts(event, req.data, req.headers);
        const identifier = deriveIdentifier(event, req.data, req.headers);
        await socketServer.broadcast({
          service,
          path,
          event: localEventName,
          data: req.data,
          tenant: req.tenant,
          user,
          contexts,
          identifier,
          socket: null,
          remote: true,
        });
      } catch (err) {
        LOG?.error(err);
      }
    });
  }
}

function bindServiceDefaults(socket, service) {
  if (service.operations(WebSocketAction.Disconnect).length) {
    socket.onDisconnect(async (reason) => {
      await processEvent(socket, service, WebSocketAction.Disconnect, { reason });
    });
  }
  socket.on(WebSocketAction.Context, async (data, callback) => {
    if (!data?.exit) {
      await socket.enter(data?.context);
    } else {
      await socket.exit(data?.context);
    }
    if (service.operations(WebSocketAction.Context).length) {
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
  if (service.operations(WebSocketAction.Connect).length) {
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
  let contexts;
  let identifier;
  const events = service.events();
  const eventDefinition = events[event] || events[event.replaceAll(/:/g, ".")];
  if (eventDefinition) {
    user = deriveUser(eventDefinition, data, {}, socket);
    contexts = deriveContexts(eventDefinition, data, {});
    identifier = deriveIdentifier(eventDefinition, data, {});
  }
  const contentData = broadcastData(entity, data, eventDefinition);
  if (contentData) {
    if (entity["@websocket.broadcast.all"] || entity["@ws.broadcast.all"]) {
      await socket.broadcastAll(event, contentData, user, contexts, identifier);
    } else {
      await socket.broadcast(event, contentData, user, contexts, identifier);
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
  let currenUser = { include: undefined, exclude: undefined };
  if (
    headers?.wsCurrentUser?.include !== undefined ||
    headers?.currentUser?.include !== undefined ||
    headers?.wsIncludeCurrentUser ||
    headers?.includeCurrentUser !== undefined
  ) {
    if (
      headers?.wsCurrentUser?.include ||
      headers?.currentUser?.include ||
      headers?.wsIncludeCurrentUser ||
      headers?.includeCurrentUser
    ) {
      currenUser.include = req.context.user?.id;
    }
  } else {
    let user =
      event["@websocket.user"] ||
      event["@ws.user"] ||
      event["@websocket.broadcast.user"] ||
      event["@ws.broadcast.user"];
    if (user === "includeCurrent") {
      currenUser.include = req.context.user?.id;
    }
    let currentUserInclude =
      event["@websocket.currentUser.include"] ||
      event["@ws.currentUser.include"] ||
      event["@websocket.broadcast.currentUser.include"] ||
      event["@ws.broadcast.currentUser.include"];
    if (currentUserInclude) {
      currenUser.include = req.context.user?.id;
    }
    if (event.elements) {
      for (const name in event.elements) {
        const element = event.elements[name];
        user =
          element["@websocket.user"] ||
          element["@ws.user"] ||
          element["@websocket.broadcast.user"] ||
          element["@ws.broadcast.user"];
        if (user === "includeCurrent") {
          if (data[name]) {
            currenUser.include = req.context.user?.id;
            break;
          }
        }
        currentUserInclude =
          element["@websocket.currentUser.include"] ||
          element["@ws.currentUser.include"] ||
          element["@websocket.broadcast.currentUser.include"] ||
          element["@ws.broadcast.currentUser.include"];
        if (currentUserInclude) {
          if (data[name]) {
            currenUser.include = req.context.user?.id;
            break;
          }
        }
      }
    }
  }
  if (
    headers?.wsCurrentUser?.exclude !== undefined ||
    headers?.currentUser?.exclude !== undefined ||
    headers?.wsExcludeCurrentUser ||
    headers?.excludeCurrentUser !== undefined
  ) {
    if (
      headers?.wsCurrentUser?.exclude ||
      headers?.currentUser?.exclude ||
      headers?.wsExcludeCurrentUser ||
      headers?.excludeCurrentUser
    ) {
      currenUser.exclude = req.context.user?.id;
    }
  } else {
    let user =
      event["@websocket.user"] ||
      event["@ws.user"] ||
      event["@websocket.broadcast.user"] ||
      event["@ws.broadcast.user"];
    if (user === "excludeCurrent") {
      currenUser.exclude = req.context.user?.id;
    }
    let currentUserExclude =
      event["@websocket.currentUser.exclude"] ||
      event["@ws.currentUser.exclude"] ||
      event["@websocket.broadcast.currentUser.exclude"] ||
      event["@ws.broadcast.currentUser.exclude"];
    if (currentUserExclude) {
      currenUser.exclude = req.context.user?.id;
    }
    if (event.elements) {
      for (const name in event.elements) {
        const element = event.elements[name];
        user =
          element["@websocket.user"] ||
          element["@ws.user"] ||
          element["@websocket.broadcast.user"] ||
          element["@ws.broadcast.user"];
        if (user === "excludeCurrent") {
          if (data[name]) {
            currenUser.exclude = req.context.user?.id;
            break;
          }
        }
        currentUserExclude =
          element["@websocket.currentUser.exclude"] ||
          element["@ws.currentUser.exclude"] ||
          element["@websocket.broadcast.currentUser.exclude"] ||
          element["@ws.broadcast.currentUser.exclude"];
        if (currentUserExclude) {
          if (data[name]) {
            currenUser.exclude = req.context.user?.id;
            break;
          }
        }
      }
    }
  }
  if (currenUser.include || currenUser.exclude) {
    return currenUser;
  }
}

function deriveContexts(event, data, headers) {
  let contexts = undefined;
  const headerContexts = headers?.wsContexts || headers?.wsContext || headers?.contexts || headers?.context;
  if (headerContexts) {
    contexts ??= [];
    if (Array.isArray(headerContexts)) {
      contexts = contexts.concat(headerContexts);
    } else {
      contexts.push(headerContexts);
    }
  }
  let eventContexts =
    event["@websocket.context"] ||
    event["@ws.context"] ||
    event["@websocket.broadcast.context"] ||
    event["@ws.broadcast.context"];
  if (eventContexts) {
    contexts ??= [];
    if (Array.isArray(eventContexts)) {
      contexts = contexts.concat(eventContexts);
    } else {
      contexts.push(eventContexts);
    }
  }
  if (event.elements) {
    for (const name in event.elements) {
      const element = event.elements[name];
      const context =
        element["@websocket.context"] ||
        element["@ws.context"] ||
        element["@websocket.broadcast.context"] ||
        element["@ws.broadcast.context"];
      if (context) {
        contexts ??= [];
        if (data[name] !== undefined && data[name] !== null) {
          if (Array.isArray(data[name])) {
            data[name].forEach((entry) => {
              contexts.push(stringValue(entry));
            });
          } else {
            contexts.push(stringValue(data[name]));
          }
        }
      }
    }
  }
  return contexts;
}

function deriveIdentifier(event, data, headers) {
  let identifier = { include: undefined, exclude: undefined };
  let headerIdentifierInclude =
    headers?.wsIdentifier?.include ||
    headers?.wsIdentifierInclude ||
    headers?.identifier?.include ||
    headers?.identifierInclude;
  if (headerIdentifierInclude) {
    identifier.include ??= [];
    if (Array.isArray(headerIdentifierInclude)) {
      identifier.include = identifier.include.concat(headerIdentifierInclude);
    } else {
      identifier.include.push(headerIdentifierInclude);
    }
  }
  let eventIdentifierInclude =
    event["@websocket.identifier.include"] ||
    event["@ws.identifier.include"] ||
    event["@websocket.broadcast.identifier.include"] ||
    event["@ws.broadcast.identifier.include"];
  if (eventIdentifierInclude) {
    identifier.include ??= [];
    if (Array.isArray(eventIdentifierInclude)) {
      identifier.include = identifier.include.concat(eventIdentifierInclude);
    } else {
      identifier.include.push(eventIdentifierInclude);
    }
  }
  if (event.elements) {
    for (const name in event.elements) {
      const element = event.elements[name];
      const identifierInclude =
        element["@websocket.identifier.include"] ||
        element["@ws.identifier.include"] ||
        element["@websocket.broadcast.identifier.include"] ||
        element["@ws.broadcast.identifier.include"];
      if (identifierInclude) {
        identifier.include ??= [];
        if (data[name] !== undefined && data[name] !== null) {
          if (Array.isArray(data[name])) {
            data[name].forEach((entry) => {
              identifier.include.push(stringValue(entry));
            });
          } else {
            identifier.include.push(stringValue(data[name]));
          }
        }
      }
    }
  }
  let headerIdentifierExclude =
    headers?.wsIdentifier?.exclude ||
    headers?.wsIdentifierExclude ||
    headers?.identifier?.exclude ||
    headers?.identifierExclude;
  if (headerIdentifierExclude) {
    identifier.exclude ??= [];
    if (Array.isArray(headerIdentifierExclude)) {
      identifier.exclude = identifier.exclude.concat(headerIdentifierExclude);
    } else {
      identifier.exclude.push(headerIdentifierExclude);
    }
  }
  let eventIdentifierExclude =
    event["@websocket.identifier.exclude"] ||
    event["@ws.identifier.exclude"] ||
    event["@websocket.broadcast.identifier.exclude"] ||
    event["@ws.broadcast.identifier.exclude"];
  if (eventIdentifierExclude) {
    identifier.exclude ??= [];
    if (Array.isArray(eventIdentifierExclude)) {
      identifier.exclude = identifier.exclude.concat(eventIdentifierExclude);
    } else {
      identifier.exclude.push(eventIdentifierExclude);
    }
  }
  if (event.elements) {
    for (const name in event.elements) {
      const element = event.elements[name];
      const identifierExclude =
        element["@websocket.identifier.exclude"] ||
        element["@ws.identifier.exclude"] ||
        element["@websocket.broadcast.identifier.exclude"] ||
        element["@ws.broadcast.identifier.exclude"];
      if (identifierExclude) {
        identifier.exclude ??= [];
        if (data[name] !== undefined && data[name] !== null) {
          if (Array.isArray(data[name])) {
            data[name].forEach((entry) => {
              identifier.exclude.push(stringValue(entry));
            });
          } else {
            identifier.exclude.push(stringValue(data[name]));
          }
        }
      }
    }
  }
  if (identifier.include || identifier.exclude) {
    return identifier;
  }
}

function stringValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  } else if (value instanceof Object) {
    return JSON.stringify(value);
  }
  return String(value);
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
