"use strict";

const cds = require("@sap/cds");
const WebSocket = require("ws");

const auth = require("./auth");

async function connect(service, options = {}, headers = {}, protoocls) {
  const port = cds.app.server.address().port;
  protoocls ??= [];
  const socket = new WebSocket(`ws://localhost:${port}` + service, protoocls, {
    headers: {
      authorization: options?.authorization ?? auth.alice,
      ...headers,
    },
  });
  if (options.serverSocket !== false) {
    cds.wss.once("connection", async (serverSocket) => {
      socket.serverSocket = serverSocket;
    });
  }
  return new Promise((resolve, reject) => {
    socket.once("open", () => {
      resolve(socket);
    });
    socket.once("error", reject);
  });
}

async function disconnect(socket) {
  cds.ws.close();
  socket.close();
  socket._listeners = [];
}

async function emitEvent(socket, event, data) {
  return new Promise((resolve) => {
    socket.send(
      JSON.stringify({
        event,
        data,
      }),
      (result) => {
        resolve(result || null);
      },
    );
  });
}

async function emitMessage(socket, message) {
  return new Promise((resolve) => {
    socket.send(message, (result) => {
      resolve(result || null);
    });
  });
}

async function waitForEvent(socket, event, cb) {
  _initListeners(socket);
  return new Promise((resolve) => {
    socket._listeners.push((message) => {
      const payload = JSON.parse(message);
      if (payload.event === event) {
        resolve(payload.data);
        cb && cb(payload);
      }
    });
  });
}

async function waitForNoEvent(socket, event, timeout = 100) {
  _initListeners(socket);
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      resolve();
    }, timeout).unref();
    socket._listeners.push((message) => {
      const payload = JSON.parse(message);
      if (payload.event === event) {
        clearTimeout(timeoutId);
        reject(new Error(JSON.stringify(payload.data)));
      }
    });
  });
}

async function waitForMessage(socket, event, cb, parse) {
  _initListeners(socket);
  return new Promise((resolve) => {
    socket._listeners.push((message) => {
      message = message.toString();
      if (message.includes(event)) {
        message = parse ? JSON.parse(message) : message;
        resolve(message);
        cb && cb(message);
      }
    });
  });
}

async function enterContext(socket, context) {
  return await emitEvent(socket, "wsContext", {
    context: !Array.isArray(context) ? context : undefined,
    contexts: Array.isArray(context) ? context : undefined,
  });
}

async function exitContext(socket, context) {
  return await emitEvent(socket, "wsContext", {
    context: !Array.isArray(context) ? context : undefined,
    contexts: Array.isArray(context) ? context : undefined,
    exit: true,
  });
}

async function resetContexts(socket) {
  return await emitEvent(socket, "wsContext", { reset: true });
}

function _initListeners(socket) {
  if (!socket._listeners) {
    socket._listeners ||= [];
    socket.on("message", (message) => {
      for (const listener of socket._listeners) {
        listener(message);
      }
    });
  }
}

module.exports = {
  connect,
  disconnect,
  emitEvent,
  emitMessage,
  waitForEvent,
  waitForNoEvent,
  waitForMessage,
  enterContext,
  exitContext,
  resetContexts,
};
