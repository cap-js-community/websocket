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
    cds.env.websocket.kind ??= "ws";
    const serverImpl = cds.env.websocket.impl || cds.env.websocket.kind;
    const socketModule = SocketServer.require(serverImpl, "socket");
    socketServer = new socketModule(server, path);
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
      const servicePath = normalizeServicePath(endpoint.path, options.path);
      try {
        bindServiceEvents(socketServer, servicePath, service);
        socketServer.service(servicePath, (socket) => {
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

function bindServiceEvents(socketServer, servicePath, service) {
  for (const event of service.events()) {
    service.on(event, async (req) => {
      try {
        const localEventName = serviceLocalName(service, event.name);
        const user = deriveUser(event, req.data, req.headers, req);
        const contexts = deriveContexts(event, req.data, req.headers);
        const identifier = deriveIdentifier(event, req.data, req.headers);
        await socketServer.broadcast({
          service: servicePath,
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
      await processEvent(socket, service, undefined, WebSocketAction.Disconnect, { reason });
    });
  }
  socket.on(WebSocketAction.Context, async (data, callback) => {
    if (!data?.exit) {
      await socket.enter(data?.context);
    } else {
      await socket.exit(data?.context);
    }
    if (service.operations(WebSocketAction.Context).length) {
      await processEvent(socket, service, undefined, WebSocketAction.Context, data, callback);
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
      await processEvent(socket, service, undefined, event, data, callback);
    });
  }
}

function bindServiceEntities(socket, service) {
  for (const entity of service.entities()) {
    const localEntityName = serviceLocalName(service, entity.name);
    socket.on(`${localEntityName}:create`, async (data, callback) => {
      await processEvent(socket, service, entity, "create", data, async (response) => {
        callback && (await callback(response));
        await broadcastEvent(socket, service, `${localEntityName}:created`, entity, response);
      });
    });
    socket.on(`${localEntityName}:read`, async (data, callback) => {
      await processEvent(socket, service, entity, "read", data, callback);
    });
    socket.on(`${localEntityName}:readDeep`, async (data, callback) => {
      await processEvent(socket, service, entity, "readDeep", data, callback);
    });
    socket.on(`${localEntityName}:update`, async (data, callback) => {
      await processEvent(socket, service, entity, "update", data, async (response) => {
        callback && (await callback(response));
        await broadcastEvent(socket, service, `${localEntityName}:updated`, entity, response);
      });
    });
    socket.on(`${localEntityName}:delete`, async (data, callback) => {
      await processEvent(socket, service, entity, "delete", data, async (response) => {
        callback && (await callback(response));
        await broadcastEvent(socket, service, `${localEntityName}:deleted`, entity, { ...response, ...data });
      });
    });
    socket.on(`${localEntityName}:list`, async (data, callback) => {
      await processEvent(socket, service, entity, "list", data, callback);
    });
    for (const actionName in entity.actions) {
      const action = entity.actions[actionName];
      socket.on(`${localEntityName}:${action.name}`, async (data, callback) => {
        await processEvent(socket, service, entity, action.name, data, callback);
      });
    }
  }
}

async function emitConnect(socket, service) {
  if (service.operations(WebSocketAction.Connect).length) {
    await processEvent(socket, service, undefined, WebSocketAction.Connect);
  }
}

async function processEvent(socket, service, entity, event, data, callback) {
  try {
    const response = await call(socket, service, entity, event, data);
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

async function call(socket, service, entity, event, data) {
  data = data || {};
  return await service.tx(socket.context, async (srv) => {
    if (!entity) {
      return await srv.send({
        event,
        data,
      });
    }
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
  if ((headers?.wsExcludeCurrentUser || headers?.excludeCurrentUser) !== undefined) {
    if (headers?.wsExcludeCurrentUser || headers?.excludeCurrentUser) {
      return req.context.user.id;
    }
    return;
  }
  let user =
    event["@websocket.user"] || event["@ws.user"] || event["@websocket.broadcast.user"] || event["@ws.broadcast.user"];
  switch (user) {
    case "excludeCurrent":
      return req.context.user.id;
  }
  if (event.elements) {
    for (const name in event.elements) {
      const element = event.elements[name];
      user =
        element["@websocket.user"] ||
        element["@ws.user"] ||
        element["@websocket.broadcast.user"] ||
        element["@ws.broadcast.user"];
      switch (user) {
        case "excludeCurrent":
          return data[name] ? req.context.user.id : undefined;
      }
    }
  }
}

function deriveContexts(event, data, headers) {
  const headerContexts = headers?.wsContexts || headers?.contexts;
  let isContextEvent = !!Array.isArray(headerContexts);
  let contexts = isContextEvent ? headerContexts : [];
  let eventContexts =
    event["@websocket.context"] ||
    event["@ws.context"] ||
    event["@websocket.broadcast.context"] ||
    event["@ws.broadcast.context"];
  if (eventContexts) {
    if (Array.isArray(eventContexts)) {
      contexts = contexts.concat(eventContexts);
      isContextEvent = true;
    } else {
      contexts.push(eventContexts);
      isContextEvent = true;
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
        isContextEvent = true;
        if (data[name] !== undefined && data[name] !== null) {
          if (Array.isArray(data[name])) {
            data[name].forEach((entry) => {
              contexts.push(contextString(entry));
            });
          } else {
            contexts.push(contextString(data[name]));
          }
        }
      }
    }
  }
  return isContextEvent ? contexts : undefined;
}

function deriveIdentifier(event, data, headers) {
  let headerIdentifier = headers?.wsIdentifier || headers?.identifier;
  if (headerIdentifier) {
    return headerIdentifier;
  }
  let eventIdentifier =
    event["@websocket.identifier"] ||
    event["@ws.identifier"] ||
    event["@websocket.broadcast.identifier"] ||
    event["@ws.broadcast.identifier"];
  if (eventIdentifier) {
    return eventIdentifier;
  }
  if (event.elements) {
    for (const name in event.elements) {
      const element = event.elements[name];
      const identifier =
        element["@websocket.identifier"] ||
        element["@ws.identifier"] ||
        element["@websocket.broadcast.identifier"] ||
        element["@ws.broadcast.identifier"];
      if (identifier) {
        return data[name] ? data[name] : undefined;
      }
    }
  }
}

function contextString(value) {
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
