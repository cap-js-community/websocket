"use strict";

const cds = require("@sap/cds");
const LOG = cds.log("websocket");

const WebSocketAction = {
  Connect: "wsConnect",
  Disconnect: "wsDisconnect",
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
      LOG?.info("using websocket", { kind: cds.env.requires.websocket.kind });
    }
  });
}

async function initWebSocketServer(server, path) {
  try {
    cds.env.requires ??= {};
    cds.env.requires.websocket ??= {};
    cds.env.requires.websocket.kind ??= "ws";
    const socketModule = require(`./socket/${cds.env.requires.websocket.kind}`);
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
        socketServer.service(servicePath, (socket) => {
          try {
            socket.setup();
            bindServiceDefaults(socket, service);
            bindServiceOperations(socket, service);
            bindServiceEntities(socket, service);
            bindServiceEvents(socket, service);
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

async function emitConnect(socket, service) {
  if (service.operations(WebSocketAction.Connect).length) {
    await processEvent(socket, service, undefined, WebSocketAction.Connect);
  }
}

function bindServiceDefaults(socket, service) {
  if (service.operations(WebSocketAction.Disconnect).length) {
    socket.on("disconnect", async (reason) => {
      await processEvent(socket, service, undefined, WebSocketAction.Disconnect, { reason });
    });
  }
}

function bindServiceOperations(socket, service) {
  for (const operation of service.operations()) {
    const event = serviceLocalName(service, operation.name);
    socket.on(event, async (data, callback) => {
      await processEvent(socket, service, undefined, event, data, callback);
    });
  }
}

function bindServiceEntities(socket, service) {
  for (const entity of service.entities()) {
    const localEntityName = serviceLocalName(service, entity.name);
    socket.on(`${localEntityName}:create`, async (data, callback) => {
      await processEvent(socket, service, entity, "create", data, (response) => {
        callback && callback(response);
        socket.broadcast(`${localEntityName}:created`, broadcastData(entity, response));
      });
    });
    socket.on(`${localEntityName}:read`, async (data, callback) => {
      await processEvent(socket, service, entity, "read", data, callback);
    });
    socket.on(`${localEntityName}:readDeep`, async (data, callback) => {
      await processEvent(socket, service, entity, "readDeep", data, callback);
    });
    socket.on(`${localEntityName}:update`, async (data, callback) => {
      await processEvent(socket, service, entity, "update", data, (response) => {
        callback && callback(response);
        socket.broadcast(`${localEntityName}:updated`, broadcastData(entity, response));
      });
    });
    socket.on(`${localEntityName}:delete`, async (data, callback) => {
      await processEvent(socket, service, entity, "delete", data, (response) => {
        callback && callback(response);
        socket.broadcast(`${localEntityName}:deleted`, broadcastData(entity, { ...response, ...data }));
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

function bindServiceEvents(socket, service) {
  for (const event of service.events()) {
    service.on(event, async (req) => {
      const localEventName = serviceLocalName(service, event.name);
      await processEmit(socket, service, localEventName, req.data);
    });
  }
}

async function processEmit(socket, service, event, data) {
  try {
    socket.emit(event, data);
  } catch (err) {
    LOG?.error(err);
  }
}

async function processEvent(socket, service, entity, event, data, callback) {
  try {
    const response = await call(socket, service, entity, event, data);
    callback && callback(response);
  } catch (err) {
    LOG?.error(err);
    try {
      callback &&
        callback({
          error: {
            code: err.code || err.status || err.statusCode,
            message: err.message,
          },
        });
    } catch (err) {
      LOG?.error(err);
    }
  }
}

async function call(socket, service, entity, event, data) {
  data = data || {};
  return await service.tx(socket.context(), async (srv) => {
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

function broadcastData(entity, data) {
  if (entity["@websocket.broadcast"] === "data" || entity["@ws.broadcast"] === "data") {
    return data;
  }
  return deriveKey(entity, data);
}

function deriveKey(entity, data) {
  return Object.keys(entity.keys).reduce((result, key) => {
    result[key] = data[key];
    return result;
  }, {});
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
